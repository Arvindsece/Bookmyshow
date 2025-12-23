const mongoose = require('mongoose');

const showSchema = new mongoose.Schema({
  showId: { type: String, required: true, unique: true },
  name: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Show', showSchema);



