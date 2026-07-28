# CricKuru

Official website and cricket platform for CricKuru and Kurukshetra Warriors.

Production-built landing page for `crickuru.com`.

## Build

```bash
npm install
npm run build
```

The build writes the deployable static site to `dist/` and refreshes `crickuru-hostinger-upload.zip` for Hostinger File Manager upload.

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

GitHub Actions also runs `.github/workflows/sync-india-matches.yml` every 15 minutes, rebuilds the production site, and deploys the refreshed feed to GitHub Pages.

## Players

The `/players` route displays the synced Kurukshetra Warriors roster as mobile-friendly performance cards with impact scores, role badges, awards and recent CricHeroes highlights.

## Meme Forge

The `/memes` route can generate one cricket meme, create a 50-meme caption pack from the selected topic and style, preview the selected meme as a branded CricKuru image, and download either the SVG image or the full text pack.

## Analytics

The site includes the Google Analytics Google tag for measurement ID `G-W9LKR0717H`. The build script also allows the required Google Analytics endpoints in the generated Hostinger CSP.

## Warriors Data

The `/warriors` route displays the full public Kurukshetra Warriors CricHeroes feed from `data/crickuru-live.json`, including team profile fields, match scorecards, roster signals, awards, opponents, source links and sync timing.

## Files

- `src/` - React app source
- `index.html` - Vite HTML shell with immediate static first-paint content
- `.htaccess` - Hostinger MIME, security-header, and route fallback rules
- `scripts/` - production static-file, metadata, favicon, and ZIP generation
- `HOSTINGER_UPLOAD_INSTRUCTIONS.md` - manual Hostinger upload guide
- `crickuru-hostinger-upload.zip` - upload-ready production bundle

## CricHeroes

The page links to the official Kurukshetra Warriors CricHeroes pages:

- Matches: https://cricheroes.com/team-profile/8626734/kurukshetra-warriors/matches
- Members: https://cricheroes.com/team-profile/8626734/kurukshetra-warriors/members
