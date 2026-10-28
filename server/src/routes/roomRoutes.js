import express from 'express';
import mongoose from 'mongoose';
import Room from '../models/Room.js';
import Booking from '../models/Booking.js';
import { authenticateUser, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Helper to validate ObjectId format
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// GET /api/rooms - List and search rooms with availability filter
router.get('/', async (req, res) => {
  try {
    const {
      category,
      checkIn,
      checkOut,
      guests,
      minPrice,
      maxPrice,
      status
    } = req.query;

    const filter = {};

    // Filter by status (default to available for public visibility)
    if (status) {
      filter.status = status;
    } else {
      filter.status = 'available';
    }

    // Filter by category
    if (category && category !== 'all') {
      filter.category = new RegExp(`^${category.trim()}$`, 'i');
    }

    // Filter by guest count / capacity
    if (guests) {
      const parsedGuests = parseInt(String(guests).replace(/\D+/g, ''), 10);
      if (!isNaN(parsedGuests) && parsedGuests > 0) {
        filter.capacity = { $gte: parsedGuests };
      }
    }

    // Filter by price bounds
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice && !isNaN(Number(minPrice))) {
        filter.price.$gte = Number(minPrice);
      }
      if (maxPrice && !isNaN(Number(maxPrice))) {
        filter.price.$lte = Number(maxPrice);
      }
    }

    // Availability search with date range validation
    if (checkIn && checkOut) {
      const parsedCheckIn = new Date(checkIn);
      const parsedCheckOut = new Date(checkOut);

      if (isNaN(parsedCheckIn.getTime()) || isNaN(parsedCheckOut.getTime())) {
        return res.status(400).json({ error: 'Invalid check-in or check-out date format.' });
      }

      if (parsedCheckIn >= parsedCheckOut) {
        return res.status(400).json({ error: 'Check-out date must be strictly after check-in date.' });
      }

      // Exclude rooms with overlapping active reservations (confirmed or checked-in)
      const overlappingBookings = await Booking.find({
        bookingStatus: { $in: ['confirmed', 'checked-in'] },
        checkIn: { $lt: parsedCheckOut },
        checkOut: { $gt: parsedCheckIn }
      }).select('room');

      const bookedRoomIds = overlappingBookings.map((b) => b.room);
      if (bookedRoomIds.length > 0) {
        filter._id = { $nin: bookedRoomIds };
      }
    }

    const rooms = await Room.find(filter).sort({ price: 1 });
    return res.status(200).json({
      count: rooms.length,
      rooms
    });
  } catch (error) {
    console.error('[Room Search Error]:', error);
    return res.status(500).json({ error: 'Failed to retrieve rooms. Please try again.' });
  }
});

// GET /api/rooms/:id - View single room details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid room identifier format.' });
    }

    const room = await Room.findById(id);
    if (!room) {
      return res.status(404).json({ error: 'Room not found.' });
    }

    return res.status(200).json({ room });
  } catch (error) {
    console.error('[Get Room Error]:', error);
    return res.status(500).json({ error: 'Failed to retrieve room details.' });
  }
});

