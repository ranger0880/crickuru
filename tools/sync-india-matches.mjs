import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const OUTPUT_FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../data/india-matches.json");

const PAGES = {
  live: "https://www.cricbuzz.com/cricket-match/live-scores",
  upcoming: "https://www.cricbuzz.com/cricket-match/live-scores/upcoming-matches",
  recent: "https://www.cricbuzz.com/cricket-match/live-scores/recent-matches",
};

const LEVELS = [
  { id: "international", label: "International", order: 1 },
  { id: "league", label: "League / IPL", order: 2 },
  { id: "women", label: "Women", order: 3 },
  { id: "domestic", label: "Domestic / State", order: 4 },
];

const STATUS_LABELS = {
  live: "Live",
  recent: "Past",
  upcoming: "Future",
};

const INDIA_TERMS = [
  "india",
  "ind ",
  "indw",
  "bharat",
  "ipl",
  "wpl",
  "ranji",
  "duleep",
  "irani",
  "vijay hazare",
  "syed mushtaq",
  "deodhar",
  "bcci",
  "mumbai indians",
  "chennai super kings",
  "royal challengers",
  "kolkata knight riders",
  "delhi capitals",
  "sunrisers hyderabad",
  "rajasthan royals",
  "gujarat titans",
  "punjab kings",
  "lucknow super giants",
  "up warriorz",
  "mumbai",
  "delhi",
  "karnataka",
  "tamil nadu",
  "maharashtra",
  "uttar pradesh",
  "baroda",
  "saurashtra",
  "vidarbha",
  "bengal",
  "punjab",
  "haryana",
  "rajasthan",
  "kerala",
  "hyderabad",
  "andhra",
  "assam",
  "bihar",
  "chhattisgarh",
  "goa",
  "gujarat",
  "himachal",
  "jharkhand",
  "madhya pradesh",
  "manipur",
  "meghalaya",
  "mizoram",
  "nagaland",
  "odisha",
  "pondicherry",
  "railways",
  "services",
  "tripura",
  "uttarakhand",
];

async function fetchPage(status, url) {
  const response = await fetch(url, {
    headers: {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "en-IN,en;q=0.9",
      "cache-control": "no-cache",
      pragma: "no-cache",
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "none",
      "upgrade-insecure-requests": "1",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    },
  });

  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }

  const html = await response.text();
  const flightText = extractFlightText(html);
  const matchesLists = extractAllJsonValues(flightText, "matchesList");

  return matchesLists
    .flatMap((list) => list?.matches || [])
    .map((entry) => normalizeCricbuzzMatch(entry, status, url))
    .filter(Boolean);
}

function extractFlightText(html) {
  const chunks = [];
  const regex = /self\.__next_f\.push\(\[1,"((?:\\.|[^"\\])*)"\]\)<\/script>/g;
  let match;

  while ((match = regex.exec(html))) {
    try {
      chunks.push(JSON.parse(`"${match[1]}"`));
    } catch {
      // Ignore framework chunks that do not decode cleanly.
    }
  }

  return chunks.join("\n");
}

function extractAllJsonValues(text, key) {
  const values = [];
  let startAt = 0;

  while (startAt < text.length) {
    const result = extractJsonValue(text, key, startAt);
    if (!result) break;
    values.push(result.value);
    startAt = result.end + 1;
  }

  return values;
}

function extractJsonValue(text, key, startAt = 0) {
  const marker = `"${key}":`;
  const markerIndex = text.indexOf(marker, startAt);
  if (markerIndex < 0) return null;

  let index = markerIndex + marker.length;
  while (/\s/.test(text[index])) index += 1;

  const open = text[index];
  const close = open === "{" ? "}" : open === "[" ? "]" : null;
  if (!close) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let cursor = index; cursor < text.length; cursor += 1) {
    const char = text[cursor];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
    } else if (char === open) {
      depth += 1;
    } else if (char === close) {
      depth -= 1;
      if (depth === 0) {
        return { value: JSON.parse(text.slice(index, cursor + 1)), end: cursor };
      }
    }
  }

  return null;
}

