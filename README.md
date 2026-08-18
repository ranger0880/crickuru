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

## CricKuru Arena

The `/arena` route contains a playable browser cricket duel with:

- Toss and bat/bowl choice
- One-over, two-over, and five-over formats
- Human batting with shot, footwork, aggression, and timing controls
- Human bowling with variation, line, length, pace, field, and accuracy controls
- Adaptive AI batting and bowling
- Scoreboard, innings transition, match result, achievements, and guest progress saving

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

## Meme Forge

The `/memes` route loads a 100-meme vault from `data/meme-bank.json`, generates one cricket meme at a time, previews it as a branded CricKuru SVG with a related cricket-player background scene, and downloads the selected meme image.

## Analytics

The site includes the Google Analytics Google tag for measurement ID `G-6WZ5CTVLPG`. The build script also allows the required Google Analytics endpoints in the generated Hostinger CSP.

## Warriors Data

The `/warriors` route displays the full public Kurukshetra Warriors CricHeroes feed from `data/crickuru-live.json`, including team profile fields, match scorecards, roster signals, awards, opponents, source links and near-live sync timing.

## Account connections

The quiz profile supports Google Identity Services and WhatsApp OTP through a separate authentication backend. Set `VITE_AUTH_API_URL` and `VITE_GOOGLE_CLIENT_ID` as GitHub Actions secrets; the workflows pass them into the build without committing credentials.

The backend must expose `GET /auth/session`, `POST /auth/google`, `POST /auth/whatsapp/start`, `POST /auth/whatsapp/verify`, and `POST /auth/logout`. It must verify Google ID tokens server-side, send WhatsApp codes through the Meta WhatsApp Business API, rate-limit OTP requests, expire challenges, set an `HttpOnly; Secure; SameSite` session cookie, and use CSRF protection for cookie-authenticated mutations. The frontend never stores access tokens in browser storage.

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
