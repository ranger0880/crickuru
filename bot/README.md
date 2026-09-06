# CricKuru Bot API

This service powers the optional CricKuru website assistant. It reads the sanitized, scheduled snapshot at `data/crickuru-live.json`; it does not scrape CricHeroes for every visitor request.

## Render

- Create a **Web Service** from `ranger0880/crickuru`.
- Root Directory: `bot`
- Build Command: `npm install --omit=dev`
- Start Command: `node server.js`
- Environment variable: `CORS_ORIGINS=https://crickuru.com,https://www.crickuru.com`

The service exposes `GET /health`, `GET /api/team/8626734`, `GET /api/stats?url=<CricHeroes player-profile URL>`, and `POST /api/chat` with `{ "message": "..." }`.

Set the GitHub Pages / Hostinger build variable `VITE_BOT_API_URL` to the Render URL, then rebuild the site. The widget remains harmless and disconnected when this variable is empty.

## WhatsApp

The optional `whatsapp.mjs` adapter uses `@whiskeysockets/baileys`, responds only in the allowlisted group, and only when a message starts with `!crickuru` or mentions the bot account. It is disabled by default.

To enable it, set `WHATSAPP_ENABLED=true`, `WHATSAPP_GROUP_JID=<your-group-jid>`, and optionally `WHATSAPP_TRIGGER=!crickuru`. The first run prints a QR in the service logs; scan it from the WhatsApp account that should operate the bot. Keep `bot/.auth/` outside GitHub and use persistent storage for unattended operation. Render's default filesystem is ephemeral, so a persistent disk or external auth store is required for reliable restarts.
