const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  bookingId: { type: String, required: true, unique: true },
  showId: { type: String, required: true },
  seatId: { type: String, required: true },
  name: { type: String, required: true },
  status: { type: String, enum: ['HELD', 'CONFIRMED', 'CANCELLED'], default: 'HELD' },
  holdExpiresAt: Date,
  holdId: String,
  createdAt: { type: Date, default: Date.now },
  confirmedAt: Date
});

module.exports = mongoose.model('Booking', bookingSchema);