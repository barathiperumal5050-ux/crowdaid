# 🚨 CrowdAid — Full Stack Setup Guide
## From Zero to Live in 5 Steps

---

## 📁 What's In This Package

```
crowdaid-backend/
├── index.js              ← Main server (run this)
├── package.json          ← Dependencies list
├── .env.example          ← Copy to .env and fill keys
├── models/
│   ├── Room.js           ← Database schema for rooms
│   └── Banned.js         ← Banned phone numbers
├── routes/
│   ├── auth.js           ← OTP send + verify
│   └── rooms.js          ← Create/get/close rooms
├── socket/
│   └── roomHandler.js    ← Real-time Socket.io logic
├── services/
│   └── sms.js            ← Twilio SMS (OTP + notify)
├── middleware/
│   └── auth.js           ← JWT token verification
└── public_js/
    └── main.js           ← Updated frontend JS (replaces old main.js)
```

---

## ✅ STEP 1 — Install Node.js

Download from: https://nodejs.org (choose LTS version)

Verify:
```bash
node --version   # should say v18 or higher
npm --version    # should say 9 or higher
```

---

## ✅ STEP 2 — Get Your API Keys (Free)

### MongoDB Atlas (Database)
1. Go to https://cloud.mongodb.com
2. Sign up free → Create a project → Create a cluster (Free tier M0)
3. Click "Connect" → "Drivers" → copy the connection string
4. Replace `<password>` with your password
5. Your MONGODB_URI looks like: `mongodb+srv://user:pass@cluster.mongodb.net/crowdaid`

### Twilio (OTP + SMS)
1. Go to https://twilio.com → Sign up free
2. Get Trial Account SID, Auth Token, and a Trial phone number
3. You get free trial credits — enough to test

**India alternative:** Use MSG91 (cheaper, easier for India)
1. Go to https://msg91.com
2. Sign up → Get API key → Replace Twilio code in routes/auth.js

---

## ✅ STEP 3 — Configure Environment

```bash
# In the crowdaid-backend folder:
cp .env.example .env
```

Open `.env` and fill in your values:
```
MONGODB_URI=mongodb+srv://youruser:yourpass@cluster.mongodb.net/crowdaid
JWT_SECRET=any_long_random_string_here_make_it_50_chars
TWILIO_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_TOKEN=your_auth_token
TWILIO_PHONE=+1234567890
CLIENT_URL=http://localhost:5500
PORT=5000
```

---

## ✅ STEP 4 — Install & Run

```bash
# In the crowdaid-backend folder:
npm install

# Start the server
npm run dev    # development (auto-restart)
# OR
npm start      # production
```

You should see:
```
✅ MongoDB connected
🚨 CrowdAid backend running on port 5000
```

---

## ✅ STEP 5 — Connect Your Frontend

1. Copy `public_js/main.js` → replace your old `js/main.js`

2. Add Socket.io to your HTML pages (in `<head>`):
```html
<script src="https://cdn.socket.io/4.6.2/socket.io.min.js"></script>
```

3. Add data-task-id to your task cards in room.html:
```html
<div class="task-card" data-task-id="t1">...</div>
<div class="task-card" data-task-id="t2">...</div>
```

4. Add id to location input in report.html:
```html
<input id="location-inp" class="inp" type="text" readonly/>
```

5. Add id to contact inputs in report.html:
```html
<input id="contact1" class="inp" type="tel" placeholder="Contact 1"/>
<input id="contact2" class="inp" type="tel" placeholder="Contact 2"/>
```

6. Open your frontend with a local server:
```bash
# In your crowdaid frontend folder:
npx serve .
# Opens at http://localhost:5500
```

---

## 🚀 Deploy Live (Free)

### Backend → Railway
1. Go to https://railway.app → Login with GitHub
2. Click "New Project" → "Deploy from GitHub"
3. Push your backend code to GitHub first
4. Add all your .env variables in Railway dashboard
5. Your backend gets a URL like: `https://crowdaid-backend.railway.app`

### Frontend → Vercel
1. Go to https://vercel.com → Login with GitHub
2. Push your frontend HTML files to GitHub
3. Import the repo in Vercel
4. Change `API` and `SOCKET_URL` in main.js to your Railway URL
5. Your site goes live at: `https://crowdaid.vercel.app`

---

## 🔌 API Reference

| Endpoint | Method | What it does |
|----------|--------|--------------|
| `/api/auth/send-otp` | POST | Send OTP to phone |
| `/api/auth/verify-otp` | POST | Verify OTP → get token |
| `/api/rooms/create` | POST | Create emergency room |
| `/api/rooms/:id` | GET | Get room details |
| `/api/rooms/nearby/list?lat=&lng=` | GET | Get nearby active rooms |
| `/api/rooms/:id/close` | POST | Close room (ambulance arrived) |
| `/api/rooms/:id/confirm` | POST | Community confirm emergency |

## ⚡ Socket Events

| Event | Direction | What it does |
|-------|-----------|--------------|
| `join-room` | Client → Server | Join a live room |
| `task-update` | Client → Server | Mark task done/open |
| `location-update` | Client → Server | Share live location |
| `close-room` | Client → Server | Close room |
| `task-updated` | Server → Client | Broadcast task change |
| `user-joined` | Server → Client | Someone new joined |
| `room-closed` | Server → Client | Room is closing |
| `inactivity-check` | Server → Client | Helper inactive check |

---

## ❓ Troubleshooting

**"Cannot connect to MongoDB"**
→ Check your MONGODB_URI in .env, make sure IP is whitelisted in Atlas (use 0.0.0.0/0 for dev)

**"OTP not sending"**
→ Check Twilio credentials. In DEV mode, OTP prints in server console automatically.

**"Socket not connecting"**
→ Make sure Socket.io CDN is added to your HTML pages

**CORS error**
→ Set CLIENT_URL in .env to match exactly where your frontend runs

---

*Built with ❤️ by CrowdAid. Every second counts.*
