/* ══════════════════════════════════════════
   CROWDAID — FRONTEND JAVASCRIPT
   Connects your UI to the real Node.js backend
   ══════════════════════════════════════════ */

'use strict';

// ── CONFIG — change this to your backend URL when deployed ──
const API = 'http://localhost:7000/api';
const SOCKET_URL = 'http://localhost:7000';

// ── GLOBALS ──
let socket = null;
let authToken = sessionStorage.getItem('ca_token') || null;
let currentRoomId = sessionStorage.getItem('ca_roomId') || null;
let roomTimerInterval = null;
let survivalPct = 70;

// ══════════════════════════════════════════
// TOAST
// ══════════════════════════════════════════
let toastTimer;
function showToast(msg, type = 'success') {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
  clearTimeout(toastTimer);
  t.textContent = msg;
  t.style.borderColor = type === 'error' ? 'rgba(255,32,32,.4)' : 'rgba(0,230,118,.3)';
  t.style.color = type === 'error' ? 'var(--red)' : 'var(--green)';
  t.classList.remove('hidden');
  toastTimer = setTimeout(() => t.classList.add('hidden'), 3200);
}

// ══════════════════════════════════════════
// API HELPER
// ══════════════════════════════════════════
async function apiCall(endpoint, method = 'GET', body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (authToken) opts.headers['Authorization'] = `Bearer ${authToken}`;
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(API + endpoint, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ══════════════════════════════════════════
// GEOLOCATION
// ══════════════════════════════════════════
function getLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Geolocation not supported'));
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      err => reject(new Error('Location access denied. Please allow location.'))
    );
  });
}

async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
    const data = await res.json();
    return data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

// ══════════════════════════════════════════
// SOCKET.IO SETUP
// ══════════════════════════════════════════
function connectSocket(roomId) {
  if (typeof io === 'undefined') {
    console.warn('Socket.io not loaded — add CDN script tag');
    return;
  }
  socket = io(SOCKET_URL);
  const user = { phone: sessionStorage.getItem('ca_phone'), name: 'Helper', skill: 'Bystander' };

  socket.emit('join-room', { roomId, user });

  // ── Another helper joins ──
  socket.on('user-joined', ({ user }) => {
    showToast(`👤 ${user.name || 'Someone'} joined the room`);
    updateHelperCount(1);
  });

  // ── Task updated by another person ──
  socket.on('task-updated', ({ taskId, status, completedBy }) => {
    const card = document.querySelector(`[data-task-id="${taskId}"]`);
    if (!card) return;
    if (status === 'done') {
      card.classList.add('done');
      const tag = card.querySelector('.task-tag');
      const check = card.querySelector('.task-check');
      if (tag)   { tag.className = 'task-tag t-done'; tag.textContent = 'DONE'; }
      if (check) check.textContent = '✓';
      showToast(`✅ Task completed by ${completedBy}`);
    }
  });

  // ── Room confirmed by community ──
  socket.on('room-confirmed', () => {
    showToast('✅ Emergency confirmed by 2 nearby people!');
  });

  // ── Room closed ──
  socket.on('room-closed', () => {
    showToast('🚑 Ambulance arrived — room closing. Stay safe!');
    clearInterval(roomTimerInterval);
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 2000);
  });

  // ── Inactivity check ──
  socket.on('inactivity-check', ({ message }) => {
    if (confirm(`⚠️ CrowdAid: ${message}`)) {
      socket.emit('heartbeat', { roomId, userId: sessionStorage.getItem('ca_phone') });
    }
  });

  // ── Helper left ──
  socket.on('user-left', () => updateHelperCount(-1));

  // Send heartbeat every 30s
  setInterval(() => {
    if (socket && roomId) socket.emit('heartbeat', { roomId });
  }, 30000);

  // Send location every 10s (not stored in DB — privacy safe)
  setInterval(async () => {
    try {
      const coords = await getLocation();
      socket.emit('location-update', { roomId, userId: sessionStorage.getItem('ca_phone'), coords });
    } catch {}
  }, 10000);
}

function updateHelperCount(delta) {
  const el = document.getElementById('helper-count');
  if (el) el.textContent = Math.max(1, parseInt(el.textContent || '1') + delta);
}

