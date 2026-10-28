import express from 'express';
import mongoose from 'mongoose';
import crypto from 'crypto';
import Booking from '../models/Booking.js';
import Payment from '../models/Payment.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * Safely verify HMAC-SHA256 signatures with timing attack protection
 */
const verifyHmacSignature = (payload, signature, secret) => {
  if (!payload || !signature || !secret) return false;
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    const expectedBuf = Buffer.from(expectedSignature, 'utf8');
    const receivedBuf = Buffer.from(signature, 'utf8');

    if (expectedBuf.length !== receivedBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, receivedBuf);
  } catch {
    return false;
  }
};

// GET /api/payments/config
// Returns public gateway configuration for client checkout initialization
router.get('/config', authenticateUser, (req, res) => {
  const keyId = process.env.RAZORPAY_KEY_ID || null;
  const isConfigured = Boolean(keyId && process.env.RAZORPAY_KEY_SECRET);
  const isProduction = process.env.NODE_ENV === 'production';

  return res.status(200).json({
    razorpayKeyId: keyId,
    isConfigured,
    testMode: true,
    currency: 'INR',
    demoAllowed: !isProduction
  });
});

// POST /api/payments/create-order/:bookingId
// Create a trusted Razorpay Order from server-calculated booking amounts
router.post('/create-order/:bookingId', authenticateUser, async (req, res) => {
  try {
    const { bookingId } = req.params;

    if (!isValidObjectId(bookingId)) {
      return res.status(400).json({ error: 'Invalid booking identifier format.' });
    }

    const booking = await Booking.findById(bookingId).populate('room', 'title roomNumber category');
    if (!booking) {
      return res.status(404).json({ error: 'Reservation not found.' });
    }

    // Ownership check
    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied: You can only initiate payment for your own reservations.' });
    }

    // Allow payment only for confirmed or checked-in bookings
    if (!['confirmed', 'checked-in'].includes(booking.bookingStatus)) {
      return res.status(400).json({
        error: `Cannot pay for a reservation with status '${booking.bookingStatus}'.`
      });
    }

    // Idempotency: Prevent duplicate payment if already paid
    if (booking.paymentStatus === 'paid') {
      const existingPayment = await Payment.findOne({ booking: bookingId, status: 'paid' });
      return res.status(409).json({
        error: 'This reservation has already been paid in full.',
        transactionId: existingPayment?.transactionId || existingPayment?.paymentId
      });
    }

    // Calculate payable amount strictly from authoritative server booking record
    // Razorpay requires amounts in paise (1 INR = 100 paise)
    const amountInRupees = booking.totalAmount;
    const amountInPaise = Math.round(amountInRupees * 100);

    if (amountInPaise < 100) {
      return res.status(400).json({ error: 'Payable amount must be at least ₹1.00.' });
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    // Check if credentials are configured
    if (!keyId || !keySecret) {
      if (process.env.NODE_ENV === 'production') {
        return res.status(503).json({
          error: 'Payment gateway configuration is missing on the server. Please contact support.'
        });
      }

      // In local dev without live keys, notify client to use demo flow or configure test keys
      return res.status(200).json({
        mockOrder: true,
        message: 'Razorpay test credentials not configured in server/.env. Demo payment mode is available.',
        bookingId: booking._id,
        amount: amountInPaise,
        currency: 'INR'
      });
    }

    // Generate unique receipt reference
    const receipt = `rcpt_${booking._id.toString().slice(-8)}_${Date.now().toString().slice(-4)}`;

    // Call Razorpay API to create official order
    const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: 'INR',
        receipt,
        notes: {
          bookingId: booking._id.toString(),
          userId: req.user._id.toString(),
          roomTitle: booking.room?.title || 'Hotel Suite'
        }
      })
    });

    const orderData = await response.json();

    if (!response.ok) {
      console.error('[Razorpay Order Creation Failed]:', orderData);
      return res.status(502).json({
        error: orderData.error?.description || 'Failed to initialize payment with Razorpay.'
      });
    }

    // Upsert pending payment record linked to this order
    let payment = await Payment.findOne({ booking: booking._id, status: 'pending' });
    if (!payment) {
      payment = new Payment({
        booking: booking._id,
        user: req.user._id,
        amount: amountInRupees,
        currency: 'INR',
        provider: 'razorpay',
        orderId: orderData.id,
        receipt,
        status: 'pending'
      });
    } else {
      payment.orderId = orderData.id;
      payment.receipt = receipt;
      payment.amount = amountInRupees;
      payment.provider = 'razorpay';
    }
    await payment.save();

    return res.status(200).json({
      orderId: orderData.id,
      amount: orderData.amount, // in paise
      currency: orderData.currency,
      keyId,
      bookingId: booking._id,
      hotelName: 'HotelPro Luxury Resort'
    });
  } catch (err) {
    console.error('[Create Razorpay Order Error]:', err);
    return res.status(500).json({ error: 'Failed to create payment order. Please try again.' });
  }
});

