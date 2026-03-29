// ══════════════════════════════════════════
// CROWDAID — SOCKET.IO REAL-TIME HANDLER
// Powers: live rooms, task updates, locations
// ══════════════════════════════════════════

const Room = require('../models/Room');

module.exports = (io) => {

  io.on('connection', (socket) => {
    console.log(`✅ Socket connected: ${socket.id}`);

    // ── USER JOINS A ROOM ──────────────────
    socket.on('join-room', async ({ roomId, user }) => {
      socket.join(roomId);
      socket.roomId = roomId;
      socket.userPhone = user?.phone;

      // Add helper to room in DB
      try {
        await Room.findOneAndUpdate(
          { roomId },
          { $push: { helpers: { ...user, socketId: socket.id, joinedAt: new Date() } } }
        );
      } catch (e) { console.error('join-room DB error:', e.message); }

      // Tell everyone in room a new helper joined
      io.to(roomId).emit('user-joined', { user, socketId: socket.id });
      console.log(`👤 ${user?.name || 'Someone'} joined room ${roomId}`);
    });

    // ── TASK TOGGLED BY A HELPER ───────────
    socket.on('task-update', async ({ roomId, taskId, status, completedBy }) => {
      try {
        await Room.findOneAndUpdate(
          { roomId, 'tasks.id': taskId },
          {
            $set: {
              'tasks.$.status':      status,
              'tasks.$.assignedTo':  completedBy,
              'tasks.$.completedAt': status === 'done' ? new Date() : null
            }
          }
        );
      } catch (e) { console.error('task-update DB error:', e.message); }

      // Broadcast to ALL in room including sender
      io.to(roomId).emit('task-updated', { taskId, status, completedBy });
      console.log(`✅ Task ${taskId} → ${status} by ${completedBy} in room ${roomId}`);
    });

    // ── REAL-TIME LOCATION (NOT STORED) ────
    // Location is only broadcast, never saved to DB
    socket.on('location-update', ({ roomId, userId, coords }) => {
      socket.to(roomId).emit('helper-moved', { userId, coords, socketId: socket.id });
    });

    // ── COMMUNITY CONFIRMATION ─────────────
    socket.on('confirm-emergency', async ({ roomId }) => {
      try {
        const room = await Room.findOneAndUpdate(
          { roomId },
          { $inc: { confirmCount: 1 } },
          { new: true }
        );
        if (room && room.confirmCount >= 2) {
          await Room.findOneAndUpdate({ roomId }, { confirmed: true });
          io.to(roomId).emit('room-confirmed', { roomId });
          console.log(`✅ Room ${roomId} confirmed by community`);
        }
      } catch (e) { console.error('confirm error:', e.message); }
    });

    // ── AMBULANCE ARRIVED — CLOSE ROOM ─────
    socket.on('close-room', async ({ roomId }) => {
      try {
        await Room.findOneAndUpdate(
          { roomId },
          { isActive: false, closedAt: new Date() }
        );
      } catch (e) { console.error('close-room error:', e.message); }

      io.to(roomId).emit('room-closed', { roomId });
      console.log(`🔒 Room ${roomId} closed — data auto-deletes in 1 hour`);
    });

    // ── INACTIVITY CHECK ───────────────────
    // If helper stops moving for 2 min, send alert
    socket.on('heartbeat', ({ roomId, userId }) => {
      socket.lastHeartbeat = Date.now();
    });

    // ── DISCONNECT ─────────────────────────
    socket.on('disconnect', async () => {
      console.log(`❌ Socket disconnected: ${socket.id}`);
      if (socket.roomId) {
        try {
          await Room.findOneAndUpdate(
            { roomId: socket.roomId },
            { $pull: { helpers: { socketId: socket.id } } }
          );
        } catch (e) {}
        io.to(socket.roomId).emit('user-left', { socketId: socket.id });
      }
    });
  });

  // Inactivity monitor — check every 30s
  setInterval(async () => {
    const sockets = await io.fetchSockets();
    for (const s of sockets) {
      if (s.roomId && s.lastHeartbeat) {
        const inactive = Date.now() - s.lastHeartbeat;
        if (inactive > 2 * 60 * 1000) {  // 2 minutes
          s.emit('inactivity-check', { message: 'Are you still okay? Tap to confirm.' });
        }
      }
    }
  }, 30 * 1000);
};
