const mongoose = require('mongoose');

const BannedSchema = new mongoose.Schema({
  phone:     { type: String, unique: true, required: true },
  reason:    { type: String, default: 'Fake emergency report' },
  bannedAt:  { type: Date, default: Date.now },
  strikeCount: { type: Number, default: 1 }
});

module.exports = mongoose.model('Banned', BannedSchema);
