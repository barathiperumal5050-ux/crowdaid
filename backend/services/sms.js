// ══════════════════════════════════════════
// CROWDAID — SMS SERVICE (Twilio)
// Handles: OTP, Family notify, SMS fallback
// ══════════════════════════════════════════

function getClient() {
  if (!process.env.TWILIO_SID || !process.env.TWILIO_TOKEN) {
    console.warn('⚠️  Twilio not configured — SMS disabled');
    return null;
  }
  return require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
}

async function send(to, body) {
  const client = getClient();
  if (!client) return { skipped: true };
  return client.messages.create({ body, from: process.env.TWILIO_PHONE, to });
}

// ── 1. Notify emergency contacts when room opens ──
async function notifyEmergencyContacts(contacts, location, roomId, emergencyType) {
  const mapLink = `https://maps.google.com/?q=${location.lat},${location.lng}`;
  const msg =
    `⚠️ CROWDAID ALERT\n\n` +
    `Your saved contact has reported an emergency:\n` +
    `Type: ${emergencyType}\n` +
    `Location: ${location.address}\n` +
    `Live Map: ${mapLink}\n` +
    `Room ID: ${roomId}\n\n` +
    `Emergency services have been notified.`;

  const results = [];
  for (const phone of contacts) {
    try {
      const r = await send(phone, msg);
      results.push({ phone, sent: true });
      console.log(`📲 Family notified: ${phone}`);
    } catch (e) {
      results.push({ phone, sent: false, error: e.message });
      console.error(`❌ Failed to notify ${phone}:`, e.message);
    }
  }
  return results;
}

// ── 2. SMS fallback for helpers without internet ──
async function sendSMSFallback(nearbyPhones, emergencyType, location, roomId) {
  const msg =
    `🚨 CrowdAid EMERGENCY NEARBY\n\n` +
    `${emergencyType} at ${location.address}\n` +
    `Room: ${roomId}\n\n` +
    `Open crowdaid.app to coordinate OR call 112 now.\n` +
    `Map: https://maps.google.com/?q=${location.lat},${location.lng}`;

  for (const phone of nearbyPhones) {
    try {
      await send(phone, msg);
      console.log(`📡 SMS fallback sent to: ${phone}`);
    } catch (e) {
      console.error(`❌ Fallback SMS failed for ${phone}:`, e.message);
    }
  }
}

// ── 3. Notify family when emergency is resolved ──
async function notifySafe(contacts, emergencyType, roomId) {
  const msg =
    `✅ CrowdAid UPDATE — Room ${roomId}\n\n` +
    `The ${emergencyType} emergency has been resolved.\n` +
    `Ambulance has arrived. Your contact is safe.\n\n` +
    `Thank you for using CrowdAid.`;

  for (const phone of contacts) {
    try {
      await send(phone, msg);
      console.log(`✅ Safe notification sent to: ${phone}`);
    } catch (e) {
      console.error(`❌ Safe SMS failed for ${phone}:`, e.message);
    }
  }
}

module.exports = { notifyEmergencyContacts, sendSMSFallback, notifySafe };
