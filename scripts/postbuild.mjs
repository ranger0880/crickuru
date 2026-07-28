import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { NOT_FOUND_METADATA, ROUTE_METADATA, renderRouteMeta, stringifyJsonLd } from "../src/metadata.js";

const root = process.cwd();
const distDir = path.join(root, "dist");
const templatePath = path.join(distDir, "index.html");
const template = fs.readFileSync(templatePath, "utf8");
const marker = "<!--CRICKURU_ROUTE_META-->";

if (!template.includes(marker)) {
  throw new Error("Built index.html is missing the route metadata marker.");
}

for (const route of ROUTE_METADATA) {
  writeRoute(route.path, renderRouteMeta(route.path));
}

writeRoute("/404", renderRouteMeta(NOT_FOUND_METADATA.path), "404.html");
writeText(path.join(distDir, ".htaccess"), renderHtaccess());

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
  const csp = [
    "default-src 'self'",
    `script-src 'self' ${[...jsonLdHashes].join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "img-src 'self' data: blob: https://media.cricheroes.in",
    "connect-src 'self'",
    "manifest-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");

  return [
    "<IfModule mod_mime.c>",
    "  AddType text/plain .txt",
    "  AddType application/xml .xml",
    "  AddType application/json .json",
    "  AddType application/manifest+json .webmanifest",
    "  AddType image/x-icon .ico",
    "</IfModule>",
    "",
    "<Files \"manifest.json\">",
    "  ForceType application/manifest+json",
    "</Files>",
    "",
    "<IfModule mod_headers.c>",
    "  Header always set Strict-Transport-Security \"max-age=31536000; includeSubDomains; preload\"",
    "  Header always set X-Content-Type-Options \"nosniff\"",
    "  Header always set Referrer-Policy \"strict-origin-when-cross-origin\"",
    "  Header always set Permissions-Policy \"accelerometer=(), autoplay=(), camera=(), encrypted-media=(), fullscreen=(self), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()\"",
    `  Header always set Content-Security-Policy "${csp}"`,
    "</IfModule>",
    "",
    "<IfModule mod_rewrite.c>",
    "  DirectoryIndex index.html index.php",
    "  RewriteEngine On",
    "  RewriteBase /",
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

function writeText(outputPath, content) {
  fs.writeFileSync(outputPath, content, "utf8");
}
