const mongoose = require('mongoose');

const seatSchema = new mongoose.Schema({
  showId: { type: String, required: true },
  seatId: { type: String, required: true },
  status: { type: String, default: 'AVAILABLE', enum: ['AVAILABLE', 'HELD', 'BOOKED'] },
  holdExpiresAt: Date,
  bookedBy: String,
  bookedAt: Date,
  holdId: String,
  heldBy: String
});

// Compound index to ensure unique seats per show
seatSchema.index({ showId: 1, seatId: 1 }, { unique: true });

module.exports = mongoose.model('Seat', seatSchema);