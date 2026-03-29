const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || '*', methods: ['GET', 'POST'] }
});

// ── MIDDLEWARE ──
app.use(cors({ origin: process.env.CLIENT_URL || '*' }));
app.use(express.json());

// Rate limiting — prevent abuse
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/', limiter);

// OTP rate limit — max 5 OTPs per 15 min
const otpLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5,
  message: { error: 'Too many OTP requests. Try again in 15 minutes.' }
});

// ── MONGODB ──
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

// ── ROUTES ──
app.use('/api/auth',  otpLimiter, require('./routes/auth'));
app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/sms',   require('./routes/sms'));

// Health check
app.get('/health', (req, res) => res.json({ status: 'CrowdAid server running ✅' }));

// ── SOCKET.IO ──
require('./socket/roomHandler')(io);

// ── START ──
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚨 CrowdAid backend running on port ${PORT}`));
