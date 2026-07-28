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
