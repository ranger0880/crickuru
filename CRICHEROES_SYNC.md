# CricHeroes Live Feed Sync

CricKuru reads live match intelligence from:

```text
data/crickuru-live.json
```

To refresh it from the Kurukshetra Warriors CricHeroes pages:

```powershell
node tools/sync-cricheroes.mjs
```

Then rebuild and upload `crickuru-hostinger-upload.zip` to Hostinger.

The website uses this feed to show:

- Latest match result and scores
- Warriors player badges and award counts
- Opponent team form and rivalry badges
- AdSense script on every page copy
