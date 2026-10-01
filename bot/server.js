const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const PORT = Number(process.env.PORT || 3000);
const TEAM_ID = "8626734";
const TEAM_URL = "https://cricheroes.com/team-profile/8626734/kurukshetra-warriors/members";
const SITE_URL = "https://crickuru.com";
const OPENAI_API_KEY = String(process.env.OPENAI_API_KEY || "").trim();
const OPENAI_MODEL = String(process.env.OPENAI_MODEL || "gpt-5.6-luna").trim();
const FEED_FILE = path.resolve(__dirname, "..", "data", "crickuru-live.json");
const SOCIAL_STORE_FILE = String(process.env.SOCIAL_STORE_FILE || path.resolve(__dirname, "data", "social.json"));
const GOOGLE_CLIENT_ID = String(process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || "").trim();
const SESSION_SECRET = String(process.env.SESSION_SECRET || "").trim();
const SESSION_COOKIE = "crickuru_social_session";
const SESSION_MAX_AGE = 30 * 24 * 60 * 60;
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

function asArray(value) {
  return Array.isArray(value) ? value : [];
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
  response.setHeader("access-control-allow-credentials", "true");
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
    coin: `${SITE_URL}/coin/`,
    sponsor: `${SITE_URL}/gt-gaming/`,
    cricHeroes: TEAM_URL,
  };
  if (/sponsor|gt gaming|gaming chair|gt throne|chair/.test(query)) return `GT Gaming sponsor page: ${links.sponsor}\nOfficial store: https://www.gtgaming.shop/`;
  if (/quiz|leaderboard|duel/.test(query)) return `CricKuru Quiz: ${links.quiz}`;
  if (/coin|kuru/.test(query)) return `Kuru Coin launch watch: ${links.coin}`;
  if (/india|international|domestic|state|live match|fixtures/.test(query)) return `India and domestic match centre: ${links.matches}`;
  if (/site|website|link|page|help|what can you do/.test(query)) return `I can help with Warriors players, career totals, recent form, synced matches, site pages and the GT Gaming sponsor.\nPlayers: ${links.players}\nMatches: ${links.matches}\nQuiz: ${links.quiz}`;
  return "";
}

function emptySocialStore() {
  return { users: [], friendRequests: [], conversations: [], messages: [] };
}

function readSocialStore() {
  try {
    const parsed = JSON.parse(fs.readFileSync(SOCIAL_STORE_FILE, "utf8"));
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      friendRequests: Array.isArray(parsed.friendRequests) ? parsed.friendRequests : [],
      conversations: Array.isArray(parsed.conversations) ? parsed.conversations : [],
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
    };
  } catch {
    return emptySocialStore();
  }
}

let socialStore = readSocialStore();

