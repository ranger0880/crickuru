const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const PORT = Number(process.env.PORT || 3000);
const TEAM_ID = "8626734";
const TEAM_URL = "https://cricheroes.com/team-profile/8626734/kurukshetra-warriors/members";
const SITE_URL = "https://crickuru.com";
const OPENAI_API_KEY = String(process.env.OPENAI_API_KEY || "").trim();
const OPENAI_MODEL = String(process.env.OPENAI_MODEL || "gpt-5.6-luna").trim();
const FEED_FILE = path.resolve(__dirname, "..", "data", "crickuru-live.json");
const allowedOrigins = new Set(
  String(process.env.CORS_ORIGINS || "https://crickuru.com,https://www.crickuru.com,http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);
const rateLimit = new Map();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_REQUESTS = 60;

function readFeed() {
  try {
    return JSON.parse(fs.readFileSync(FEED_FILE, "utf8"));
  } catch (error) {
    console.error("Unable to read synchronized CricKuru data:", error.message);
    return null;
  }
}

function cleanText(value, limit = 280) {
  return String(value || "").replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, limit);
}

function currentOrigin(request) {
  return cleanText(request.headers.origin, 200);
}

function applyHeaders(request, response) {
  const origin = currentOrigin(request);
  if (allowedOrigins.has(origin)) response.setHeader("access-control-allow-origin", origin);
  response.setHeader("vary", "Origin");
  response.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
  response.setHeader("access-control-allow-headers", "content-type");
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("x-content-type-options", "nosniff");
  response.setHeader("referrer-policy", "no-referrer");
  response.setHeader("cache-control", "no-store");
}

function send(request, response, status, payload) {
  applyHeaders(request, response);
  response.writeHead(status);
  response.end(JSON.stringify(payload));
}

function clientAllowed(request) {
  const origin = currentOrigin(request);
  return !origin || allowedOrigins.has(origin);
}

function rateLimited(request) {
  const address = request.socket.remoteAddress || "unknown";
  const now = Date.now();
  const previous = rateLimit.get(address);
  if (!previous || now - previous.startedAt >= RATE_WINDOW_MS) {
    rateLimit.set(address, { startedAt: now, count: 1 });
    return false;
  }
  previous.count += 1;
  return previous.count > RATE_MAX_REQUESTS;
}

function extractPlayerId(value) {
  try {
    const url = new URL(String(value || ""));
    if (url.protocol !== "https:" || !/(^|\.)cricheroes\.com$/i.test(url.hostname)) return "";
    return url.pathname.match(/\/player-profile\/(\d+)/i)?.[1] || url.pathname.match(/\/player\/(\d+)/i)?.[1] || "";
  } catch {
    return "";
  }
}

function recentMatches(player, limit = 6) {
  const matches = [...(Array.isArray(player?.recentMatches) ? player.recentMatches : []), ...(Array.isArray(player?.matchHistory) ? player.matchHistory : [])];
  const seen = new Set();
  return matches
    .filter((match) => {
      const key = String(match?.id || match?.scorecardUrl || `${match?.date}-${match?.teamA}-${match?.teamB}`);
      if (!match || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
    .slice(0, limit);
}

function publicMatch(match) {
  return {
    id: match.id,
    date: match.date,
    teamA: cleanText(match.teamA, 120),
    teamB: cleanText(match.teamB, 120),
    resultText: cleanText(match.resultText, 220),
    teamAScore: cleanText(match.teamAScore, 80),
    teamBScore: cleanText(match.teamBScore, 80),
    scorecardUrl: match.performance?.scorecardUrl || match.scorecardUrl || "",
    performance: match.performance
      ? {
          teamName: cleanText(match.performance.teamName, 120),
          opponent: cleanText(match.performance.opponent, 120),
          runs: Number(match.performance.runs || 0),
          wickets: Number(match.performance.wickets || 0),
          highlight: cleanText(match.performance.highlight, 180),
        }
      : null,
  };
}

function publicPlayer(player) {
  return {
    id: String(player.id),
    name: cleanText(player.name, 120),
    role: cleanText(player.role, 120),
    photo: cleanText(player.photo, 500),
    impact: Number(player.impact || 0),
    stats: player.overallStats || player.stats || {},
    profileUrl: cleanText(player.profileUrl, 500),
    statsUrl: cleanText(player.statsUrl, 500),
    matchesUrl: cleanText(player.matchesUrl, 500),
    recentMatches: recentMatches(player).map(publicMatch),
  };
}

function findPlayer(feed, playerIdOrName) {
  const query = cleanText(playerIdOrName, 120).toLowerCase();
  return (feed?.players || []).find((player) => String(player.id) === query || cleanText(player.name, 120).toLowerCase() === query);
}

function matchSummary(match) {
  const performance = match.performance?.highlight ? `; ${match.performance.highlight}` : "";
  return `${match.teamA} vs ${match.teamB} on ${new Date(match.date).toLocaleDateString("en-IN")}${performance}`;
}

function siteLinkAnswer(query) {
  const links = {
    home: `${SITE_URL}/`,
    warriors: `${SITE_URL}/warriors/`,
    players: `${SITE_URL}/players/`,
    matches: `${SITE_URL}/india-matches/`,
    quiz: `${SITE_URL}/quiz/`,
    arena: `${SITE_URL}/arena/`,
    memes: `${SITE_URL}/memes/`,
    coin: `${SITE_URL}/coin/`,
    sponsor: `${SITE_URL}/gt-gaming/`,
    cricHeroes: TEAM_URL,
  };
  if (/sponsor|gt gaming|gaming chair|gt throne|chair/.test(query)) return `GT Gaming sponsor page: ${links.sponsor}\nOfficial store: https://www.gtgaming.shop/`;
  if (/quiz|leaderboard|duel/.test(query)) return `CricKuru Quiz: ${links.quiz}`;
  if (/arena|game|toss|batting|bowling/.test(query)) return `CricKuru Arena: ${links.arena}`;
  if (/meme/.test(query)) return `CricKuru Meme Forge: ${links.memes}`;
  if (/coin|kuru/.test(query)) return `Kuru Coin launch watch: ${links.coin}`;
  if (/india|international|domestic|state|live match|fixtures/.test(query)) return `India and domestic match centre: ${links.matches}`;
  if (/site|website|link|page|help|what can you do/.test(query)) return `I can help with Warriors players, career totals, recent form, synced matches, site pages and the GT Gaming sponsor.\nPlayers: ${links.players}\nMatches: ${links.matches}\nQuiz: ${links.quiz}\nArena: ${links.arena}`;
  return "";
}

function aiContext(feed) {
  const players = (feed?.players || []).map((player) => {
    const stats = player.overallStats || player.stats || {};
    return { id: String(player.id), name: player.name, role: player.role, runs: Number(stats.runs || 0), wickets: Number(stats.wickets || 0), matches: Number(stats.matches || 0), best: Number(stats.best || 0), impact: Number(player.impact || 0) };
  });
  const matches = (feed?.recentMatches || feed?.matches || []).slice(0, 12).map((match) => ({
    date: match.date,
    teams: [match.teamA, match.teamB],
    result: match.resultText,
    scores: [match.teamAScore, match.teamBScore],
    scorecardUrl: match.performance?.scorecardUrl || match.scorecardUrl || "",
  }));
  return JSON.stringify({
    site: SITE_URL,
    team: "Kurukshetra Warriors",
    captain: "Ankit Kulshreshtha",
    CricHeroes: { teamUrl: "https://cricheroes.com/team-profile/8626734/kurukshetra-warriors", matchesUrl: "https://cricheroes.com/team-profile/8626734/kurukshetra-warriors/matches", membersUrl: TEAM_URL },
    syncedAt: feed?.syncedAt || feed?.lastCheckedAt || "",
    playerCount: players.length,
    players,
    recentMatches: matches,
    sitePages: {
      warriors: `${SITE_URL}/warriors/`, players: `${SITE_URL}/players/`, matches: `${SITE_URL}/india-matches/`, quiz: `${SITE_URL}/quiz/`, arena: `${SITE_URL}/arena/`, memes: `${SITE_URL}/memes/`, coin: `${SITE_URL}/coin/`, sponsor: `${SITE_URL}/gt-gaming/`,
    },
  });
}

async function askOpenAI(feed, message) {
  if (!OPENAI_API_KEY) return "";
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { authorization: `Bearer ${OPENAI_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      store: false,
      instructions: "You are CricKuru Bot for the Kurukshetra Warriors WhatsApp group. Answer only using the supplied CricKuru data and links. Be concise, friendly and useful for a team group. Never invent scores, player stats, schedules or claims. Say when data is not available. You are read-only: never claim to register users, change the website, edit scores, access private accounts, or perform admin actions. Keep replies under 900 characters.",
      input: `CricKuru data:\n${aiContext(feed)}\n\nTeam member question:\n${message}`,
      max_output_tokens: 300,
    }),
  });
  if (!response.ok) throw new Error(`AI request failed with ${response.status}`);
  const payload = await response.json();
  const text = payload.output_text || payload.output?.flatMap((item) => item.content || []).map((item) => item.text || "").join(" ") || "";
  return cleanText(text, 900);
}

async function answerChat(feed, message) {
  const query = message.toLowerCase();
  const mentionedPlayer = (feed?.players || []).find((player) => query.includes(cleanText(player.name, 120).toLowerCase()));
  if (mentionedPlayer) {
    const stats = mentionedPlayer.overallStats || mentionedPlayer.stats || {};
    const matches = recentMatches(mentionedPlayer, 3);
    const recent = matches.length ? matches.map(matchSummary).join(" | ") : "No recent public match record is available yet.";
    const answer = `${mentionedPlayer.name}: ${stats.runs || 0} career runs, ${stats.wickets || 0} wickets across ${stats.matches || 0} matches. Recent form across teams: ${recent}`;
    return answer.slice(0, 1200);
  }
  if (/recent|latest|last match|form|score/.test(query)) {
    const matches = (feed?.recentMatches || feed?.matches || []).slice(0, 3);
    return matches.length ? `Latest synced Warriors matches: ${matches.map(matchSummary).join(" | ")}` : "No recent match records are available in the current sync.";
  }
  if (/team|roster|members|warriors|players/.test(query)) {
    return `Kurukshetra Warriors currently has ${feed?.players?.length || 0} synced players. I can show a player's career totals or recent form across teams.`;
  }
  const siteAnswer = siteLinkAnswer(query);
  if (siteAnswer) return siteAnswer;
  const aiAnswer = await askOpenAI(feed, message);
  return aiAnswer || "I can answer from CricKuru's synchronized CricHeroes data. Ask about a Warriors player, career totals, recent cross-team form, latest team matches, quiz, arena, memes or site links.";
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 32_000) reject(new Error("Request body too large"));
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

const server = http.createServer(async (request, response) => {
  if (!clientAllowed(request)) return send(request, response, 403, { error: "Origin not allowed" });
  if (request.method === "OPTIONS") return send(request, response, 204, {});
  if (rateLimited(request)) return send(request, response, 429, { error: "Too many requests. Try again shortly." });

  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  if (request.method === "GET" && url.pathname === "/health") {
    return send(request, response, 200, { ok: true, service: "crickuru-bot-api", teamId: TEAM_ID });
  }
  const feed = readFeed();
  if (!feed) return send(request, response, 503, { error: "CricKuru data is temporarily unavailable" });

  if (request.method === "GET" && url.pathname === `/api/team/${TEAM_ID}`) {
    return send(request, response, 200, {
      teamId: TEAM_ID,
      teamName: "Kurukshetra Warriors",
      sourceUrl: TEAM_URL,
      syncedAt: feed.syncedAt || "",
      players: (feed.players || []).map(publicPlayer),
    });
  }
  if (request.method === "GET" && url.pathname === "/api/stats") {
    const playerId = extractPlayerId(url.searchParams.get("url"));
    const player = findPlayer(feed, playerId);
    if (!playerId) return send(request, response, 400, { error: "Use a valid HTTPS CricHeroes player-profile URL" });
    if (!player) return send(request, response, 404, { error: "Player is not in the synchronized Warriors roster yet" });
    return send(request, response, 200, publicPlayer(player));
  }
  if (request.method === "POST" && url.pathname === "/api/chat") {
    try {
      const body = JSON.parse(await readBody(request));
      const message = cleanText(body.message, 500);
      if (!message) return send(request, response, 400, { error: "Message is required" });
      return send(request, response, 200, { answer: await answerChat(feed, message), syncedAt: feed.syncedAt || "" });
    } catch (error) {
      return send(request, response, 400, { error: error.message === "Request body too large" ? error.message : "Invalid JSON body" });
    }
  }
  return send(request, response, 404, { error: "Not found" });
});

server.listen(PORT, () => console.log(`CricKuru Bot API listening on port ${PORT}`));

if (process.env.WHATSAPP_ENABLED === "true") {
  import("./whatsapp.mjs")
    .then(({ startWhatsAppBot }) => startWhatsAppBot())
    .catch((error) => console.error("WhatsApp adapter failed to start:", error));
}
