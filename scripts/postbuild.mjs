import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { NOT_FOUND_METADATA, ROUTE_METADATA, renderRouteMeta, stringifyJsonLd } from "../src/metadata.js";

const root = process.cwd();
const distDir = path.join(root, "dist");
const templatePath = path.join(distDir, "index.html");
const template = fs
  .readFileSync(templatePath, "utf8")
  .replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/g, '<script defer src="$1"></script>');
const marker = "<!--CRICKURU_ROUTE_META-->";

if (!template.includes(marker)) {
  throw new Error("Built index.html is missing the route metadata marker.");
}

for (const route of ROUTE_METADATA) {
  writeRoute(route.path, renderRouteMeta(route.path));
}

writeRoute("/404", renderRouteMeta(NOT_FOUND_METADATA.path), "404.html");
writeText(path.join(distDir, ".htaccess"), renderHtaccess());
writeLegacyAssetAliases();

function writeRoute(routePath, metaHtml, forcedFileName) {
  const html = template.replace(marker, metaHtml);
  const outputPath = forcedFileName
    ? path.join(distDir, forcedFileName)
    : routePath === "/"
      ? path.join(distDir, "index.html")
      : path.join(distDir, routePath.slice(1), "index.html");

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  writeText(outputPath, html);
}

function renderHtaccess() {
  const jsonLdHashes = new Set(
    [...ROUTE_METADATA.map((route) => route.path), NOT_FOUND_METADATA.path].map((routePath) => {
      return `'sha256-${crypto.createHash("sha256").update(stringifyJsonLd(routePath)).digest("base64")}'`;
    }),
  );
  const inlineScriptHashes = new Set([...jsonLdHashes, ...hashInlineScripts(template)]);
  const csp = [
    "default-src 'self'",
    `script-src 'self' https://accounts.google.com https://www.googletagmanager.com https://pagead2.googlesyndication.com https://fundingchoicesmessages.google.com ${[...inlineScriptHashes].join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "img-src 'self' data: blob: https://media.cricheroes.in https://www.google-analytics.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com",
    "connect-src 'self' https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com https://region2.google-analytics.com https://stats.g.doubleclick.net https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://fundingchoicesmessages.google.com",
    "frame-src 'self' https://accounts.google.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://pagead2.googlesyndication.com",
    "manifest-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");

  return [
    "Options -Indexes",
    "",
    "<IfModule mod_mime.c>",
    "  AddType text/plain .txt",
    "  AddType application/xml .xml",
    "  AddType application/json .json",
    "  AddType application/manifest+json .webmanifest",
    "  AddType application/javascript .js",
    "  AddType text/css .css",
    "  AddType image/x-icon .ico",
    "</IfModule>",
    "",
    "<FilesMatch \"^(?:\\.|.*\\.(?:env|ini|log|bak|old|orig|sql|sqlite|conf|config|map))$\">",
    "  Require all denied",
    "</FilesMatch>",
    "",
    "<FilesMatch \"^(?:package(?:-lock)?\\.json|vite\\.config\\.js|tailwind\\.config\\.cjs|postcss\\.config\\.cjs|README.*|.*\\.md)$\">",
    "  Require all denied",
    "</FilesMatch>",
    "",
    "<Files \"manifest.json\">",
    "  ForceType application/manifest+json",
    "</Files>",
    "",
    "<IfModule mod_headers.c>",
    "  Header always set Cache-Control \"no-store, no-cache, must-revalidate, max-age=0\"",
    "  Header always set Pragma \"no-cache\"",
    "  <FilesMatch \"\\.(?:html|json)$\">",
    "    Header always set Cache-Control \"no-store, no-cache, must-revalidate, max-age=0\"",
    "    Header always set Pragma \"no-cache\"",
    "  </FilesMatch>",
    "  Header always set Strict-Transport-Security \"max-age=31536000; includeSubDomains; preload\"",
    "  Header always set X-Content-Type-Options \"nosniff\"",
    "  Header always set X-Frame-Options \"SAMEORIGIN\"",
    "  Header always set Referrer-Policy \"strict-origin-when-cross-origin\"",
    "  Header always set Cross-Origin-Opener-Policy \"same-origin-allow-popups\"",
    "  Header always set Permissions-Policy \"accelerometer=(), autoplay=(), camera=(), encrypted-media=(), fullscreen=(self), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()\"",
    `  Header always set Content-Security-Policy "${csp}"`,
    "  <FilesMatch \"\\.(?:html|json)$\">",
    "    Header always set Cache-Control \"no-store, no-cache, must-revalidate, max-age=0\"",
    "    Header always set Pragma \"no-cache\"",
    "  </FilesMatch>",
    "</IfModule>",
    "",
    "<IfModule LiteSpeed>",
    "  CacheDisable public /",
    "  CacheDisable private /",
    "</IfModule>",
    "",
    "<IfModule mod_expires.c>",
    "  ExpiresActive On",
    "  ExpiresByType text/html \"access plus 0 seconds\"",
    "  ExpiresByType application/json \"access plus 0 seconds\"",
    "  ExpiresByType application/javascript \"access plus 1 week\"",
    "  ExpiresByType text/css \"access plus 1 week\"",
    "</IfModule>",
    "",
    "<IfModule mod_rewrite.c>",
    "  DirectoryIndex index.html",
    "  RewriteEngine On",
    "  RewriteBase /",
    "  RewriteRule ^(?:\\.git|\\.github|node_modules|src|scripts|tools|public|dist)(?:/|$) - [R=404,L]",
    "  RewriteRule ^(?:wp-admin|wp-content|wp-includes)(?:/|$) - [R=404,L]",
    "  RewriteRule ^(?:wp-[^/]+\\.php|xmlrpc\\.php|index\\.php)$ - [R=404,L]",
    "  RewriteRule ^(robots\\.txt|sitemap\\.xml|sitemap_index\\.xml|manifest\\.json|favicon\\.ico)$ - [L]",
    "  RewriteRule ^assets/ - [L]",
    "  RewriteRule ^data/ - [L]",
    "  RewriteRule ^index\\.html$ - [L]",
    "  RewriteCond %{REQUEST_URI} !\\.[A-Za-z0-9]{2,8}$",
    "  RewriteCond %{REQUEST_FILENAME} !-f",
    "  RewriteCond %{REQUEST_FILENAME} !-d",
    "  RewriteRule . /index.html [L]",
    "</IfModule>",
    "",
  ].join("\n");
}

function hashInlineScripts(html) {
  const hashes = [];
  const scriptPattern = /<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let match = scriptPattern.exec(html);
  while (match) {
    const scriptContent = match[1];
    if (scriptContent.trim()) {
      hashes.push(`'sha256-${crypto.createHash("sha256").update(scriptContent).digest("base64")}'`);
    }
    match = scriptPattern.exec(html);
  }
  return hashes;
}

function writeText(outputPath, content) {
  fs.writeFileSync(outputPath, content, "utf8");
}

function writeLegacyAssetAliases() {
  const assetDir = path.join(distDir, "assets");
  const currentJs = fs.readdirSync(assetDir).find((name) => /^index-(?!CplD2v_A|_XkMW-m6)[A-Za-z0-9_-]+\.js$/.test(name));
  const currentCss = fs.readdirSync(assetDir).find((name) => /^index-(?!D_lhbeiB|8uKMYpLS)[A-Za-z0-9_-]+\.css$/.test(name));

  if (currentJs) {
    for (const alias of ["index-CplD2v_A.js", "index-_XkMW-m6.js"]) {
      fs.copyFileSync(path.join(assetDir, currentJs), path.join(assetDir, alias));
    }
  }
  if (currentCss) {
    for (const alias of ["index-D_lhbeiB.css", "index-8uKMYpLS.css"]) {
      fs.copyFileSync(path.join(assetDir, currentCss), path.join(assetDir, alias));
    }
  }
}