function normalizeCricbuzzMatch(entry, pageStatus, listUrl) {
  const match = entry?.match || entry;
  const info = match?.matchInfo || entry?.matchInfo;
  if (!info?.matchId) return null;

  const status = statusForMatch(info, pageStatus);
  const level = levelForMatch(info);
  const title = clean(`${info.team1?.teamName || "Team 1"} vs ${info.team2?.teamName || "Team 2"}, ${info.matchDesc || ""}`);
  const startTime = normalizeTimestamp(info.startDate);

  return {
    id: `${status}-${info.matchId}`,
    status,
    statusLabel: STATUS_LABELS[status] || status,
    level,
    levelLabel: LEVELS.find((item) => item.id === level)?.label || level,
    sourceType: info.matchType || "",
    title,
    series: clean(info.seriesName || ""),
    teams: [
      normalizeTeam(info.team1, match.matchScore?.team1Score),
      normalizeTeam(info.team2, match.matchScore?.team2Score),
    ].filter((team) => team.name),
    dateLabel: formatDateLabel(startTime),
    time: "",
    place: clean([info.venueInfo?.ground, info.venueInfo?.city].filter(Boolean).join(", ")),
    overview: clean(info.status || info.shortStatus || info.stateTitle || info.state || ""),
    sourceUrl: `https://www.cricbuzz.com/live-cricket-scores/${info.matchId}`,
    listUrl,
    startTime,
    rawId: info.matchId,
  };
}

function statusForMatch(info, pageStatus) {
  const state = clean(`${info.state || ""} ${info.stateTitle || ""} ${info.status || ""}`).toLowerCase();
  if (/in progress|innings break|stumps|lunch|tea|rain delay|delayed|need \d+|trail by|lead by/.test(state)) return "live";
  if (/preview|starts at|starts in|toss|fixture/.test(state)) return "upcoming";
  if (/complete|won|draw|abandon|no result|stumps/.test(state)) return "recent";
  return pageStatus;
}

function levelForMatch(info) {
  const text = searchableInfo(info);
  if (/\bwomen\b|\bwpl\b|\bindw\b/.test(text)) return "women";
  if (/\bipl\b|indian premier league|league/.test(text)) return "league";
  if (clean(info.matchType).toLowerCase() === "international") return "international";
  return "domestic";
}

function normalizeTeam(team, score) {
  return {
    name: clean(team?.teamName || ""),
    shortName: clean(team?.teamSName || ""),
    score: formatTeamScore(score),
  };
}

function formatTeamScore(score) {
  if (!score) return "";
  return Object.values(score)
    .filter(Boolean)
    .sort((a, b) => Number(a.inningsId || 0) - Number(b.inningsId || 0))
    .map((innings) => {
      const wickets = innings.wickets == null ? "" : `/${innings.wickets}`;
      const overs = innings.overs == null ? "" : ` (${innings.overs} Ov)`;
      return `${innings.runs ?? ""}${wickets}${overs}`.trim();
    })
    .filter(Boolean)
    .join(" & ");
}

function isIndiaRelevant(match) {
  const text = searchableMatch(match);
  if (/\bindia\b|\bind\b|\bindw\b/.test(text)) return true;
  if (match.level === "league" && /\b(ipl|wpl|mumbai indians|chennai super kings|royal challengers|kolkata knight riders|delhi capitals|sunrisers hyderabad|rajasthan royals|gujarat titans|punjab kings|lucknow super giants)\b/.test(text)) return true;
  if (match.level === "domestic") return INDIA_TERMS.some((term) => text.includes(term));
  return INDIA_TERMS.some((term) => text.includes(term));
}