function saveSocialStore() {
  try {
    fs.mkdirSync(path.dirname(SOCIAL_STORE_FILE), { recursive: true });
    const temporary = `${SOCIAL_STORE_FILE}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(socialStore), "utf8");
    fs.renameSync(temporary, SOCIAL_STORE_FILE);
  } catch (error) {
    console.error("Unable to persist social data:", error.message);
  }
}

function id(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function friendCodeFor(userId) {
  const digest = crypto.createHash("sha256").update(String(userId)).digest("hex").slice(0, 8).toUpperCase();
  return `KW-${digest}`;
}

function publicUser(user) {
  if (!user) return null;
  return { id: user.id, name: user.name, email: user.email, avatar: user.avatar, friendCode: user.friendCode, createdAt: user.createdAt, lastSeenAt: user.lastSeenAt };
}

function cookieValue(request, name) {
  const header = String(request.headers.cookie || "");
  const match = header.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : "";
}

function signSession(userId) {
  if (!SESSION_SECRET) return "";
  const payload = Buffer.from(JSON.stringify({ userId, expiresAt: Date.now() + SESSION_MAX_AGE * 1000 })).toString("base64url");
  const signature = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function verifySession(request) {
  if (!SESSION_SECRET) return null;
  const token = cookieValue(request, SESSION_COOKIE);
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!parsed.userId || Number(parsed.expiresAt) < Date.now()) return null;
    return socialStore.users.find((user) => user.id === parsed.userId) || null;
  } catch {
    return null;
  }
}

function setSessionCookie(request, response, userId) {
  const token = signSession(userId);
  if (!token) return;
  const local = /localhost|127\.0\.0\.1/i.test(currentOrigin(request));
  response.setHeader("set-cookie", `${SESSION_COOKIE}=${encodeURIComponent(token)}; Max-Age=${SESSION_MAX_AGE}; Path=/; HttpOnly; ${local ? "SameSite=Lax" : "SameSite=None; Secure"}`);
}

function clearSessionCookie(request, response) {
  const local = /localhost|127\.0\.0\.1/i.test(currentOrigin(request));
  response.setHeader("set-cookie", `${SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; ${local ? "SameSite=Lax" : "SameSite=None; Secure"}`);
}

async function verifyGoogleCredential(credential) {
  if (!GOOGLE_CLIENT_ID) throw new Error("Google sign-in is not configured on the bot service.");
  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
  if (!response.ok) throw new Error("Google sign-in could not be verified.");
  const token = await response.json();
  if (token.aud !== GOOGLE_CLIENT_ID || token.email_verified !== "true") throw new Error("Use a verified Google account for CricKuru chat.");
  return token;
}

function authUser(request, response) {
  const user = verifySession(request);
  if (!user) send(request, response, 401, { error: "Google sign-in is required for player chat." });
  return user;
}

function areFriends(a, b) {
  return socialStore.friendRequests.some((request) => request.status === "accepted" && ((request.fromId === a && request.toId === b) || (request.fromId === b && request.toId === a)));
}

function conversationForMembers(type, members) {
  const sorted = [...new Set(members)].sort();
  return socialStore.conversations.find((conversation) => conversation.type === type && conversation.memberIds.length === sorted.length && conversation.memberIds.every((memberId) => sorted.includes(memberId)));
}

function publicConversation(conversation, userId) {
  const messages = socialStore.messages.filter((message) => message.conversationId === conversation.id).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const otherIds = conversation.memberIds.filter((memberId) => memberId !== userId);
  return {
    id: conversation.id,
    type: conversation.type,
    name: conversation.name,
    category: conversation.category || "general",
    memberIds: conversation.memberIds,
    members: conversation.memberIds.map((memberId) => publicUser(socialStore.users.find((user) => user.id === memberId))).filter(Boolean),
    lastMessage: messages.length ? { text: messages[messages.length - 1].text, createdAt: messages[messages.length - 1].createdAt, senderId: messages[messages.length - 1].senderId } : null,
    other: otherIds.length === 1 ? publicUser(socialStore.users.find((user) => user.id === otherIds[0])) : null,
    updatedAt: conversation.updatedAt,
  };
}

function socialSummary(user) {
  const accepted = socialStore.friendRequests.filter((request) => request.status === "accepted" && (request.fromId === user.id || request.toId === user.id));
  const friends = accepted.map((request) => socialStore.users.find((candidate) => candidate.id === (request.fromId === user.id ? request.toId : request.fromId))).filter(Boolean).map(publicUser);
  const incoming = socialStore.friendRequests.filter((request) => request.status === "pending" && request.toId === user.id).map((request) => ({ ...request, from: publicUser(socialStore.users.find((candidate) => candidate.id === request.fromId)) }));
  const outgoing = socialStore.friendRequests.filter((request) => request.status === "pending" && request.fromId === user.id).map((request) => ({ ...request, to: publicUser(socialStore.users.find((candidate) => candidate.id === request.toId)) }));
  const conversations = socialStore.conversations.filter((conversation) => conversation.memberIds.includes(user.id)).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).map((conversation) => publicConversation(conversation, user.id));
  return { user: publicUser(user), friends, incomingRequests: incoming, outgoingRequests: outgoing, conversations };
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
      warriors: `${SITE_URL}/warriors/`, players: `${SITE_URL}/players/`, matches: `${SITE_URL}/india-matches/`, quiz: `${SITE_URL}/quiz/`, coin: `${SITE_URL}/coin/`, sponsor: `${SITE_URL}/gt-gaming/`,
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
  return aiAnswer || "I can answer from CricKuru's synchronized CricHeroes data. Ask about a Warriors player, career totals, recent cross-team form, latest team matches, quiz or site links.";
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

async function handleSocialRequest(request, response, url) {
  if (request.method === "GET" && url.pathname === "/api/auth/session") {
    const user = verifySession(request);
    return send(request, response, 200, { user: publicUser(user) });
  }
  if (request.method === "POST" && url.pathname === "/api/auth/google") {
    try {
      const body = JSON.parse(await readBody(request));
      const token = await verifyGoogleCredential(cleanText(body.credential, 5000));
      const userId = `google-${cleanText(token.sub, 120)}`;
      let user = socialStore.users.find((candidate) => candidate.id === userId);
      if (!user) {
        user = { id: userId, name: cleanText(token.name || token.email?.split("@")[0] || "Warrior Player", 60), email: cleanText(token.email, 160), avatar: cleanText(token.picture, 500), friendCode: friendCodeFor(userId), createdAt: new Date().toISOString(), lastSeenAt: new Date().toISOString() };
        socialStore.users.push(user);
      } else {
        user.name = cleanText(token.name || user.name, 60) || user.name;
        user.email = cleanText(token.email || user.email, 160) || user.email;
        user.avatar = cleanText(token.picture || user.avatar, 500) || user.avatar;
        user.lastSeenAt = new Date().toISOString();
      }
      saveSocialStore();
      setSessionCookie(request, response, user.id);
      return send(request, response, 200, { user: publicUser(user), provider: "google" });
    } catch (error) {
      return send(request, response, 400, { error: error.message || "Google sign-in failed." });
    }
  }
  if (request.method === "POST" && url.pathname === "/api/auth/logout") {
    clearSessionCookie(request, response);
    return send(request, response, 200, { ok: true });
  }
  if (!url.pathname.startsWith("/api/social/")) return false;
  const user = authUser(request, response);
  if (!user) return true;
  user.lastSeenAt = new Date().toISOString();

  if (request.method === "GET" && url.pathname === "/api/social/summary") {
    return send(request, response, 200, socialSummary(user));
  }
  if (request.method === "POST" && url.pathname === "/api/social/friends/request") {
    try {
      const body = JSON.parse(await readBody(request));
      const code = cleanText(body.friendCode, 40).toUpperCase();
      const target = socialStore.users.find((candidate) => candidate.friendCode === code);
      if (!target) return send(request, response, 404, { error: "No player was found with that friend code." });
      if (target.id === user.id) return send(request, response, 400, { error: "Use another player's code." });
      if (areFriends(user.id, target.id)) return send(request, response, 409, { error: "You are already friends." });
      const existing = socialStore.friendRequests.find((item) => item.status === "pending" && ((item.fromId === user.id && item.toId === target.id) || (item.fromId === target.id && item.toId === user.id)));
      if (existing) return send(request, response, 409, { error: "A friend request is already pending." });
      const friendRequest = { id: id("friend"), fromId: user.id, toId: target.id, status: "pending", createdAt: new Date().toISOString() };
      socialStore.friendRequests.push(friendRequest);
      saveSocialStore();
      return send(request, response, 201, { request: friendRequest, target: publicUser(target) });
    } catch {
      return send(request, response, 400, { error: "Invalid friend request." });
    }
  }
  if (request.method === "POST" && url.pathname === "/api/social/friends/respond") {
    try {
      const body = JSON.parse(await readBody(request));
      const friendRequest = socialStore.friendRequests.find((item) => item.id === cleanText(body.requestId, 120) && item.toId === user.id && item.status === "pending");
      if (!friendRequest) return send(request, response, 404, { error: "Friend request not found." });
      const action = body.action === "accept" ? "accepted" : body.action === "decline" ? "declined" : "";
      if (!action) return send(request, response, 400, { error: "Choose accept or decline." });
      friendRequest.status = action;
      friendRequest.respondedAt = new Date().toISOString();
      saveSocialStore();
      return send(request, response, 200, { request: friendRequest });
    } catch {
      return send(request, response, 400, { error: "Invalid friend response." });
    }
  }
  if (request.method === "POST" && url.pathname === "/api/social/conversations") {
    try {
      const body = JSON.parse(await readBody(request));
      const type = body.type === "group" ? "group" : "direct";
      const category = ["general", "matchday", "training", "team"].includes(body.category) ? body.category : "general";
      let memberIds = type === "direct" ? [user.id, cleanText(body.friendId, 120)] : [user.id, ...asArray(body.memberIds).map((memberId) => cleanText(memberId, 120))];
      memberIds = [...new Set(memberIds)].filter((memberId) => socialStore.users.some((candidate) => candidate.id === memberId));
      if (type === "direct" && (memberIds.length !== 2 || !areFriends(user.id, memberIds.find((memberId) => memberId !== user.id)))) return send(request, response, 403, { error: "You can chat directly with accepted friends only." });
      if (type === "group" && (memberIds.length < 2 || memberIds.some((memberId) => memberId !== user.id && !areFriends(user.id, memberId)))) return send(request, response, 403, { error: "Add accepted friends to a group." });
      let conversation = conversationForMembers(type, memberIds);
      if (!conversation) {
        conversation = { id: id("conversation"), type, name: cleanText(body.name, 80) || (type === "direct" ? "Player chat" : "Warriors group"), category, memberIds: memberIds.sort(), createdBy: user.id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        socialStore.conversations.push(conversation);
        saveSocialStore();
      }
      return send(request, response, 201, { conversation: publicConversation(conversation, user.id) });
    } catch {
      return send(request, response, 400, { error: "Invalid conversation details." });
    }
  }
  if (request.method === "GET" && url.pathname === "/api/social/conversations") {
    return send(request, response, 200, { conversations: socialStore.conversations.filter((conversation) => conversation.memberIds.includes(user.id)).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).map((conversation) => publicConversation(conversation, user.id)) });
  }
  const conversationMatch = url.pathname.match(/^\/api\/social\/conversations\/([^/]+)(?:\/messages)?$/);
  if (conversationMatch && url.pathname.endsWith("/messages") && request.method === "GET") {
    const conversation = socialStore.conversations.find((item) => item.id === conversationMatch[1] && item.memberIds.includes(user.id));
    if (!conversation) return send(request, response, 404, { error: "Conversation not found." });
    const since = Number(url.searchParams.get("since") || 0);
    const messages = socialStore.messages.filter((message) => message.conversationId === conversation.id && (!since || new Date(message.createdAt).getTime() > since)).slice(-120);
    return send(request, response, 200, { messages });
  }
  if (conversationMatch && url.pathname.endsWith("/messages") && request.method === "POST") {
    try {
      const conversation = socialStore.conversations.find((item) => item.id === conversationMatch[1] && item.memberIds.includes(user.id));
      if (!conversation) return send(request, response, 404, { error: "Conversation not found." });
      const body = JSON.parse(await readBody(request));
      const text = cleanText(body.text, 1000);
      if (!text) return send(request, response, 400, { error: "Message cannot be empty." });
      const message = { id: id("message"), conversationId: conversation.id, senderId: user.id, senderName: user.name, senderAvatar: user.avatar, text, createdAt: new Date().toISOString() };
      socialStore.messages.push(message);
      conversation.updatedAt = message.createdAt;
      saveSocialStore();
      return send(request, response, 201, { message });
    } catch {
      return send(request, response, 400, { error: "Invalid message." });
    }
  }
  return send(request, response, 404, { error: "Social route not found." });
}

const server = http.createServer(async (request, response) => {
  if (!clientAllowed(request)) return send(request, response, 403, { error: "Origin not allowed" });
  if (request.method === "OPTIONS") return send(request, response, 204, {});
  if (rateLimited(request)) return send(request, response, 429, { error: "Too many requests. Try again shortly." });

  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  if (request.method === "GET" && url.pathname === "/health") {
    return send(request, response, 200, { ok: true, service: "crickuru-bot-api", teamId: TEAM_ID });
  }
  const socialResult = await handleSocialRequest(request, response, url);
  if (socialResult !== false) return socialResult;
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