// POST /api/payments/verify
// Verify Razorpay Checkout payment signature and update booking state
router.post('/verify', authenticateUser, async (req, res) => {
  try {
    const { bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!bookingId || !isValidObjectId(bookingId)) {
      return res.status(400).json({ error: 'Valid booking ID is required.' });
    }

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ error: 'Missing payment verification credentials.' });
    }

    const booking = await Booking.findById(bookingId).populate('room', 'title roomNumber');
    if (!booking) {
      return res.status(404).json({ error: 'Reservation not found.' });
    }

    // Ownership check
    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied: You can only verify payments for your own bookings.' });
    }

    // Idempotency check: If already marked paid, return existing success record
    if (booking.paymentStatus === 'paid') {
      const existingPayment = await Payment.findOne({ booking: bookingId, status: 'paid' });
      return res.status(200).json({
        message: 'Payment was already verified and confirmed.',
        payment: existingPayment,
        booking
      });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return res.status(500).json({ error: 'Payment gateway secret is not configured on the server.' });
    }

    // Verify signature: HMAC-SHA256(order_id + '|' + payment_id, secret)
    const payload = `${razorpayOrderId}|${razorpayPaymentId}`;
    const isValid = verifyHmacSignature(payload, razorpaySignature, keySecret);

    if (!isValid) {
      console.warn(`[Payment Verification Failure]: Invalid signature for booking ${bookingId}`);

      // Record failed payment attempt ONLY if not already marked paid
      await Payment.findOneAndUpdate(
        { booking: bookingId, orderId: razorpayOrderId, status: { $ne: 'paid' } },
        { status: 'failed', provider: 'razorpay', paymentId: razorpayPaymentId },
        { upsert: false }
      );

      return res.status(400).json({
        error: 'Invalid payment signature. Verification failed. If your account was debited, contact reservations.'
      });
    }

    // Signature verified successfully -> update Payment and Booking records
    let payment = await Payment.findOne({ booking: bookingId, orderId: razorpayOrderId });
    if (!payment) {
      payment = new Payment({
        booking: booking._id,
        user: req.user._id,
        amount: booking.totalAmount,
        currency: 'INR',
        provider: 'razorpay',
        orderId: razorpayOrderId
      });
    }

    payment.paymentId = razorpayPaymentId;
    payment.transactionId = razorpayPaymentId;
    payment.signature = razorpaySignature;
    payment.status = 'paid';
    payment.paidAt = new Date();

    try {
      await payment.save();
      booking.paymentStatus = 'paid';
      await booking.save();
    } catch (saveErr) {
      if (saveErr.code === 11000) {
        // Handled race condition: another concurrent callback or webhook already marked it paid
        const existingPaid = await Payment.findOne({ booking: bookingId, status: 'paid' });
        return res.status(200).json({
          message: 'Payment verified and reservation confirmed successfully.',
          payment: existingPaid,
          booking
        });
      }
      throw saveErr;
    }

    return res.status(200).json({
      message: 'Payment verified and reservation confirmed successfully.',
      payment: {
        transactionId: payment.transactionId,
        orderId: payment.orderId,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        paidAt: payment.paidAt,
        provider: payment.provider
      },
      booking
    });
  } catch (err) {
    console.error('[Verify Payment Error]:', err);
    return res.status(500).json({ error: 'Failed to verify payment.' });
  }
});

