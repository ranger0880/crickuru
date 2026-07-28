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

## Daily Automation

`.github/workflows/sync-cricheroes.yml` refreshes this feed every day at 09:00 IST. It:

- Pulls the latest Kurukshetra Warriors matches and members from CricHeroes
- Separates upcoming fixtures from recent results
- Rebuilds the production site
- Deploys GitHub Pages
- Commits `data/crickuru-live.json` and `crickuru-hostinger-upload.zip` when the feed changes

The website uses this feed to show:

- Latest match result and scores
- Upcoming scheduled match when CricHeroes exposes one
- Warriors player badges and award counts
- Opponent team form and rivalry badges