// ══════════════════════════════════════════
// OTP PAGE
// ══════════════════════════════════════════
function initOTPPage() {
  const sendBtn   = document.getElementById('send-otp-btn');
  const verifyBtn = document.getElementById('verify-otp-btn');
  const phoneInp  = document.getElementById('phone-inp');
  const otpStep   = document.getElementById('otp-step');
  const boxes     = document.querySelectorAll('.otp-box');
  if (!sendBtn) return;

  // Send OTP → real API call
  sendBtn.addEventListener('click', async () => {
    const phone = phoneInp.value.trim();
    if (phone.length < 8) { showToast('⚠️ Enter a valid phone number', 'error'); return; }

    sendBtn.textContent = 'Sending...';
    sendBtn.disabled = true;

    try {
      const data = await apiCall('/auth/send-otp', 'POST', { phone });
      showToast('📲 OTP sent to ' + phone);
      otpStep.classList.remove('hidden');
      boxes[0].focus();

      // Dev mode — auto-fill OTP
      if (data.devOtp) {
        showToast(`🔑 DEV MODE OTP: ${data.devOtp}`);
        [...boxes].forEach((b, i) => b.value = data.devOtp[i] || '');
      }

      // Resend countdown
      startResendCountdown();

    } catch (err) {
      showToast('❌ ' + err.message, 'error');
      sendBtn.textContent = 'Send OTP →';
      sendBtn.disabled = false;
    }
  });

  // OTP box navigation
  boxes.forEach((box, idx) => {
    box.addEventListener('input', () => {
      box.value = box.value.replace(/\D/g, '');
      if (box.value && idx < boxes.length - 1) boxes[idx + 1].focus();
      if ([...boxes].every(b => b.value.length === 1)) setTimeout(verifyOTP, 300);
    });
    box.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !box.value && idx > 0) boxes[idx - 1].focus();
    });
  });

  if (verifyBtn) verifyBtn.addEventListener('click', verifyOTP);

  async function verifyOTP() {
    const code = [...boxes].map(b => b.value).join('');
    const phone = phoneInp.value.trim();
    if (code.length < 6) { showToast('⚠️ Enter all 6 digits', 'error'); return; }

    try {
      const data = await apiCall('/auth/verify-otp', 'POST', { phone, otp: code });
      authToken = data.token;
      sessionStorage.setItem('ca_token', data.token);
      sessionStorage.setItem('ca_phone', phone);
      showToast('✅ Verified! Redirecting...');
      setTimeout(() => { window.location.href = 'report.html'; }, 800);
    } catch (err) {
      showToast('❌ ' + err.message, 'error');
      boxes.forEach(b => { b.value = ''; b.style.borderColor = 'var(--red)'; });
      boxes[0].focus();
    }
  }

  phoneInp.addEventListener('keydown', e => { if (e.key === 'Enter') sendBtn.click(); });
}

function startResendCountdown() {
  let secs = 30;
  const btn = document.getElementById('resend-btn');
  const sendBtn = document.getElementById('send-otp-btn');
  if (!btn) return;
  btn.disabled = true;
  const iv = setInterval(() => {
    btn.textContent = `Resend in ${--secs}s`;
    if (secs <= 0) {
      clearInterval(iv);
      btn.disabled = false;
      btn.textContent = 'Resend OTP';
      sendBtn.textContent = 'Send OTP →';
      sendBtn.disabled = false;
    }
  }, 1000);
}

// ══════════════════════════════════════════
// REPORT PAGE
// ══════════════════════════════════════════
function initReportPage() {
  // Emergency type
  document.querySelectorAll('.etype').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.etype').forEach(e => e.classList.remove('sel'));
      el.classList.add('sel');
    });
  });

  // Severity
  document.querySelectorAll('.sev').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.sev').forEach(e => e.classList.remove('sel'));
      el.classList.add('sel');
    });
  });

  // Auto-detect location
  autoDetectLocation();

  // Launch button
  const launchBtn = document.getElementById('launch-btn');
  if (launchBtn) launchBtn.addEventListener('click', launchRoom);
}

async function autoDetectLocation() {
  const locInp = document.getElementById('location-inp');
  if (!locInp) return;
  locInp.value = '📍 Detecting your location...';
  try {
    const coords = await getLocation();
    const address = await reverseGeocode(coords.lat, coords.lng);
    locInp.value = address;
    locInp.dataset.lat = coords.lat;
    locInp.dataset.lng = coords.lng;
    showToast('📍 Location detected!');
  } catch (err) {
    locInp.value = '';
    locInp.placeholder = 'Enter location manually';
    showToast('⚠️ ' + err.message, 'error');
  }
}

