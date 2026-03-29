const router  = require('express').Router();
const Room    = require('../models/Room');
const Banned  = require('../models/Banned');
const auth    = require('../middleware/auth');
const smsService = require('../services/sms');
const { v4: uuidv4 } = require('crypto').randomUUID ? require('crypto') : { v4: () => Math.random().toString(36).slice(2) };

// Default tasks for every emergency room
const DEFAULT_TASKS = [
  { id: 't1', title: 'Call 112 / Emergency Services', status: 'open' },
  { id: 't2', title: 'Start CPR on victim',           status: 'open' },
  { id: 't3', title: 'Find AED Defibrillator nearby', status: 'open' },
  { id: 't4', title: 'Clear crowd — create space',    status: 'open' },
  { id: 't5', title: 'Guide ambulance to location',   status: 'open' },
  { id: 't6', title: 'Stay with victim — monitor',    status: 'open' }
];

function generateRoomId() {
  return 'CR-' + Math.random().toString(36).toUpperCase().slice(2, 6);
}

// ══════════════════════════════════
// POST /api/rooms/create
// ══════════════════════════════════
router.post('/create', auth, async (req, res) => {
  const { type, severity, description, location, emergencyContacts } = req.body;
  const phone = req.user.phone;

  if (!type || !location) return res.status(400).json({ error: 'Type and location required' });

  try {
    const roomId = generateRoomId();

    const room = new Room({
      roomId,
      type,
      severity:  severity || 'high',
      description,
      location: {
        type:        'Point',
        coordinates: [location.lng, location.lat],
        address:     location.address || 'Unknown location'
      },
      reportedBy:        phone,
      emergencyContacts: emergencyContacts || [],
      tasks: DEFAULT_TASKS.map(t => ({ ...t }))
    });

    await room.save();

    // Auto-notify emergency contacts
    if (emergencyContacts && emergencyContacts.length > 0) {
      await smsService.notifyEmergencyContacts(
        emergencyContacts, location, roomId, type
      ).catch(e => console.error('SMS notify error:', e.message));
    }

    console.log(`🚨 Room created: ${roomId} for ${type} at ${location.address}`);
    res.json({ success: true, roomId, room });

  } catch (err) {
    console.error('Create room error:', err);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// ══════════════════════════════════
// GET /api/rooms/:roomId
// ══════════════════════════════════
router.get('/:roomId', async (req, res) => {
  const room = await Room.findOne({ roomId: req.params.roomId, isActive: true });
  if (!room) return res.status(404).json({ error: 'Room not found or already closed' });
  res.json({ success: true, room });
});

// ══════════════════════════════════
// GET /api/rooms/nearby?lat=&lng=
// ══════════════════════════════════
router.get('/nearby/list', async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });

  const rooms = await Room.find({
    isActive: true,
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
        $maxDistance: 2000  // 2km radius
      }
    }
  }).limit(10);

  res.json({ success: true, rooms });
});

// ══════════════════════════════════
// POST /api/rooms/:roomId/confirm
// Community confirmation (2 needed)
// ══════════════════════════════════
router.post('/:roomId/confirm', auth, async (req, res) => {
  const room = await Room.findOne({ roomId: req.params.roomId });
  if (!room) return res.status(404).json({ error: 'Room not found' });

  room.confirmCount++;
  if (room.confirmCount >= 2) room.confirmed = true;
  await room.save();

  res.json({ success: true, confirmed: room.confirmed, confirmCount: room.confirmCount });
});

// ══════════════════════════════════
// POST /api/rooms/:roomId/close
// ══════════════════════════════════
router.post('/:roomId/close', auth, async (req, res) => {
  const room = await Room.findOne({ roomId: req.params.roomId });
  if (!room) return res.status(404).json({ error: 'Room not found' });

  room.isActive = false;
  room.closedAt = new Date();
  await room.save();

  // Notify family that emergency is resolved
  if (room.emergencyContacts.length > 0) {
    await smsService.notifySafe(
      room.emergencyContacts, room.type, req.params.roomId
    ).catch(e => console.error('SMS safe error:', e.message));
  }

  console.log(`✅ Room ${req.params.roomId} closed — data will auto-delete in 1 hour`);
  res.json({ success: true, message: 'Room closed. All data will be deleted in 1 hour.' });
});

// ══════════════════════════════════
// POST /api/rooms/:roomId/fake-report
// Reporter submits fake alert complaint
// ══════════════════════════════════
router.post('/:roomId/fake-report', auth, async (req, res) => {
  const room = await Room.findOne({ roomId: req.params.roomId });
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const existing = await Banned.findOne({ phone: room.reportedBy });
  if (existing) {
    existing.strikeCount++;
    await existing.save();
  } else {
    await new Banned({ phone: room.reportedBy }).save();
  }

  res.json({ success: true, message: 'Fake report logged. Reporter flagged.' });
});

module.exports = router;
