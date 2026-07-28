# CricHeroes Live Feed Sync

CricKuru reads live match intelligence from:

```text
data/crickuru-live.json
```

To refresh it from the Kurukshetra Warriors CricHeroes pages:

```powershell
node tools/sync-cricheroes.mjs
```

Then run `npm run build`. GitHub Pages deploys the generated `dist/` output.

## Live Automation

`.github/workflows/sync-cricheroes.yml` checks this feed every 5 minutes. It:

- Pulls the latest Kurukshetra Warriors matches and members from CricHeroes
- Separates live matches, upcoming fixtures and recent results
- Rebuilds and redeploys only when the CricHeroes feed changes
- Commits `data/crickuru-live.json` and `crickuru-hostinger-upload.zip` when the feed changes

The website uses this feed to show:

- Live Warriors score when CricHeroes exposes an in-progress match
- Latest match result and scores
- Upcoming scheduled match when CricHeroes exposes one
- Warriors player badges and award counts
- Opponent team form and rivalry badges

Because the site is hosted on static GitHub Pages, this is a near-live refresh. The browser checks the saved feed every minute, while GitHub Actions refreshes and redeploys changed CricHeroes data every 5 minutes.
