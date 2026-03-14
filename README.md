# CYPHER.EXE — Multiplayer Cyberpunk Vocab FPS

## Structure

```
/
├── server.js          ← Node.js + Socket.io multiplayer server
├── package.json
├── vercel.json        ← Vercel deployment config
└── public/
    └── index.html     ← Full game client
```

## Local Development

```bash
npm install
npm start
# Open http://localhost:3000
```

Or with live reload:
```bash
npm install
npx nodemon server.js
```

## Deploy to Vercel

### Option A — Vercel CLI (recommended)
```bash
npm install -g vercel
vercel login
vercel --prod
```

### Option B — GitHub + Vercel Dashboard
1. Push this folder to a GitHub repo
2. Go to https://vercel.com/new
3. Import the repo
4. Framework: **Other**
5. Root directory: leave as `/`
6. Click **Deploy**

> **Important:** Vercel Serverless Functions do NOT support persistent WebSockets.
> For full Socket.io multiplayer, use one of these instead:
>
> **Recommended free options:**
> - **Railway** → https://railway.app (easiest, supports WebSockets natively)
> - **Render** → https://render.com (free tier, supports WebSockets)
> - **Fly.io** → https://fly.io (free allowance)

## Deploy to Railway (Recommended for WebSockets)

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

Then set your domain in the Railway dashboard — it'll give you a URL like
`https://cypher-exe.up.railway.app`.

Update `SOCKET_URL` in `public/index.html` if needed (it auto-detects in most cases).

## How Multiplayer Works

1. Player A clicks **PUBLIC** → enters username → **CREATE ROOM** → gets a 6-char code
2. Player B clicks **PUBLIC** → enters username → pastes code → **JOIN**
3. Lobby shows both players connected, then auto-starts after 2 seconds
4. In-game: shoot each other, use recharge terminals (requires vocab quiz), first to 0 HP loses
5. Room code shown top-center in-game for reference

## Game Modes

| Mode    | Description |
|---------|-------------|
| PRIVATE | Solo vs AI bots, endless waves, vocab quiz recharge |
| PUBLIC  | 1v1 real player, room codes, Socket.io real-time |