// POST /api/rooms - Create a new room (Staff & Admin only)
router.post('/', authenticateUser, authorizeRoles('staff', 'admin'), async (req, res) => {
  try {
    const {
      roomNumber,
      title,
      category,
      description,
      price,
      capacity,
      bed,
      size,
      badge,
      amenities,
      image,
      status
    } = req.body;

    // Field validations
    if (!roomNumber || typeof roomNumber !== 'string' || !roomNumber.trim()) {
      return res.status(400).json({ error: 'Room number is required.' });
    }

    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      return res.status(400).json({ error: 'Title is required and must be at least 3 characters.' });
    }

    if (!category || typeof category !== 'string') {
      return res.status(400).json({ error: 'Category is required.' });
    }

    const numPrice = Number(price);
    if (price === undefined || isNaN(numPrice) || numPrice < 0) {
      return res.status(400).json({ error: 'Price per night must be a valid non-negative number.' });
    }

    const numCapacity = Number(capacity);
    if (capacity === undefined || isNaN(numCapacity) || numCapacity < 1) {
      return res.status(400).json({ error: 'Capacity must be at least 1 guest.' });
    }

    if (!image || typeof image !== 'string' || !image.trim()) {
      return res.status(400).json({ error: 'A valid room image URL is required.' });
    }

    // Check duplicate room number
    const normalizedRoomNumber = roomNumber.trim();
    const existing = await Room.findOne({ roomNumber: normalizedRoomNumber });
    if (existing) {
      return res.status(409).json({ error: `Room number "${normalizedRoomNumber}" already exists.` });
    }

    const newRoom = new Room({
      roomNumber: normalizedRoomNumber,
      title: title.trim(),
      category: category.trim(),
      description: description ? description.trim() : '',
      price: numPrice,
      capacity: numCapacity,
      bed: bed ? bed.trim() : '1 King Bed',
      size: size ? size.trim() : '60 m²',
      badge: badge ? badge.trim() : 'Featured',
      amenities: Array.isArray(amenities) ? amenities : [],
      image: image.trim(),
      status: status || 'available'
    });

    await newRoom.save();

    return res.status(201).json({
      message: 'Room created successfully',
      room: newRoom
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    console.error('[Create Room Error]:', error);
    return res.status(500).json({ error: 'Failed to create room.' });
  }
});

// PUT /api/rooms/:id - Update existing room (Staff & Admin only)
router.put('/:id', authenticateUser, authorizeRoles('staff', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid room identifier format.' });
    }

    const room = await Room.findById(id);
    if (!room) {
      return res.status(404).json({ error: 'Room not found.' });
    }

    const {
      roomNumber,
      title,
      category,
      description,
      price,
      capacity,
      bed,
      size,
      badge,
      amenities,
      image,
      status
    } = req.body;

    // Check duplicate room number if changed
    if (roomNumber && roomNumber.trim() !== room.roomNumber) {
      const duplicate = await Room.findOne({
        roomNumber: roomNumber.trim(),
        _id: { $ne: id }
      });
      if (duplicate) {
        return res.status(409).json({ error: `Room number "${roomNumber.trim()}" is already assigned to another room.` });
      }
      room.roomNumber = roomNumber.trim();
    }

    if (price !== undefined) {
      const numPrice = Number(price);
      if (isNaN(numPrice) || numPrice < 0) {
        return res.status(400).json({ error: 'Price must be a non-negative number.' });
      }
      room.price = numPrice;
    }

    if (capacity !== undefined) {
      const numCapacity = Number(capacity);
      if (isNaN(numCapacity) || numCapacity < 1) {
        return res.status(400).json({ error: 'Capacity must be at least 1 guest.' });
      }
      room.capacity = numCapacity;
    }

    if (title) room.title = title.trim();
    if (category) room.category = category.trim();
    if (description !== undefined) room.description = description.trim();
    if (bed) room.bed = bed.trim();
    if (size) room.size = size.trim();
    if (badge) room.badge = badge.trim();
    if (amenities && Array.isArray(amenities)) room.amenities = amenities;
    if (image) room.image = image.trim();
    if (status) room.status = status;

    await room.save();

    return res.status(200).json({
      message: 'Room updated successfully',
      room
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    console.error('[Update Room Error]:', error);
    return res.status(500).json({ error: 'Failed to update room.' });
  }
});

// DELETE /api/rooms/:id - Delete room (Staff & Admin only)
router.delete('/:id', authenticateUser, authorizeRoles('staff', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid room identifier format.' });
    }

    const room = await Room.findByIdAndDelete(id);
    if (!room) {
      return res.status(404).json({ error: 'Room not found.' });
    }

    return res.status(200).json({
      message: `Room "${room.title}" (No. ${room.roomNumber}) has been deleted.`
    });
  } catch (error) {
    console.error('[Delete Room Error]:', error);
    return res.status(500).json({ error: 'Failed to delete room.' });
  }
});

// PATCH /api/rooms/:id/status - Quick room status transition (Staff & Admin only)
router.patch('/:id/status', authenticateUser, authorizeRoles('staff', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid room identifier format.' });
    }

    const validStatuses = ['available', 'occupied', 'cleaning', 'maintenance', 'inactive'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Status must be one of: ${validStatuses.join(', ')}`
      });
    }

    const room = await Room.findByIdAndUpdate(id, { status }, { new: true, runValidators: true });
    if (!room) {
      return res.status(404).json({ error: 'Room not found.' });
    }

    return res.status(200).json({
      message: `Room status updated to '${status}'.`,
      room
    });
  } catch (error) {
    console.error('[Update Room Status Error]:', error);
    return res.status(500).json({ error: 'Failed to update room status.' });
  }
});

export default router;
