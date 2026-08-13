# CricKuru GitHub to Hostinger Auto Deploy

Use this setup so you do not need to upload `crickuru-hostinger-upload.zip` manually after every change.

## What This Does

The GitHub workflow `.github/workflows/hostinger-deploy.yml` will:

1. Run whenever code is pushed to `main`.
2. Install dependencies with `npm ci`.
3. Build the production site with `npm run build`.
4. Upload the generated `dist/` folder to Hostinger.

It also runs when the scheduled CricHeroes and India match feed workflows commit refreshed data, so Hostinger can receive refreshed data too.

## Step 1 - Create or Find Hostinger FTP Details

In Hostinger hPanel:

1. Open `Websites`.
2. Choose `crickuru.com`.
3. Open the website dashboard.
4. Search for `FTP Accounts`.
5. Create an FTP account for `public_html`, or use the existing FTP account.

Recommended safer setup:

- FTP account directory: `/public_html`
- GitHub secret `HOSTINGER_FTP_DIR`: `/`

If you use the default FTP account that starts above the website folder:

- GitHub secret `HOSTINGER_FTP_DIR`: `public_html/`

## Step 2 - Add GitHub Secrets

Open the GitHub repository:

`https://github.com/ranger0880/crickuru`

Then go to:

`Settings` -> `Secrets and variables` -> `Actions` -> `New repository secret`

Add these four secrets:

| Secret name | Value |
| --- | --- |
| `HOSTINGER_FTP_SERVER` | `93.127.208.60` |
| `HOSTINGER_FTP_USERNAME` | `u100370327` |
| `HOSTINGER_FTP_PASSWORD` | FTP password from Hostinger |
| `HOSTINGER_FTP_DIR` | Not required; this FTP account opens directly in the `public_html` document root, so the workflow uses `/` |

Do not put quotes around the secret values.
The workflow also accepts `public_html`, `/public_html`, or `/public_html/` and normalizes it automatically.

## Step 3 - Run First Deploy

In GitHub:

1. Open `Actions`.
2. Select `Deploy CricKuru to Hostinger`.
3. Click `Run workflow`.
4. Wait for the green check.
5. Open `https://crickuru.com`.

If the workflow says the FTP secrets are missing, add the four secrets above and run it again. Never commit the FTP password to the repository.

## Step 4 - Future Updates

After this, normal changes only need:

```bash
git push origin main
```

GitHub will build and upload the site automatically.

## Important Notes

- Do not upload the repository root to Hostinger.
- The live site must receive the built files from `dist/`.
- If Hostinger still shows old HTML, clear Hostinger cache and check the workflow logs.
- The old manual ZIP method can stay as a backup.
