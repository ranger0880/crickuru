import fs from "node:fs";
import path from "node:path";
import { ROUTE_METADATA, absoluteUrl } from "../src/metadata.js";

const root = process.cwd();
const publicDir = path.join(root, "public");

fs.mkdirSync(publicDir, { recursive: true });
copyDirectory(path.join(root, "assets"), path.join(publicDir, "assets"));
copyDirectory(path.join(root, "data"), path.join(publicDir, "data"));

writeText("robots.txt", renderRobots());
writeText("sitemap.xml", renderSitemap());
writeText("sitemap_index.xml", renderSitemapIndex());
writeText("manifest.json", renderManifest());
writeText("ads.txt", "google.com, pub-9189221679544057, DIRECT, f08c47fec0942fa0\n");
writeText(".nojekyll", "");
writeText("CNAME", "crickuru.com\n");
writeFavicon(path.join(publicDir, "favicon.ico"));

function renderRobots() {
  return [
    "User-agent: *",
    "Allow: /",
    "Disallow: /wp-admin/",
    "",
    `Sitemap: ${absoluteUrl("/sitemap.xml")}`,
    "",
  ].join("\n");
}

function renderSitemap() {
  const today = new Date().toISOString().slice(0, 10);
  const urls = ROUTE_METADATA.map((route) => {
    return [
      "  <url>",
      `    <loc>${absoluteUrl(route.path)}</loc>`,
      `    <lastmod>${today}</lastmod>`,
      `    <changefreq>${route.changefreq}</changefreq>`,
      `    <priority>${route.priority}</priority>`,
      "  </url>",
    ].join("\n");
  }).join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    "</urlset>",
    "",
  ].join("\n");
}

function renderSitemapIndex() {
  const today = new Date().toISOString().slice(0, 10);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    "  <sitemap>",
    `    <loc>${absoluteUrl("/sitemap.xml")}</loc>`,
    `    <lastmod>${today}</lastmod>`,
    "  </sitemap>",
    "</sitemapindex>",
    "",
  ].join("\n");
}

function renderManifest() {
  return `${JSON.stringify(
    {
      name: "CricKuru - Kurukshetra Warriors Cricket Hub",
      short_name: "CricKuru",
      description: "Kurukshetra Warriors cricket hub, playable arena, meme forge, and CricHeroes links.",
      start_url: "/",
      scope: "/",
      display: "standalone",
      background_color: "#05070B",
      theme_color: "#05070B",
      icons: [
        {
          src: "/favicon.ico",
          sizes: "32x32",
          type: "image/x-icon",
        },
        {
          src: "/assets/red-leather-cricket-ball-cursor.svg",
          sizes: "any",
          type: "image/svg+xml",
          purpose: "any maskable",
        },
      ],
      categories: ["sports", "games", "entertainment"],
    },
    null,
    2,
  )}\n`;
}

function writeText(relativePath, content) {
  fs.writeFileSync(path.join(publicDir, relativePath), content, "utf8");
}

function copyDirectory(source, destination) {
  fs.mkdirSync(destination, { recursive: true });
  for (const item of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, item.name);
    const destinationPath = path.join(destination, item.name);
    if (item.isDirectory()) {
      copyDirectory(sourcePath, destinationPath);
    } else {
      fs.copyFileSync(sourcePath, destinationPath);
    }
  }
}

function writeFavicon(destination) {
  const size = 32;
  const pixelBytes = size * size * 4;
  const maskStride = Math.ceil(size / 32) * 4;
  const maskBytes = maskStride * size;
  const imageBytes = 40 + pixelBytes + maskBytes;
  const buffer = Buffer.alloc(22 + imageBytes);

  buffer.writeUInt16LE(0, 0);
  buffer.writeUInt16LE(1, 2);
  buffer.writeUInt16LE(1, 4);
  buffer.writeUInt8(size, 6);
  buffer.writeUInt8(size, 7);
  buffer.writeUInt8(0, 8);
  buffer.writeUInt8(0, 9);
  buffer.writeUInt16LE(1, 10);
  buffer.writeUInt16LE(32, 12);
  buffer.writeUInt32LE(imageBytes, 14);
  buffer.writeUInt32LE(22, 18);

  const dibOffset = 22;
  buffer.writeUInt32LE(40, dibOffset);
  buffer.writeInt32LE(size, dibOffset + 4);
  buffer.writeInt32LE(size * 2, dibOffset + 8);
  buffer.writeUInt16LE(1, dibOffset + 12);
  buffer.writeUInt16LE(32, dibOffset + 14);
  buffer.writeUInt32LE(0, dibOffset + 16);
  buffer.writeUInt32LE(pixelBytes, dibOffset + 20);

  const pixelOffset = dibOffset + 40;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = x - size / 2 + 0.5;
      const dy = y - size / 2 + 0.5;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const row = size - 1 - y;
      const offset = pixelOffset + (row * size + x) * 4;
      const inside = distance <= 14.5;
      if (!inside) {
        buffer.writeUInt32LE(0, offset);
        continue;
      }
      const seam = Math.abs(dx * 0.55 + dy * 0.18) < 1.25 || Math.abs(dx * 0.55 + dy * 0.18 - 6) < 0.9;
      const highlight = distance < 8 && x < 15 && y < 13;
      const red = seam ? 245 : highlight ? 221 : 183;
      const green = seam ? 247 : highlight ? 81 : 25;
      const blue = seam ? 250 : highlight ? 90 : 50;
      buffer.writeUInt8(blue, offset);
      buffer.writeUInt8(green, offset + 1);
      buffer.writeUInt8(red, offset + 2);
      buffer.writeUInt8(255, offset + 3);
    }
  }

  fs.writeFileSync(destination, buffer);
}
