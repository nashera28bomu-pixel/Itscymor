# ⚽ Cymor Football Analyzer Bot

> AI-powered WhatsApp football bot for the Kenyan audience — live scores, predictions, odds comparison, and daily picks. All times in **EAT (UTC+3)**.

---

## 🚀 Features

| Feature | Command | Description |
|---|---|---|
| 🔴 Live Scores | `.live` | All live matches right now |
| 📅 Today's Fixtures | `.today` | Today's matches in EAT |
| 📅 Tomorrow | `.tomorrow` | Tomorrow's fixtures |
| 🗓️ Weekend | `.weekend` | Saturday & Sunday games |
| 🔮 AI Prediction | `.predict Arsenal vs Chelsea` | Full AI match analysis |
| 🔥 Daily Picks | `.picks` | Top 3 bets of the day |
| 💰 Odds | `.odds Man City vs Liverpool` | Compare Sportpesa, Betika, Odibets |
| 🔄 Head to Head | `.h2h Real Madrid vs Barca` | H2H history & stats |
| 📈 Team Form | `.form Liverpool` | Last 10 results |
| 🏆 Standings | `.table Premier League` | League table |
| 📰 News | `.news Arsenal` | Latest football news |
| 👑 Owner Tools | `.broadcast`, `.ban`, `.botstats` | Admin controls |

### 🌍 Leagues Covered
- 🏆 **FIFA World Cup** & **WC Qualifiers**
- 🤝 **International Friendlies**
- 🌍 **AFCON** & AFCON Qualifiers
- 🇪🇺 UEFA Nations League | Copa America
- 🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League | 🇪🇸 La Liga | 🇮🇹 Serie A
- 🇩🇪 Bundesliga | 🇫🇷 Ligue 1 | ⭐ Champions League
- 🇺🇸 MLS and more!

---

## 📋 Prerequisites

- **Node.js** v18 or higher
- A **smartphone** with WhatsApp installed
- Free accounts on the APIs below

---

## 🔑 API Keys (All Free Tiers)

