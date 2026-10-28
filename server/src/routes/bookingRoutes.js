import express from 'express';
import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import Room from '../models/Room.js';
import { authenticateUser, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// POST /api/bookings - Create a new booking
router.post('/', authenticateUser, async (req, res) => {
  let session = null;
  let useTransaction = false;

  try {
    // Attempt transaction if MongoDB replica set is available
    try {
      session = await mongoose.startSession();
      session.startTransaction();
      useTransaction = true;
    } catch {
      // Standalone MongoDB does not support transactions; proceed with atomic validation
      session = null;
      useTransaction = false;
    }

    const { roomId, checkIn, checkOut, guests, specialRequests } = req.body;

    // Validate Room ID
    if (!roomId || !isValidObjectId(roomId)) {
      if (session) await session.endSession();
      return res.status(400).json({ error: 'Valid room ID is required.' });
    }

    // Validate Dates
    if (!checkIn || !checkOut) {
      if (session) await session.endSession();
      return res.status(400).json({ error: 'Both check-in and check-out dates are required.' });
    }

    const parsedCheckIn = new Date(checkIn);
    const parsedCheckOut = new Date(checkOut);

    if (isNaN(parsedCheckIn.getTime()) || isNaN(parsedCheckOut.getTime())) {
      if (session) await session.endSession();
      return res.status(400).json({ error: 'Invalid date format provided for check-in or check-out.' });
    }

    // Ensure check-in is not in the past (allowing today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkInDateOnly = new Date(parsedCheckIn);
    checkInDateOnly.setHours(0, 0, 0, 0);

    if (checkInDateOnly < today) {
      if (session) await session.endSession();
      return res.status(400).json({ error: 'Check-in date cannot be in the past.' });
    }

    if (parsedCheckIn >= parsedCheckOut) {
      if (session) await session.endSession();
      return res.status(400).json({ error: 'Check-out date must be strictly after check-in date.' });
    }

    const diffTime = parsedCheckOut.getTime() - parsedCheckIn.getTime();
    const nights = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (nights < 1) {
      if (session) await session.endSession();
      return res.status(400).json({ error: 'Reservation must be for at least 1 night.' });
    }

    // Find Room
    const roomQuery = Room.findById(roomId);
    if (session) roomQuery.session(session);
    const room = await roomQuery;

    if (!room) {
      if (session) await session.endSession();
      return res.status(404).json({ error: 'Room not found.' });
    }

    if (room.status !== 'available') {
      if (session) await session.endSession();
      return res.status(400).json({ error: `Room is currently ${room.status} and cannot be reserved.` });
    }

    // In replica set transaction, acquire a transactional write lock on the room document
    // to prevent concurrent write-skew / phantom overlapping bookings
    if (session) {
      await Room.findByIdAndUpdate(roomId, { $inc: { __v: 1 } }, { session });
    }

    // Validate Guest Count against Room Capacity
    const parsedGuests = parseInt(guests, 10);
    if (isNaN(parsedGuests) || parsedGuests < 1) {
      if (session) await session.endSession();
      return res.status(400).json({ error: 'Guest count must be at least 1.' });
    }

    if (parsedGuests > room.capacity) {
      if (session) await session.endSession();
      return res.status(400).json({
        error: `Selected room capacity is ${room.capacity} guest(s). Cannot book for ${parsedGuests} guests.`
      });
    }

    // Calculate prices strictly on server using authoritative room rate
    const nightlyPrice = room.price;
    const totalAmount = nightlyPrice * nights;

    // Check for overlapping active reservations
    const conflictQuery = Booking.findOne({
      room: roomId,
      bookingStatus: { $in: ['confirmed', 'checked-in'] },
      checkIn: { $lt: parsedCheckOut },
      checkOut: { $gt: parsedCheckIn }
    });
    if (session) conflictQuery.session(session);
    const conflict = await conflictQuery;

    if (conflict) {
      if (useTransaction) await session.abortTransaction();
      if (session) await session.endSession();
      return res.status(409).json({
        error: 'This room is already reserved for the selected dates. Please choose different dates or another suite.'
      });
    }

    // Create Booking
    const booking = new Booking({
      user: req.user._id,
      room: roomId,
      checkIn: parsedCheckIn,
      checkOut: parsedCheckOut,
      guests: parsedGuests,
      nights,
      nightlyPrice,
      totalAmount,
      bookingStatus: 'confirmed',
      paymentStatus: 'pending',
      specialRequests: specialRequests ? String(specialRequests).trim() : ''
    });

    if (session) {
      await booking.save({ session });
      await session.commitTransaction();
      await session.endSession();
    } else {
      await booking.save();
    }

    // Populate room info for clean response
    await booking.populate('room', 'title roomNumber category image price bed size');

    return res.status(201).json({
      message: 'Reservation confirmed successfully',
      booking
    });
  } catch (error) {
    if (useTransaction && session) {
      try {
        await session.abortTransaction();
      } catch {}
    }
    if (session) {
      try {
        await session.endSession();
      } catch {}
    }
    console.error('[Create Booking Error]:', error);
    return res.status(500).json({ error: 'Failed to process reservation. Please try again.' });
  }
});

// GET /api/bookings/my-bookings - List current guest's reservations
router.get('/my-bookings', authenticateUser, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate('room', 'title roomNumber category image price bed size')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      count: bookings.length,
      bookings
    });
  } catch (error) {
    console.error('[My Bookings Error]:', error);
    return res.status(500).json({ error: 'Failed to retrieve your reservations.' });
  }
});

