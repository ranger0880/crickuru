# CricKuru

Official website and cricket platform for CricKuru and Kurukshetra Warriors.

Production-built landing page for `crickuru.com`.

## Build

```bash
npm install
npm run build
```

The build writes the deployable static site to `dist/` and refreshes `crickuru-hostinger-upload.zip` for Hostinger File Manager upload.
For automatic GitHub-to-Hostinger publishing, use `HOSTINGER_GITHUB_DEPLOY.md`.

## Cricket experience

The site focuses on the Warriors match centre, player profiles, India match coverage, quiz, sponsor page and gear shop.

## India Matches

The `/india-matches` route displays India-linked live, future, and past cricket matches from `data/india-matches.json`.
The top score strip reads the same feed and checks for updates in the browser every minute.

Refresh the feed locally with:

```bash
node tools/sync-india-matches.mjs
```

GitHub Actions also runs `.github/workflows/sync-india-matches.yml` every 5 minutes and commits the refreshed feed. The site rebuild/deploy workflow then publishes that data to GitHub Pages.

## Players

The `/players` route displays the synced Kurukshetra Warriors roster as mobile-friendly performance cards with impact scores, role badges, awards and recent CricHeroes highlights.
GitHub Actions runs the CricHeroes feed every 15 minutes, refreshes 12 player profiles per pass, and writes a visible `lastCheckedAt` timestamp even when CricHeroes temporarily blocks a fetch so the page clearly shows whether it is using fresh or saved public data.

## Analytics

The site includes the Google Analytics Google tag for measurement ID `G-KZ8ZPCDSH2`. The build script also allows the required Google Analytics endpoints in the generated Hostinger CSP.

## Warriors Data

The `/warriors` route displays the full public Kurukshetra Warriors CricHeroes feed from `data/crickuru-live.json`, including team profile fields, match scorecards, roster signals, awards, opponents, source links and near-live sync timing.

## Account connections

The quiz profile supports Google Identity Services and WhatsApp OTP through a separate authentication backend. Set `VITE_AUTH_API_URL` and `VITE_GOOGLE_CLIENT_ID` as GitHub Actions secrets; the workflows pass them into the build without committing credentials.

The backend must expose `GET /auth/session`, `POST /auth/google`, `POST /auth/whatsapp/start`, `POST /auth/whatsapp/verify`, and `POST /auth/logout`. It must verify Google ID tokens server-side, send WhatsApp codes through the Meta WhatsApp Business API, rate-limit OTP requests, expire challenges, set an `HttpOnly; Secure; SameSite` session cookie, and use CSRF protection for cookie-authenticated mutations. The frontend never stores access tokens in browser storage.

## CricKuru assistant bot

The optional assistant API lives in `bot/`. It reads the scheduled `data/crickuru-live.json` snapshot and exposes player stats, team data, and a small source-aware chat endpoint without scraping CricHeroes on every visitor request. The site widget connects when `VITE_BOT_API_URL` is set at build time.

Deploy it on Render with the included `render.yaml`, or use root directory `bot` and start command `node server.js`. Set `CORS_ORIGINS` to the production site origins, then set `VITE_BOT_API_URL` in the site build environment and rebuild. WhatsApp group automation is intentionally not bundled: use an approved WhatsApp Business provider and keep its credentials/session outside GitHub; Render's default filesystem is ephemeral.

## Verified player chat

The player chat widget uses the same bot service as a small social API. Google sign-in is mandatory before a player can send messages, add friends, or create groups. The service verifies Google ID tokens server-side, assigns each account a stable `KW-XXXXXXXX` friend code, stores accepted friend relationships, and refreshes conversations every few seconds. Categories currently include General, Team, Matchday and Training.

Set these Render environment variables on the bot service:

- `GOOGLE_CLIENT_ID`: the same Google web client ID used by `VITE_GOOGLE_CLIENT_ID`.
- `SESSION_SECRET`: a long random value used to sign secure HTTP-only sessions.
- `CORS_ORIGINS`: `https://crickuru.com,https://www.crickuru.com`.
- `SOCIAL_STORE_FILE`: the storage path for the social JSON store. Render's default filesystem is ephemeral, so use a persistent disk or move this store to a managed database before scaling beyond a small team community.

Set `VITE_BOT_API_URL` (or `VITE_SOCIAL_API_URL`) in GitHub Actions to the Render service URL. Add the production domain and local development origins to the Google OAuth client's authorised JavaScript origins.

## Files

- `src/` - React app source
- `index.html` - Vite HTML shell with immediate static first-paint content
- `.htaccess` - Hostinger MIME, security-header, and route fallback rules
- `scripts/` - production static-file, metadata, favicon, and ZIP generation
- `HOSTINGER_UPLOAD_INSTRUCTIONS.md` - manual Hostinger upload guide
- `HOSTINGER_GITHUB_DEPLOY.md` - automatic GitHub Actions deployment guide
- `crickuru-hostinger-upload.zip` - upload-ready production bundle

## Direct Hostinger Git deployment

The `main` branch contains the Vite source code and cannot be connected directly to Hostinger because Hostinger Git does not run the Vite build. The `hostinger-static` branch contains only the latest built website and is refreshed automatically from `main` by GitHub Actions. Connect Hostinger Git to `hostinger-static` with an empty install path so its `public_html` receives the ready-to-serve files.

## CricHeroes

The page links to the official Kurukshetra Warriors CricHeroes pages:

- Matches: https://cricheroes.com/team-profile/8626734/kurukshetra-warriors/matches
- Members: https://cricheroes.com/team-profile/8626734/kurukshetra-warriors/members