function searchableInfo(info) {
  return clean(`${info.seriesName || ""} ${info.matchDesc || ""} ${info.matchType || ""} ${info.team1?.teamName || ""} ${info.team2?.teamName || ""} ${info.status || ""}`).toLowerCase();
}

function searchableMatch(match) {
  const teams = (match.teams || []).map((team) => `${team.name} ${team.shortName} ${team.score}`).join(" ");
  return clean(`${match.title} ${match.series} ${match.overview} ${match.place} ${teams}`).toLowerCase();
}

function clean(value) {
  return String(value || "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTimestamp(value) {
  const timestamp = Number(value || 0);
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function formatDateLabel(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function uniqueMatches(matches) {
  const priority = { live: 3, upcoming: 2, recent: 1 };
  const byId = new Map();

  for (const match of matches) {
    const existing = byId.get(match.rawId);
    if (!existing || priority[match.status] > priority[existing.status]) {
      byId.set(match.rawId, match);
    }
  }

  return [...byId.values()];
}

function sortMatches(matches) {
  return [...matches].sort((a, b) => {
    const dateA = Date.parse(a.startTime || "");
    const dateB = Date.parse(b.startTime || "");
    if (Number.isNaN(dateA) || Number.isNaN(dateB)) return a.title.localeCompare(b.title);
    return dateA - dateB;
  });
}

function buildRankings(groups) {
  return LEVELS.map((level) => {
    const live = groups.live.filter((match) => match.level === level.id).length;
    const recent = groups.recent.filter((match) => match.level === level.id).length;
    const upcoming = groups.upcoming.filter((match) => match.level === level.id).length;
    return {
      id: level.id,
      label: level.label,
      order: level.order,
      live,
      recent,
      upcoming,
      total: live + recent + upcoming,
    };
  });
}

async function readPreviousFeed() {
  try {
    return JSON.parse(await fs.readFile(OUTPUT_FILE, "utf8"));
  } catch {
    return null;
  }
}

async function writeFeed(feed) {
  await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
  await fs.writeFile(OUTPUT_FILE, `${JSON.stringify(feed, null, 2)}\n`, "utf8");
}

async function main() {
  const previous = await readPreviousFeed();
  const settled = await Promise.allSettled(Object.entries(PAGES).map(([status, url]) => fetchPage(status, url)));
  const failures = settled.filter((result) => result.status === "rejected").map((result) => result.reason?.message || String(result.reason));
  const fetched = settled.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  const relevant = uniqueMatches(fetched.filter(isIndiaRelevant));

  if (!relevant.length && failures.length && previous) {
    await writeFeed({
      ...previous,
      syncedAt: new Date().toISOString(),
      sourceStatus: "stale",
      errors: failures.slice(0, 8),
    });
    console.log(`Kept previous India feed because Cricbuzz returned no relevant matches. ${failures.length} errors.`);
    return;
  }

  const groups = {
    live: sortMatches(relevant.filter((match) => match.status === "live")),
    upcoming: sortMatches(relevant.filter((match) => match.status === "upcoming")),
    recent: sortMatches(relevant.filter((match) => match.status === "recent")).reverse(),
  };

  const feed = {
    schemaVersion: 1,
    source: "Cricbuzz public match pages",
    sourceStatus: failures.length ? "partial" : "fresh",
    syncedAt: new Date().toISOString(),
    summary: {
      live: groups.live.length,
      recent: groups.recent.length,
      upcoming: groups.upcoming.length,
      total: relevant.length,
    },
    all: [...groups.live, ...groups.upcoming, ...groups.recent],
    live: groups.live,
    upcoming: groups.upcoming,
    recent: groups.recent,
    rankings: buildRankings(groups),
    errors: failures.slice(0, 8),
  };

  await writeFeed(feed);
  console.log(`Synced ${feed.summary.total} India-relevant matches: ${feed.summary.live} live, ${feed.summary.upcoming} upcoming, ${feed.summary.recent} past.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
