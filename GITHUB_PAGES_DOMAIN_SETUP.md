# Publish crickuru.com with GitHub Pages

The repository is prepared for GitHub Pages using:

- `CNAME` with `crickuru.com`
- `.nojekyll`
- `.github/workflows/pages.yml`
- `404.html` route fallback

## Required GitHub Setting

Open:

`https://github.com/ranger0880/crickuru/settings/pages`

Set:

- Source: `GitHub Actions`

The workflow will publish the site after the next push or manual workflow run.

## Required Hostinger DNS Records

In Hostinger DNS Zone Editor for `crickuru.com`, set these records.

For the root domain:

| Type | Name | Value |
| --- | --- | --- |
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |

For the www version:

| Type | Name | Value |
| --- | --- | --- |
| CNAME | www | ranger0880.github.io |

Remove old conflicting `A`, `AAAA`, `CNAME`, redirect, parked-domain, or website-builder records for `@` and `www` if Hostinger warns about duplicates.

DNS can take minutes to several hours, and sometimes up to 24 hours, to finish propagating.

After GitHub Pages is live and DNS is correct, open:

`https://crickuru.com`
