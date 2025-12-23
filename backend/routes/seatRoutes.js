const express = require('express');
const Seat = require('../models/Seat');
const Booking = require('../models/Booking');
const Show = require('../models/Show');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Seed show + 30 seats
router.post('/seed', async (req, res) => {
  try {
    const showId = uuidv4();
    
    // Create show
    await Show.create({ showId, name: 'Movie Show' });
    
    // Delete existing seats for this show (if any)
    await Seat.deleteMany({ showId });
    
    // Create 30 seats
    const seats = Array.from({ length: 30 }, (_, i) => ({
      showId,
      seatId: `A${i + 1}`,
      status: 'AVAILABLE'
    }));
    
    await Seat.insertMany(seats);
    
    res.json({ showId, message: 'Show and 30 seats created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all seats for a show
router.get('/', async (req, res) => {
  try {
    const { showId } = req.query;
    if (!showId) {
      return res.status(400).json({ error: 'showId is required' });
    }
    
    // Clean up expired holds
    const now = new Date();
    await Seat.updateMany(
      { 
        showId, 
        status: 'HELD', 
        holdExpiresAt: { $lt: now } 
      },
      { 
        status: 'AVAILABLE', 
        holdExpiresAt: null, 
        holdId: null, 
        heldBy: null 
      }
    );
    
    const seats = await Seat.find({ showId }).sort({ seatId: 1 });
    
    // Add bookingId to seats that are HELD
    const seatsWithBooking = await Promise.all(seats.map(async (seat) => {
      const seatObj = seat.toObject();
      if (seat.status === 'HELD' && seat.holdId) {
        const booking = await Booking.findOne({ 
          showId, 
          seatId: seat.seatId, 
          status: 'HELD',
          holdId: seat.holdId 
        });
        if (booking) {
          seatObj.bookingId = booking.bookingId;
        }
      } else if (seat.status === 'BOOKED') {
        const booking = await Booking.findOne({ 
          showId, 
          seatId: seat.seatId, 
          status: 'CONFIRMED'
        });
        if (booking) {
          seatObj.bookingId = booking.bookingId;
        }
      }
      return seatObj;
    }));
    
    res.json(seatsWithBooking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single seat snapshot
router.get('/snapshot', async (req, res) => {
  try {
    const { showId, seatId } = req.query;
    if (!showId || !seatId) {
      return res.status(400).json({ error: 'showId and seatId are required' });
    }
    
    const seat = await Seat.findOne({ showId, seatId });
    if (!seat) {
      return res.status(404).json({ error: 'Seat not found' });
    }
    
    res.json({
      seatId: seat.seatId,
      status: seat.status,
      holdExpiresAt: seat.holdExpiresAt,
      bookedBy: seat.bookedBy,
      bookedAt: seat.bookedAt,
      holdId: seat.holdId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Hold seat
router.post('/hold', async (req, res) => {
  try {
    const { showId, seatId, name } = req.body;
    
    if (!showId || !seatId || !name) {
      return res.status(400).json({ error: 'showId, seatId, and name are required' });
    }
    
    const seat = await Seat.findOne({ showId, seatId });
    
    if (!seat) {
      return res.status(404).json({ error: 'Seat not found' });
    }
    
    if (seat.status !== 'AVAILABLE') {
      return res.status(400).json({ error: 'Seat is not available' });
    }
    
    const bookingId = uuidv4();
    const holdId = uuidv4();
    const holdExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
    
    // Update seat
    seat.status = 'HELD';
    seat.heldBy = name;
    seat.holdId = holdId;
    seat.holdExpiresAt = holdExpiresAt;
    await seat.save();
    
    // Create booking
    await Booking.create({
      bookingId,
      showId,
      seatId,
      name,
      status: 'HELD',
      holdExpiresAt,
      holdId
    });
    
    res.json({ 
      bookingId, 
      holdId,
      holdExpiresAt,
      status: 'HELD',
      heldBy: name
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Confirm booking
router.post('/confirm', async (req, res) => {
  try {
    const { bookingId } = req.body;
    
    if (!bookingId) {
      return res.status(400).json({ error: 'bookingId is required' });
    }
    
    const booking = await Booking.findOne({ bookingId });
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    if (booking.status !== 'HELD') {
      return res.status(400).json({ error: 'Booking is not in HELD status' });
    }
    
    // Check if hold expired
    if (booking.holdExpiresAt && new Date() > booking.holdExpiresAt) {
      return res.status(400).json({ error: 'Hold has expired' });
    }
    
    // Update booking
    booking.status = 'CONFIRMED';
    booking.confirmedAt = new Date();
    await booking.save();
    
    // Update seat
    const seat = await Seat.findOne({ showId: booking.showId, seatId: booking.seatId });
    if (seat) {
      seat.status = 'BOOKED';
      seat.bookedBy = booking.name;
      seat.bookedAt = new Date();
      seat.holdId = null;
      seat.heldBy = null;
      seat.holdExpiresAt = null;
      await seat.save();
    }
    
    res.json({ message: 'Booking confirmed successfully', bookingId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel hold
router.post('/cancel', async (req, res) => {
  try {
    const { showId, seatId } = req.body;
    
    if (!showId || !seatId) {
      return res.status(400).json({ error: 'showId and seatId are required' });
    }
    
    const seat = await Seat.findOne({ showId, seatId });
    
    if (!seat) {
      return res.status(404).json({ error: 'Seat not found' });
    }
    
    if (seat.status !== 'HELD') {
      return res.status(400).json({ error: 'Seat is not in HELD status' });
    }
    
    // Find and update booking
    const booking = await Booking.findOne({ 
      showId, 
      seatId, 
      status: 'HELD' 
    });
    
    if (booking) {
      booking.status = 'CANCELLED';
      await booking.save();
    }
    
    // Update seat
    seat.status = 'AVAILABLE';
    seat.heldBy = null;
    seat.holdId = null;
    seat.holdExpiresAt = null;
    await seat.save();
    
    res.json({ message: 'Hold cancelled successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