// POST /api/payments/webhook
// Secure Razorpay Webhook endpoint for automated server-to-server confirmation
router.post('/webhook', async (req, res) => {
  try {
    const webhookSignature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.warn('[Webhook Warning]: RAZORPAY_WEBHOOK_SECRET not set; rejecting webhook call.');
      return res.status(503).json({ error: 'Webhook secret unconfigured.' });
    }

    if (!webhookSignature) {
      return res.status(400).json({ error: 'Missing x-razorpay-signature header.' });
    }

    // Verify signature using the exact raw request body buffer
    const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);
    const isValid = verifyHmacSignature(rawBody, webhookSignature, webhookSecret);

    if (!isValid) {
      console.warn('[Webhook Warning]: Invalid webhook signature.');
      return res.status(400).json({ error: 'Invalid webhook signature.' });
    }

    const event = req.body?.event;
    const payload = req.body?.payload;

    // Handle payment.captured or order.paid
    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = payload?.payment?.entity;
      const orderId = paymentEntity?.order_id || payload?.order?.entity?.id;
      const paymentId = paymentEntity?.id;
      const bookingId = paymentEntity?.notes?.bookingId;

      let payment = null;
      if (orderId) {
        payment = await Payment.findOne({ orderId });
      }
      if (!payment && bookingId && isValidObjectId(bookingId)) {
        payment = await Payment.findOne({ booking: bookingId });
      }

      if (payment) {
        // Idempotent update
        if (payment.status !== 'paid') {
          payment.status = 'paid';
          payment.paidAt = new Date();
          if (paymentId) {
            payment.paymentId = paymentId;
            payment.transactionId = paymentId;
          }
          await payment.save();

          await Booking.findByIdAndUpdate(payment.booking, { paymentStatus: 'paid' });
          console.log(`[Webhook]: Payment confirmed for booking ${payment.booking}`);
        }
      }
    } else if (event === 'payment.failed') {
      const paymentEntity = payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      if (orderId) {
        await Payment.findOneAndUpdate(
          { orderId, status: { $ne: 'paid' } },
          { status: 'failed', paymentId: paymentEntity?.id }
        );
      }
    }

    // Always respond 200 OK to acknowledge receipt
    return res.status(200).json({ status: 'ok' });
  } catch (err) {
    console.error('[Webhook Processing Error]:', err);
    return res.status(500).json({ error: 'Webhook handler error.' });
  }
});

// POST /api/payments/demo/:bookingId
// Demo payment — strictly disabled in production
router.post('/demo/:bookingId', authenticateUser, async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Demo payments are disabled in production environment.' });
    }

    const { bookingId } = req.params;

    if (!isValidObjectId(bookingId)) {
      return res.status(400).json({ error: 'Invalid booking identifier format.' });
    }

    const booking = await Booking.findById(bookingId).populate('room', 'title roomNumber');
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    // Ownership check
    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You can only pay for your own bookings.' });
    }

    // Allow payment only for confirmed or checked-in bookings
    if (!['confirmed', 'checked-in'].includes(booking.bookingStatus)) {
      return res.status(400).json({
        error: `Payment is not applicable for a booking with status '${booking.bookingStatus}'.`
      });
    }

    // Prevent duplicate successful payments
    const existingPayment = await Payment.findOne({
      booking: bookingId,
      status: 'paid'
    });
    if (existingPayment) {
      return res.status(409).json({
        error: 'This booking has already been paid.',
        transactionId: existingPayment.transactionId
      });
    }

    // Create demo payment record
    const transactionId = Payment.generateTransactionId();
    const payment = new Payment({
      booking: booking._id,
      user: req.user._id,
      amount: booking.totalAmount,
      currency: 'INR',
      provider: 'demo',
      transactionId,
      status: 'paid',
      paidAt: new Date()
    });
    await payment.save();

    // Update booking payment status
    booking.paymentStatus = 'paid';
    await booking.save();

    return res.status(200).json({
      message: '[DEMO] Payment processed successfully. No real transaction occurred.',
      payment: {
        transactionId: payment.transactionId,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        paidAt: payment.paidAt,
        provider: payment.provider
      }
    });
  } catch (err) {
    console.error('[Demo Payment Error]:', err);
    return res.status(500).json({ error: 'Failed to process demo payment.' });
  }
});

// GET /api/payments/booking/:bookingId
// Get payment info for a specific booking (owner or staff/admin)
router.get('/booking/:bookingId', authenticateUser, async (req, res) => {
  try {
    const { bookingId } = req.params;

    if (!isValidObjectId(bookingId)) {
      return res.status(400).json({ error: 'Invalid booking identifier format.' });
    }

    const booking = await Booking.findById(bookingId).select('user');
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    const isOwner = booking.user.toString() === req.user._id.toString();
    const isStaffOrAdmin = ['staff', 'admin'].includes(req.user.role);
    if (!isOwner && !isStaffOrAdmin) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const payment = await Payment.findOne({ booking: bookingId }).sort({ createdAt: -1 });
    return res.status(200).json({ payment: payment || null });
  } catch (err) {
    console.error('[Get Payment Error]:', err);
    return res.status(500).json({ error: 'Failed to retrieve payment info.' });
  }
});

export default router;