// GET /api/bookings/:id - View reservation details
router.get('/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid booking identifier format.' });
    }

    const booking = await Booking.findById(id)
      .populate('room', 'title roomNumber category image price bed size')
      .populate('user', 'name email');

    if (!booking) {
      return res.status(404).json({ error: 'Reservation not found.' });
    }

    // Ownership check: guests can only view their own reservations
    const isOwner = booking.user._id.toString() === req.user._id.toString();
    const isStaffOrAdmin = ['staff', 'admin'].includes(req.user.role);

    if (!isOwner && !isStaffOrAdmin) {
      return res.status(403).json({ error: 'Access denied: You can only view your own reservations.' });
    }

    return res.status(200).json({ booking });
  } catch (error) {
    console.error('[Get Booking Error]:', error);
    return res.status(500).json({ error: 'Failed to retrieve reservation details.' });
  }
});

// PATCH /api/bookings/:id/cancel - Cancel an eligible booking
router.patch('/:id/cancel', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid booking identifier format.' });
    }

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({ error: 'Reservation not found.' });
    }

    // Ownership check
    const isOwner = booking.user.toString() === req.user._id.toString();
    const isStaffOrAdmin = ['staff', 'admin'].includes(req.user.role);

    if (!isOwner && !isStaffOrAdmin) {
      return res.status(403).json({ error: 'Access denied: You can only cancel your own reservations.' });
    }

    // Validation: Only confirmed bookings can be cancelled
    if (booking.bookingStatus !== 'confirmed') {
      return res.status(400).json({
        error: `Cannot cancel a reservation that is currently '${booking.bookingStatus}'. Only confirmed reservations can be cancelled.`
      });
    }

    booking.bookingStatus = 'cancelled';
    await booking.save();

    // Ensure room is available upon cancellation
    await Room.findByIdAndUpdate(booking.room, { status: 'available' });

    await booking.populate('room', 'title roomNumber category image price');

    return res.status(200).json({
      message: 'Reservation cancelled successfully',
      booking
    });
  } catch (error) {
    console.error('[Cancel Booking Error]:', error);
    return res.status(500).json({ error: 'Failed to cancel reservation.' });
  }
});

// GET /api/bookings - View all reservations (Staff & Admin only)
router.get('/', authenticateUser, authorizeRoles('staff', 'admin'), async (req, res) => {
  try {
    const { status, roomId, userId } = req.query;
    const filter = {};

    if (status) filter.bookingStatus = status;
    if (roomId && isValidObjectId(roomId)) filter.room = roomId;
    if (userId && isValidObjectId(userId)) filter.user = userId;

    const bookings = await Booking.find(filter)
      .populate('room', 'title roomNumber category price')
      .populate('user', 'name email')
      .sort({ checkIn: -1 });

    return res.status(200).json({
      count: bookings.length,
      bookings
    });
  } catch (error) {
    console.error('[Staff Bookings List Error]:', error);
    return res.status(500).json({ error: 'Failed to retrieve reservations.' });
  }
});

// PATCH /api/bookings/:id/status - Update reservation status / check-in / check-out (Staff & Admin only)
router.patch('/:id/status', authenticateUser, authorizeRoles('staff', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid booking identifier format.' });
    }

    if (!status) {
      return res.status(400).json({ error: 'Target status is required.' });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ error: 'Reservation not found.' });
    }

    // Validate status transition
    const isValidTransition = Booking.isValidStatusTransition(booking.bookingStatus, status);
    if (!isValidTransition) {
      return res.status(400).json({
        error: `Invalid status transition from '${booking.bookingStatus}' to '${status}'.`
      });
    }

    booking.bookingStatus = status;
    await booking.save();

    // Synchronize room status with booking operation
    if (status === 'checked-in') {
      await Room.findByIdAndUpdate(booking.room, { status: 'occupied' });
    } else if (status === 'checked-out') {
      await Room.findByIdAndUpdate(booking.room, { status: 'cleaning' });
    } else if (status === 'cancelled') {
      await Room.findByIdAndUpdate(booking.room, { status: 'available' });
    }

    await booking.populate('room', 'title roomNumber category price');
    await booking.populate('user', 'name email');

    return res.status(200).json({
      message: `Reservation status updated to '${status}'.`,
      booking
    });
  } catch (error) {
    console.error('[Update Booking Status Error]:', error);
    return res.status(500).json({ error: 'Failed to update reservation status.' });
  }
});

export default router;
