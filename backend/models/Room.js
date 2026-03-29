const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  id:          { type: String, required: true },
  title:       { type: String, required: true },
  status:      { type: String, enum: ['open', 'done'], default: 'open' },
  assignedTo:  { type: String, default: null },
  completedAt: { type: Date, default: null }
});

const HelperSchema = new mongoose.Schema({
  phone:    String,
  name:     String,
  skill:    String,
  socketId: String,
  joinedAt: { type: Date, default: Date.now }
});

const RoomSchema = new mongoose.Schema({
  roomId:   { type: String, unique: true, required: true },
  type:     { type: String, required: true },
  severity: { type: String, enum: ['low', 'medium', 'high'], default: 'high' },
  description: String,

  location: {
    type:        { type: String, default: 'Point' },
    coordinates: [Number],   // [longitude, latitude]
    address:     String
  },

  reportedBy:     String,   // verified phone
  emergencyContacts: [String],

  helpers:      [HelperSchema],
  tasks:        [TaskSchema],

  // Fake alert prevention
  confirmed:    { type: Boolean, default: false },
  confirmCount: { type: Number,  default: 0 },

  isActive:  { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  closedAt:  { type: Date, default: null }
});

// Geospatial index for finding nearby rooms


// Auto-delete room data 1 hour after closing (privacy)
RoomSchema.index({ closedAt: 1 }, { expireAfterSeconds: 3600 });

module.exports = mongoose.model('Room', RoomSchema);