async function launchRoom() {
  if (!authToken) { showToast('⚠️ Please verify your phone first', 'error'); window.location.href = 'otp.html'; return; }

  const cb   = document.getElementById('confirm-cb');
  const type = document.querySelector('.etype.sel');
  const sev  = document.querySelector('.sev.sel');
  const desc = document.getElementById('desc-inp');
  const locInp = document.getElementById('location-inp');
  const c1   = document.getElementById('contact1')?.value?.trim();
  const c2   = document.getElementById('contact2')?.value?.trim();

  if (!type) { showToast('⚠️ Select emergency type', 'error'); return; }
  if (!sev)  { showToast('⚠️ Select severity level', 'error'); return; }
  if (!cb?.checked) { showToast('⚠️ Please confirm this is a real emergency', 'error'); return; }

  const btn = document.getElementById('launch-btn');
  btn.textContent = '🚀 Creating room...';
  btn.disabled = true;

  const location = {
    lat:     parseFloat(locInp?.dataset?.lat || '0'),
    lng:     parseFloat(locInp?.dataset?.lng || '0'),
    address: locInp?.value || 'Unknown'
  };

  const emergencyContacts = [c1, c2].filter(Boolean);

  try {
    const data = await apiCall('/rooms/create', 'POST', {
      type:       type.querySelector('span:last-child')?.textContent || 'Emergency',
      severity:   sev.textContent.replace(/[^a-z]/gi, '').toLowerCase().trim(),
      description: desc?.value || '',
      location,
      emergencyContacts
    });

    currentRoomId = data.roomId;
    sessionStorage.setItem('ca_roomId', data.roomId);
    showToast('🚨 Live room created! Redirecting...');
    setTimeout(() => { window.location.href = 'safety.html'; }, 900);

  } catch (err) {
    showToast('❌ ' + err.message, 'error');
    btn.textContent = '🚀 Launch Live Coordination Room';
    btn.disabled = false;
  }
}

// ══════════════════════════════════════════
// LIVE ROOM PAGE
// ══════════════════════════════════════════
function initRoomPage() {
  const roomId = sessionStorage.getItem('ca_roomId');
  if (!roomId) { window.location.href = 'dashboard.html'; return; }

  // Load room data
  loadRoomData(roomId);

  // Connect socket
  connectSocket(roomId);

  // Start timer
  startRoomTimer();
  startSurvivalDrop();

  // Task cards
  document.querySelectorAll('.task-card').forEach(card => {
    card.addEventListener('click', () => toggleTask(card, roomId));
  });

  // Close room button
  const closeBtn = document.getElementById('close-room-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', async () => {
      if (!confirm('Confirm ambulance has arrived and close this room?')) return;
      try {
        await apiCall(`/rooms/${roomId}/close`, 'POST');
        if (socket) socket.emit('close-room', { roomId });
        showToast('🚑 Room closed. All data will be deleted.');
        clearInterval(roomTimerInterval);
        setTimeout(() => { window.location.href = 'dashboard.html'; }, 2000);
      } catch (err) {
        showToast('❌ ' + err.message, 'error');
      }
    });
  }
}

async function loadRoomData(roomId) {
  try {
    const data = await apiCall(`/rooms/${roomId}`);
    const room = data.room;
    const el = document.getElementById('room-type-label');
    if (el) el.textContent = '🚨 ' + room.type;
    const hc = document.getElementById('helper-count');
    if (hc) hc.textContent = room.helpers?.length || 1;
    // Update tasks from DB
    room.tasks?.forEach(t => {
      if (t.status === 'done') {
        const card = document.querySelector(`[data-task-id="${t.id}"]`);
        if (card) {
          card.classList.add('done');
          const tag = card.querySelector('.task-tag');
          const check = card.querySelector('.task-check');
          if (tag)   { tag.className = 'task-tag t-done'; tag.textContent = 'DONE'; }
          if (check) check.textContent = '✓';
        }
      }
    });
  } catch {}
}

