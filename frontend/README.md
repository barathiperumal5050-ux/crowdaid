# 🚨 CrowdAid — Emergency Crowd Coordination Platform

> Turn bystander panic into organized first response. Before the ambulance arrives.

---

## 📁 Project Structure

```
crowdaid/
├── index.html        ← Landing Page (Hero, How It Works, Stats)
├── otp.html          ← OTP Verification (Fake Alert Prevention)
├── report.html       ← Report Emergency Form (Map + Type + Severity)
├── safety.html       ← Helper Safety Briefing
├── room.html         ← Live Coordination Room (Timer + Tasks + People)
├── dashboard.html    ← Platform Dashboard (Stats + Active Rooms)
├── about.html        ← How It Works + Competitor Comparison
├── css/
│   └── style.css     ← Full stylesheet (all pages)
└── js/
    └── main.js       ← All JavaScript logic (page router + interactions)
```

---

## 🗺️ User Flow

```
Landing (index.html)
    ↓
OTP Verify (otp.html)        ← Fake alert prevention
    ↓
Report Emergency (report.html) ← Type + Severity + Contacts
    ↓
Safety Briefing (safety.html)  ← Helper safety rules + legal
    ↓
Live Room (room.html)          ← Real-time task coordination
    ↓
Dashboard (dashboard.html)     ← Stats + other active rooms
```

---

## ✅ Features Implemented

### 🔐 Fake Alert Prevention
- Phone OTP verification before any report goes live
- 6-box OTP UI with auto-advance and auto-verify
- Community confirmation (2 nearby users must confirm)
- Permanent ban for false reporters

### 📡 Offline SMS Fallback
- SMS Fallback badge shown in live room
- Auto-activates when internet is unavailable
- Notifies nearby helpers and emergency contacts via SMS

### 🛡️ Helper Safety
- Mandatory safety briefing before entering room
- Good Samaritan law notice
- Inactivity monitoring (2 min no movement → check-in)
- Option to coordinate from outside the scene

### 🔒 Privacy Protection
- Zero passive tracking
- Location shared only inside active room
- All data permanently deleted on room close
- No account registration required

### 📲 Emergency Contact Auto-Notify
- Emergency contacts entered during report
- Auto-SMS when emergency room is created
- Live location link sent to family
- "Safe" notification sent when room closes

### ⏱️ Urgency Engine
- Live countdown timer (ambulance ETA)
- Survival rate bar (drops 10% per minute)
- CPR quick guide inside room
- Color-coded urgency on tasks

---

## 🛠️ How to Run

Simply open `index.html` in any browser. No server needed for the frontend prototype.

```bash
# Option 1: Direct open
open index.html

# Option 2: Local server (recommended)
npx serve .
# or
python -m http.server 3000
```

---

## 🚀 Tech Stack for Production

| Layer | Technology |
|-------|------------|
| Frontend | React.js / Next.js |
| Real-time | Socket.io (WebSockets) |
| Backend | Node.js + Express |
| Database | MongoDB + Redis |
| Maps | Google Maps API / Leaflet.js |
| OTP / SMS | Twilio or MSG91 |
| Hosting | Vercel + Railway |

---

## 💡 Unique Innovations vs Existing Apps

| Feature | PulsePoint | GoodSAM | **CrowdAid** |
|---------|-----------|---------|-------------|
| No app download | ✗ | ✗ | ✅ |
| All emergency types | ✗ | ✗ | ✅ |
| Crowd task coordination | ✗ | ✗ | ✅ |
| Offline SMS fallback | ✗ | ✗ | ✅ |
| Fake alert prevention | ✗ | ✗ | ✅ |
| Family auto-notify | ✗ | ✗ | ✅ |
| Zero passive tracking | ✗ | ✗ | ✅ |

---

## 📊 Impact Potential

- Cardiac arrest survival rate: **2X with bystander CPR**
- Avg ambulance ETA: **8 minutes** — CrowdAid fills this gap
- 70% of bystanders freeze — CrowdAid eliminates bystander paralysis
- Scalable globally — no infrastructure cost per user

---

## 🏆 Funding Opportunities

- Health NGOs (WHO, Red Cross)
- City government emergency departments
- Health insurance companies
- Hospital networks
- CSR programs of large corporations

---

*Built with ❤️ to save lives. Every second counts.*
