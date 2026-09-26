const AMAZON_ASSOCIATE_TAG = (import.meta.env.VITE_AMAZON_ASSOCIATE_TAG || "deluluromance-21").trim();

export function amazonProductUrl(asin) {
  const url = new URL(`https://www.amazon.in/dp/${asin}`);
  if (AMAZON_ASSOCIATE_TAG) url.searchParams.set("tag", AMAZON_ASSOCIATE_TAG);
  return url.toString();
}

export const amazonAffiliateConfigured = Boolean(AMAZON_ASSOCIATE_TAG);

export const AMAZON_COLLECTIONS = [
  {
    id: "tennis-balls",
    label: "Tennis ball cricket",
    eyebrow: "Street · society · training",
    title: "Tennis-ball match kits",
    description: "Lighter, forgiving options for gully cricket, society matches, indoor practice and everyday throwdowns.",
    accent: "cyan",
    products: [
      { asin: "B06XPCT8V8", title: "Cosco Rubber Light Cricket Tennis Ball (Pack of 6)", image: "https://m.media-amazon.com/images/I/71QtQyiWYJL._AC_UL320_.jpg", fit: "A familiar six-ball pack for casual matches and club practice." },
      { asin: "B0H7HPT7MY", title: "Tennis Ball for Cricket Pack of 12", image: "https://m.media-amazon.com/images/I/81bn-9twrdL._AC_UL320_.jpg", fit: "A bigger practice pack for nets, lawns and tournament warm-ups." },
      { asin: "B0DBDHRTKF", title: "Nivia Heavy Weight Tennis Cricket Ball, Pack of 3", image: "https://m.media-amazon.com/images/I/7191NrZIH9L._AC_UL320_.jpg", fit: "A heavier training feel for players who want more carry off the bat." },
      { asin: "B0DSJLJ6G7", title: "SLOVIC Practice Tennis Cricket Balls, Pack of 6", image: "https://m.media-amazon.com/images/I/81dh9JNGiHL._AC_UL320_.jpg", fit: "High-bounce rubber balls for street matches and repeat drills." },
      { asin: "B08NXZQN22", title: "AMiFIT Light Weight Tennis Balls, Pack of 12", image: "https://m.media-amazon.com/images/I/61izfb9T7ZL._AC_UL320_.jpg", fit: "A softer, lighter pick for casual play and younger players." },
      { asin: "B0FQJXNCWH", title: "Boldfit Lightweight Rubber Tennis Balls, Pack of 6", image: "https://m.media-amazon.com/images/I/51GtP5XjzML._AC_UL320_.jpg", fit: "Court and turf friendly balls for organised practice sessions." },
    ],
  },
  {
    id: "leather-balls",
    label: "Leather-ball cricket",
    eyebrow: "Club · academy · match play",
    title: "Leather-ball match kits",
    description: "Hand-stitched and club-style options for nets, hard-ball practice, day/night games and match preparation.",
    accent: "gold",
    products: [
      { asin: "B0C6HSCXDR", title: "Club Leather Cricket Ball, Two-Piece Red/White", image: "https://m.media-amazon.com/images/I/51WJaMMpZwL._AC_UL320_.jpg", fit: "A two-piece club-style ball for match practice and regular sessions." },
      { asin: "B09XJG4YG5", title: "AK SPORTS Red and White Leather Ball Combo", image: "https://m.media-amazon.com/images/I/51zF50Ss1lL._AC_UL320_.jpg", fit: "A two-ball combo for switching between red and white-ball drills." },
      { asin: "B0G346BXZD", title: "Hand-Stitched Leather Cricket Ball for Club and Academy Use", image: "https://m.media-amazon.com/images/I/41li1hELD1L._AC_UL320_.jpg", fit: "A water-resistant training option for nets and academy work." },
      { asin: "B09CV7PW14", title: "SG Shield 20 Red Leather Cricket Ball", image: "https://m.media-amazon.com/images/I/71K9p0st-ZL._AC_UL320_.jpg", fit: "A recognised club-ball option for structured hard-ball practice." },
      { asin: "B0G3P92VFK", title: "SG Super 50 White Cricket Ball", image: "https://m.media-amazon.com/images/I/51f0-pK7PwL._AC_UL320_.jpg", fit: "A white-ball option for limited-overs and day/night sessions." },
      { asin: "B0GM34HF3X", title: "PRO T-20 Hand-Stitched Leather Cricket Ball", image: "https://m.media-amazon.com/images/I/41TMpZEGZlL._AC_UL320_.jpg", fit: "A T20-oriented option for swing, seam and match-style drills." },
    ],
  },
];
