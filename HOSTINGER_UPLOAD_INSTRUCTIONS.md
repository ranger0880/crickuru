# CricKuru Hostinger Upload

Use this when Hostinger AI credits are finished. This site is a standalone React landing page that you can upload manually.

## Fast Upload Method

1. Open Hostinger hPanel.
2. Go to Websites, choose `crickuru.com`, then open File Manager.
3. Open the `public_html` folder.
4. Upload or create `index.html` and paste the full code from this workspace file:
   `C:\Users\Admin\Documents\Cricket website\index.html`
5. Upload or create `.htaccess` and paste the full code from:
   `C:\Users\Admin\Documents\Cricket website\.htaccess`
6. Save both files and open `https://crickuru.com`.

If Hostinger created WordPress, the site may keep loading `index.php`. In that case, either rename `index.php` to `index-wp-backup.php`, or make sure `.htaccess` includes:

```apache
DirectoryIndex index.html index.php
```

Also make sure the files are not trapped inside a nested folder after extracting the ZIP. `index.html` must be directly inside `public_html`.

## Why `.htaccess` Is Included

The landing page uses routes like `/arena`, `/teams`, `/players`, `/tournaments`, `/community`, and `/login`. The `.htaccess` file makes those routes load the React page correctly when someone refreshes the browser.

## CricHeroes Links Used

- Matches: `https://cricheroes.com/team-profile/8626734/kurukshetra-warriors/matches`
- Members: `https://cricheroes.com/team-profile/8626734/kurukshetra-warriors/members`

The page links to the official CricHeroes pages instead of pretending to sync data. CricHeroes blocked direct scraping from this environment, so no fake player names or fake live scores were added.