async function toggleTask(card, roomId) {
  const taskId = card.dataset.taskId;
  if (!taskId) return;
  const newStatus = card.classList.contains('done') ? 'open' : 'done';
  const phone = sessionStorage.getItem('ca_phone') || 'You';

  card.classList.toggle('done');
  const tag   = card.querySelector('.task-tag');
  const check = card.querySelector('.task-check');
  if (card.classList.contains('done')) {
    if (tag)   { tag.className = 'task-tag t-done'; tag.textContent = 'DONE'; }
    if (check) check.textContent = '✓';
  } else {
    if (tag)   { tag.className = 'task-tag t-open'; tag.textContent = 'OPEN'; }
    if (check) check.textContent = '';
  }

  // Tell all others in room via socket
  if (socket) socket.emit('task-update', { roomId, taskId, status: newStatus, completedBy: phone });

  showToast(newStatus === 'done' ? '✅ Task marked complete!' : '↩️ Task reopened');
}

function startRoomTimer() {
  let secs = 300;
  const display = document.getElementById('room-timer');
  if (!display) return;
  roomTimerInterval = setInterval(() => {
    secs = Math.max(0, secs - 1);
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    display.textContent = `${m}:${s}`;
    if (secs < 60)  display.style.color = 'var(--orange)';
    if (secs === 0) clearInterval(roomTimerInterval);
  }, 1000);
}

function startSurvivalDrop() {
  const bar = document.getElementById('surv-bar');
  const pct = document.getElementById('surv-pct');
  if (!bar) return;
  bar.style.width = survivalPct + '%';
  setInterval(() => {
    survivalPct = Math.max(10, survivalPct - 1);
    bar.style.width = survivalPct + '%';
    if (pct) pct.textContent = survivalPct + '% → drops 10% per min';
  }, 6000);
}

// ══════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════
async function initDashboard() {
  document.querySelectorAll('[data-count]').forEach(el => {
    const target = parseInt(el.dataset.count, 10);
    let cur = 0; const step = Math.ceil(target / 60);
    const iv = setInterval(() => {
      cur = Math.min(cur + step, target);
      el.textContent = cur.toLocaleString();
      if (cur >= target) clearInterval(iv);
    }, 25);
  });

  // Load live rooms near user
  try {
    const coords = await getLocation();
    const data = await apiCall(`/rooms/nearby/list?lat=${coords.lat}&lng=${coords.lng}`);
    if (data.rooms?.length > 0) renderLiveRooms(data.rooms);
  } catch {}

  document.querySelectorAll('.room-row').forEach(row => {
    row.addEventListener('click', () => { window.location.href = 'safety.html'; });
  });

  const reportCard = document.getElementById('kpi-report');
  if (reportCard) reportCard.addEventListener('click', () => { window.location.href = 'otp.html'; });
}

function renderLiveRooms(rooms) {
  const list = document.querySelector('.rooms-list');
  if (!list || !rooms.length) return;
  list.innerHTML = rooms.map(r => `
    <div class="room-row" onclick="window.location.href='safety.html';sessionStorage.setItem('ca_roomId','${r.roomId}')">
      <div class="room-blink"></div>
      <div class="room-row-info">
        <div class="room-row-name">🚨 ${r.type} — ${r.location?.address || 'Nearby'}</div>
        <div class="room-row-detail">${r.helpers?.length || 0} helpers • ${r.severity?.toUpperCase()} severity</div>
      </div>
      <div class="room-row-people">${r.helpers?.length || 0} helpers</div>
    </div>
  `).join('');
}

// ══════════════════════════════════════════
// PAGE ROUTER
// ══════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  const page = window.location.pathname.split('/').pop();

  // Back buttons
  document.querySelectorAll('[data-back]').forEach(el => {
    el.addEventListener('click', () => { window.location.href = el.dataset.back; });
  });

  // Safety page buttons
  const enterBtn   = document.getElementById('enter-room-btn');
  const outsideBtn = document.getElementById('stay-outside-btn');
  if (enterBtn)   enterBtn.addEventListener('click',   () => { window.location.href = 'room.html'; });
  if (outsideBtn) outsideBtn.addEventListener('click', () => { window.location.href = 'dashboard.html'; });

  switch (page) {
    case 'otp.html':       initOTPPage();    break;
    case 'report.html':    initReportPage(); break;
    case 'room.html':      initRoomPage();   break;
    case 'dashboard.html': initDashboard();  break;
  }
});
