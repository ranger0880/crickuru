# CricKuru Hostinger Upload

Use this when Hostinger AI credits are finished. This site is a bundled production React app that you can upload manually.

## Fast Upload Method

1. Run `npm install` if dependencies are not installed yet.
2. Run `npm run build`.
3. Open Hostinger hPanel.
4. Go to Websites, choose `crickuru.com`, then open File Manager.
5. Open the `public_html` folder.
6. Upload `crickuru-hostinger-upload.zip`.
7. Extract it directly inside `public_html`.
8. Confirm `index.html`, `.htaccess`, `robots.txt`, `sitemap.xml`, `manifest.json`, and `favicon.ico` are directly inside `public_html`.
9. Open `https://crickuru.com`.

Do not upload the repository root as the live site. Upload the generated ZIP or the contents of `dist/`.

## WordPress Note

If Hostinger created WordPress, the site may keep loading `index.php`. In that case, either rename `index.php` to `index-wp-backup.php`, or make sure `.htaccess` includes:

```apache
DirectoryIndex index.html index.php
```

## Why `.htaccess` Is Included

The site uses routes like `/arena`, `/memes`, `/meme`, `/coin`, and `/kurukshetra-coin`. The `.htaccess` file keeps those app routes working on refresh while letting real files such as `robots.txt`, `sitemap.xml`, `manifest.json`, and `favicon.ico` serve with the right MIME types.

## CricHeroes Links Used

- Matches: `https://cricheroes.com/team-profile/8626734/kurukshetra-warriors/matches`
- Members: `https://cricheroes.com/team-profile/8626734/kurukshetra-warriors/members`

The page links to the official CricHeroes pages instead of pretending to sync data. CricHeroes blocked direct scraping from this environment, so no fake player names or fake live scores were added.