### 1. API-Football (Football Data)
1. Go to [rapidapi.com](https://rapidapi.com/api-sports/api/api-football)
2. Sign up for a free account
3. Subscribe to **API-Football** (free tier: 100 calls/day)
4. Copy your **API Key** from the dashboard

### 2. The Odds API (Bookmaker Odds)
1. Go to [the-odds-api.com](https://the-odds-api.com)
2. Sign up for free (500 requests/month)
3. Copy your **API Key** from the dashboard

### 3. Anthropic Claude API (AI Predictions)
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an account (get $5 free credit)
3. Go to **API Keys** and create a new key
4. Copy your key

### 4. MongoDB Atlas (Database)
1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a free cluster (512MB free)
3. Create a database user with a password
4. Get your connection string (looks like: `mongodb+srv://user:pass@cluster.mongodb.net/cymor`)
5. Whitelist all IPs: `0.0.0.0/0` (required for Render)

---

## ⚙️ Local Setup

### Step 1 — Clone / Download
```bash
git clone https://github.com/yourusername/cymor-bot.git
cd cymor-bot
```

### Step 2 — Install Dependencies
```bash
npm install
```

### Step 3 — Configure Environment
```bash
cp .env.example .env
```

Open `.env` and fill in your keys:
```env
OWNER_NUMBER=254113821327
FOOTBALL_API_KEY=your_key_here
FOOTBALL_API_HOST=v3.football.api-sports.io
ODDS_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
MONGODB_URI=mongodb+srv://...
```

### Step 4 — Start the Bot
```bash
npm start
```

### Step 5 — Link WhatsApp (Pairing Code)

When the bot starts, you'll see this in your terminal:

```
╔══════════════════════════════╗
║   🔑  YOUR PAIRING CODE      ║
╠══════════════════════════════╣
║        ABCD-1234             ║
╚══════════════════════════════╝
```

**On your phone:**
1. Open **WhatsApp**
2. Tap the **⋮ Menu** (3 dots) → **Linked Devices**
3. Tap **"Link a Device"**
4. Tap **"Link with phone number instead"**
5. Enter the code shown in your terminal
6. Done! ✅

---

## 🌐 Deploy to Render (Free)

### Step 1 — Push to GitHub
```bash
git init
git add .
git commit -m "Initial Cymor Bot"
git remote add origin https://github.com/yourusername/cymor-bot.git
git push -u origin main
```

### Step 2 — Create Render Service
1. Go to [render.com](https://render.com) and sign up
2. Click **"New"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure:
   - **Name:** `cymor-bot`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free`

### Step 3 — Add Environment Variables
In Render dashboard → **Environment** tab, add all your `.env` variables:
```
OWNER_NUMBER = 254113821327
FOOTBALL_API_KEY = your_key
FOOTBALL_API_HOST = v3.football.api-sports.io
ODDS_API_KEY = your_key
ANTHROPIC_API_KEY = your_key
MONGODB_URI = your_mongodb_uri
RENDER_URL = https://cymor-bot.onrender.com
```

### Step 4 — Deploy
Click **"Create Web Service"** — Render will build and deploy automatically.

### Step 5 — Get Pairing Code from Logs
1. In Render dashboard, click **"Logs"**
2. Wait for the pairing code to appear
3. Link WhatsApp using the steps above

### Step 6 — Keep Alive with UptimeRobot (IMPORTANT!)
Render free tier sleeps after 15 mins of inactivity. Fix this:

1. Go to [uptimerobot.com](https://uptimerobot.com) (free)
2. Click **"Add New Monitor"**
3. Select **"HTTP(s)"**
4. URL: `https://cymor-bot.onrender.com`
5. Monitoring Interval: **5 minutes**
6. Click **"Create Monitor"**

Your bot will now stay online 24/7! ✅

---

## 📱 Usage Examples

```
.menu                          → Show all commands
.live                          → Live scores now
.today                         → Today's fixtures in EAT
.predict Arsenal vs Chelsea    → Full AI match prediction
.predict Kenya vs Uganda       → International match prediction
.odds Man City vs Liverpool    → Compare bookmaker odds
.h2h Real Madrid vs Barcelona  → Head to head history
.form Liverpool                → Team recent form
.table Premier League          → League standings
.table La Liga                 → La Liga standings
.picks                         → Today's best bets (AI curated)
.weekend                       → Weekend fixtures
.ping                          → Check bot status
```

---

## 👑 Owner Commands

These only work for the number set as `OWNER_NUMBER`:

```
.broadcast [message]    → Send message (future: to all users)
.ban [phone]            → Ban a user
.unban [phone]          → Unban a user
.botstats               → View bot statistics
.restart                → Restart the bot
.shutdown               → Turn off the bot
```

---

## 💰 Monthly Cost Breakdown (Zero Budget)

| Service | Plan | Cost |
|---|---|---|
| Render | Free tier | $0 |
| API-Football | Free (100 calls/day) | $0 |
| The Odds API | Free (500 calls/month) | $0 |
| Anthropic Claude | Free credit ($5) | $0 |
| MongoDB Atlas | Free (512MB) | $0 |
| UptimeRobot | Free (50 monitors) | $0 |
| **Total** | | **$0/month** |

> When you grow and need more API calls, API-Football starts at $10/month (10,000 calls/day).

---

## 🔧 Tech Stack

| Layer | Technology |
|---|---|
| WhatsApp Client | [@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys) |
| Runtime | Node.js v18+ (ESM) |
| Football Data | [API-Football](https://www.api-football.com/) |
| Odds | [The Odds API](https://the-odds-api.com/) |
| AI Predictions | [Anthropic Claude](https://www.anthropic.com/) |
| Database | MongoDB Atlas |
| Hosting | Render.com |
| Keep-Alive | UptimeRobot |

---

## 🗂️ Project Structure

```
cymor-bot/
├── src/
│   ├── index.js                 # Main entry point + WhatsApp connection
│   ├── handlers/
│   │   └── commandRouter.js     # Routes commands to handlers
│   ├── commands/
│   │   ├── menu.js              # .menu command
│   │   ├── live.js              # .live scores
│   │   ├── fixtures.js          # .today .tomorrow .weekend
│   │   ├── predict.js           # .predict [team vs team]
│   │   ├── picks.js             # .picks daily bets
│   │   ├── odds.js              # .odds comparison
│   │   ├── h2h.js               # .h2h head to head
│   │   ├── form.js              # .form team form
│   │   ├── table.js             # .table standings
│   │   ├── news.js              # .news
│   │   ├── ping.js              # .ping status
│   │   ├── leagues.js           # .leagues list
│   │   └── owner.js             # Owner-only commands
│   ├── services/
│   │   ├── footballAPI.js       # API-Football wrapper
│   │   ├── oddsAPI.js           # The Odds API wrapper
│   │   └── aiPredictor.js       # Claude AI prediction engine
│   └── utils/
│       ├── time.js              # EAT timezone utilities
│       ├── database.js          # MongoDB connection
│       └── keepAlive.js         # Render keep-alive server
├── .env.example                 # Environment template
├── .gitignore
├── package.json
└── README.md
```

---

## ⚠️ Important Notes

1. **auth_info folder** — Created when you first link WhatsApp. Never delete it or you'll need to re-link. Never push it to GitHub.
2. **API Limits** — Free tier API-Football gives 100 calls/day. Commands are cached for 5 minutes to save calls.
3. **Betting Disclaimer** — Always include responsible gambling reminders. This bot is for informational purposes only.
4. **WhatsApp ToS** — Use responsibly. Avoid sending too many messages too fast to prevent bans.

---

## 🚀 Roadmap (v2.0)

- [ ] Multi-user support with user registration
- [ ] Group chat support
- [ ] Push notifications for match kickoffs
- [ ] Fantasy football integration
- [ ] Kenyan Premier League (KPL) support
- [ ] Voice note predictions
- [ ] Subscription tiers (free/premium)

---

## 📞 Support

Built with ❤️ for the Kenyan football community.

**Owner:** +254113821327

---

> ⚠️ **Disclaimer:** Cymor is for entertainment and informational purposes only. We do not encourage gambling. Bet responsibly. 18+ only.

---

*Powered by Cymor 🤖⚽ | © 2026 All Rights Reserved*
