# CricKuru Bot API

This service powers the optional CricKuru website assistant. It reads the sanitized, scheduled snapshot at `data/crickuru-live.json`; it does not scrape CricHeroes for every visitor request.

## Render

- Create a **Web Service** from `ranger0880/crickuru`.
- Root Directory: `bot`
- Build Command: leave blank
- Start Command: `node server.js`
- Environment variable: `CORS_ORIGINS=https://crickuru.com,https://www.crickuru.com`

The service exposes `GET /health`, `GET /api/team/8626734`, `GET /api/stats?url=<CricHeroes player-profile URL>`, and `POST /api/chat` with `{ "message": "..." }`.

Set the GitHub Pages / Hostinger build variable `VITE_BOT_API_URL` to the Render URL, then rebuild the site. The widget remains harmless and disconnected when this variable is empty.

## WhatsApp

The HTTP API is ready to be called by a WhatsApp adapter, but a group bot requires an approved WhatsApp Business provider or a separately persisted session. Do not commit QR sessions, access tokens, or phone numbers. Render's ephemeral filesystem is not suitable for an unattended QR session without an external store.
