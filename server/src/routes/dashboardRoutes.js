import express from 'express';
import Booking from '../models/Booking.js';
import Room from '../models/Room.js';
import Payment from '../models/Payment.js';
import { authenticateUser, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

const todayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

// GET /api/dashboard/guest - Guest's upcoming stays + history (authenticated)
router.get('/guest', authenticateUser, async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();

    const [upcoming, history] = await Promise.all([
      Booking.find({
        user: userId,
        bookingStatus: { $in: ['confirmed', 'checked-in'] },
        checkOut: { $gte: now }
      })
        .populate('room', 'title roomNumber category image price')
        .sort({ checkIn: 1 })
        .limit(5),

      Booking.find({ user: userId })
        .populate('room', 'title roomNumber category image price')
        .sort({ createdAt: -1 })
        .limit(20)
    ]);

    // Attach payment info to each booking in history
    const bookingIds = history.map((b) => b._id);
    const payments = await Payment.find({ booking: { $in: bookingIds } });
    const paymentMap = {};
    payments.forEach((p) => { paymentMap[p.booking.toString()] = p; });

    const historyWithPayments = history.map((b) => ({
      ...b.toJSON(),
      payment: paymentMap[b._id.toString()] || null
    }));

    return res.status(200).json({ upcoming, history: historyWithPayments });
  } catch (err) {
    console.error('[Guest Dashboard Error]:', err);
    return res.status(500).json({ error: 'Failed to load guest dashboard.' });
  }
});

// GET /api/dashboard/staff - Today's arrivals, departures, checked-in (Staff/Admin)
router.get('/staff', authenticateUser, authorizeRoles('staff', 'admin'), async (req, res) => {
  try {
    const { start, end } = todayRange();

    const [arrivals, departures, checkedIn, cleaningRooms] = await Promise.all([
      Booking.find({
        bookingStatus: 'confirmed',
        checkIn: { $gte: start, $lte: end }
      })
        .populate('room', 'title roomNumber category')
        .populate('user', 'name email'),

      Booking.find({
        bookingStatus: 'checked-in',
        checkOut: { $gte: start, $lte: end }
      })
        .populate('room', 'title roomNumber category')
        .populate('user', 'name email'),

      Booking.find({ bookingStatus: 'checked-in' })
        .populate('room', 'title roomNumber category')
        .populate('user', 'name email')
        .sort({ checkIn: 1 }),

      Room.find({ status: 'cleaning' })
        .select('roomNumber title category status bed')
        .sort({ roomNumber: 1 })
    ]);

    return res.status(200).json({
      arrivals,
      departures,
      checkedIn,
      cleaning: cleaningRooms,
      counts: {
        arrivals: arrivals.length,
        departures: departures.length,
        checkedIn: checkedIn.length,
        cleaning: cleaningRooms.length
      }
    });
  } catch (err) {
    console.error('[Staff Dashboard Error]:', err);
    return res.status(500).json({ error: 'Failed to load staff dashboard.' });
  }
});

// GET /api/dashboard/admin - Full metrics (Admin only)
router.get('/admin', authenticateUser, authorizeRoles('admin'), async (req, res) => {
  try {
    const [
      totalRooms,
      availableRooms,
      occupiedRooms,
      cleaningRooms,
      totalBookings,
      paidBookings,
      recentBookings
    ] = await Promise.all([
      Room.countDocuments(),
      Room.countDocuments({ status: 'available' }),
      Room.countDocuments({ status: 'occupied' }),
      Room.countDocuments({ status: 'cleaning' }),
      Booking.countDocuments({ bookingStatus: { $ne: 'cancelled' } }),
      Booking.find({ paymentStatus: 'paid' }).select('totalAmount'),
      Booking.find()
        .populate('room', 'title roomNumber category')
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .limit(10)
    ]);

    const totalRevenue = paidBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const occupancyPercent = totalRooms > 0
      ? Math.round((occupiedRooms / totalRooms) * 100)
      : 0;

    return res.status(200).json({
      totalRooms,
      availableRooms,
      occupiedRooms,
      cleaningRooms,
      totalBookings,
      totalRevenue,
      occupancyPercent,
      recentBookings
    });
  } catch (err) {
    console.error('[Admin Dashboard Error]:', err);
    return res.status(500).json({ error: 'Failed to load admin dashboard.' });
  }
});

export default router;
