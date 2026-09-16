# CricKuru Bot API

This service powers the optional CricKuru website assistant. It reads the sanitized, scheduled snapshot at `data/crickuru-live.json`; it does not scrape CricHeroes for every visitor request.

## Render

- Create a **Web Service** from `ranger0880/crickuru`.
- Root Directory: `bot`
- Build Command: `npm install --omit=dev`
- Start Command: `node server.js`
- Environment variable: `CORS_ORIGINS=https://crickuru.com,https://www.crickuru.com`

The service exposes `GET /health`, `GET /api/team/8626734`, `GET /api/stats?url=<CricHeroes player-profile URL>`, and `POST /api/chat` with `{ "message": "..." }`. The assistant is read-only and can answer from the synchronized site feed, return CricKuru page links, and identify the GT Gaming sponsor page.

## Optional AI answers

Set `OPENAI_API_KEY` as a Render environment variable to enable concise AI answers for questions that are not covered by the direct site-link and player-data replies. Set `OPENAI_MODEL` only if you need a different model. The key is server-side only and is never stored in the repository. Requests use `store: false`; the bot still receives only the synchronized CricKuru snapshot and public site links.

Set the GitHub Pages / Hostinger build variable `VITE_BOT_API_URL` to the Render URL, then rebuild the site. The widget remains harmless and disconnected when this variable is empty.

## WhatsApp

The optional `whatsapp.mjs` adapter uses `@whiskeysockets/baileys`, responds only in the allowlisted group, and only when a message starts with `!crickuru` or mentions the bot account. It is disabled by default.

To discover the group JID, temporarily set `WHATSAPP_LOG_GROUPS=true` and leave `WHATSAPP_GROUP_JID` empty. After the QR session opens, copy the JID for your team group from the logs, set it as `WHATSAPP_GROUP_JID`, then remove or disable `WHATSAPP_LOG_GROUPS`.

If the Render text QR cannot be scanned, set `WHATSAPP_PAIRING_PHONE` to the bot account's full international phone number with digits only, for example `919876543210`. After redeploying, open WhatsApp on that number and choose **Linked Devices > Link a Device > Link with phone number**, then enter the pairing code shown in the Render logs. Remove `WHATSAPP_PAIRING_PHONE` after linking if you want QR fallback on future fresh sessions.

This Baileys bridge is suitable for testing and existing-group use, but it is not Meta's official Cloud API. Official WhatsApp Business Platform group capabilities are restricted and should be checked against your business account before production use.

To enable it, set `WHATSAPP_ENABLED=true`, `WHATSAPP_GROUP_JID=<your-group-jid>`, and optionally `WHATSAPP_TRIGGER=!crickuru`. The first run prints a QR in the service logs; scan it from the WhatsApp account that should operate the bot. Keep `bot/.auth/` outside GitHub and use persistent storage for unattended operation. Render's default filesystem is ephemeral, so a persistent disk or external auth store is required for reliable restarts.
