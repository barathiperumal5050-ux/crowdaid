const router  = require('express').Router();
const jwt     = require('jsonwebtoken');
const Banned  = require('../models/Banned');

// In-memory OTP store (use Redis in production)
const otpStore = new Map();

// ── HELPER: Send SMS via Twilio ──
async function sendSMS(to, body) {
  const twilio = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
  return twilio.messages.create({ body, from: process.env.TWILIO_PHONE, to });
}

// ══════════════════════════════════
// POST /api/auth/send-otp
// ══════════════════════════════════
router.post('/send-otp', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone number required' });

  // Check if phone is banned
  const banned = await Banned.findOne({ phone });
  if (banned) {
    return res.status(403).json({
      error: `This number is banned for submitting ${banned.strikeCount} fake alert(s). Contact support to appeal.`
    });
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Store with 5-minute expiry
  otpStore.set(phone, { otp, expiresAt: Date.now() + 5 * 60 * 1000, attempts: 0 });

  try {
    await sendSMS(phone,
      `🚨 CrowdAid Verification Code: ${otp}\n\nValid for 5 minutes. DO NOT share this code with anyone.\n\nIf you did not request this, ignore this message.`
    );
    console.log(`📲 OTP sent to ${phone}`);
    res.json({ success: true, message: 'OTP sent to your phone' });
 } catch (err) {
    console.error('Twilio error:', err.message);
    console.log(`🔑 DEV OTP for ${phone}: ${otp}`);
    return res.json({ success: true, message: 'OTP sent', devOtp: otp });
  }
});

// ══════════════════════════════════
// POST /api/auth/verify-otp
// ══════════════════════════════════
router.post('/verify-otp', (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP required' });

  const stored = otpStore.get(phone);

  if (!stored) return res.status(400).json({ error: 'OTP not found. Please request a new one.' });
  if (Date.now() > stored.expiresAt) {
    otpStore.delete(phone);
    return res.status(400).json({ error: 'OTP expired. Please request a new one.' });
  }

  // Track wrong attempts
  stored.attempts++;
  if (stored.attempts > 5) {
    otpStore.delete(phone);
    return res.status(400).json({ error: 'Too many wrong attempts. Request a new OTP.' });
  }

  if (stored.otp !== otp.toString()) {
    return res.status(400).json({ error: `Wrong OTP. ${5 - stored.attempts} attempts remaining.` });
  }

  // ✅ OTP correct — delete it
  otpStore.delete(phone);

  // Issue JWT token (valid 2 hours)
  const token = jwt.sign({ phone }, process.env.JWT_SECRET, { expiresIn: '2h' });

  console.log(`✅ Phone verified: ${phone}`);
  res.json({ success: true, token, phone });
});

module.exports = router;
