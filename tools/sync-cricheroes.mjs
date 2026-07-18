import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TEAM_ID = 8626734;
const TEAM_SLUG = "kurukshetra-warriors";
const TEAM_NAME = "Kurukshetra Warriors";
const BASE_URL = `https://cricheroes.com/team-profile/${TEAM_ID}/${TEAM_SLUG}`;
const OUTPUT_FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../data/crickuru-live.json");

const HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "accept-language": "en-US,en;q=0.9",
};

async function fetchFlightText(url) {
  const response = await fetch(url, { headers: HEADERS });
  if (!response.ok) {
    throw new Error(`CricHeroes returned ${response.status} for ${url}`);
  }

  const html = await response.text();
  const chunks = [];
  const regex = /self\.__next_f\.push\(\[1,"((?:\\.|[^"\\])*)"\]\)<\/script>/g;
  let match;

  while ((match = regex.exec(html))) {
    try {
      chunks.push(JSON.parse(`"${match[1]}"`));
    } catch {
      // Ignore malformed framework chunks. The useful data is duplicated across other chunks.
    }
  }

  return chunks.join("\n");
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
        return JSON.parse(text.slice(index, cursor + 1));
      }
    }
  }

  return null;
}

function normalizeDate(value) {
  if (!value) return "";
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function scoreFor(match, side) {
  const isA = side === "a";
  return {
    teamId: Number(isA ? match.team_a_id : match.team_b_id),
    team: isA ? match.team_a : match.team_b,
    logo: isA ? match.team_a_logo : match.team_b_logo,
    score: isA ? match.team_a_summary : match.team_b_summary,
    innings: isA ? match.team_a_innings || [] : match.team_b_innings || [],
  };
}

function buildMatches(rawMatches) {
  return rawMatches.map((match) => {
    const ourSide = Number(match.team_a_id) === TEAM_ID ? "a" : "b";
    const opponentSide = ourSide === "a" ? "b" : "a";
    const ours = scoreFor(match, ourSide);
    const opponent = scoreFor(match, opponentSide);
    const winningTeamId = Number(match.winning_team_id || 0);
    const result = winningTeamId === TEAM_ID ? "win" : winningTeamId ? "loss" : match.status || "scheduled";

    return {
      id: match.match_id,
      status: match.status,
      date: normalizeDate(match.match_start_time || match.created_date),
      matchType: match.match_type,
      ballType: match.ball_type,
      overs: match.overs,
      venue: match.ground_name?.trim() || match.city_name || "",
      city: match.city_name || "",
      opponentId: opponent.teamId,
      opponent: opponent.team,
      opponentLogo: opponent.logo,
      ourScore: ours.score || "-",
      opponentScore: opponent.score || "-",
      ourRunRate: ours.innings?.[0]?.summary?.rr || "",
      opponentRunRate: opponent.innings?.[0]?.summary?.rr || "",
      result,
      resultText: match.match_summary?.summary || match.win_by || match.match_result || match.status,
      toss: match.toss_details || "",
      cricHeroesUrl: `${BASE_URL}/matches`,
      awards: {
        playerOfMatch: Number(match.pom_player_id || 0),
        fielderOfMatch: Number(match.fom_player_id || 0),
        bestBatter: Number(match.bba_player_id || 0),
        bestBowler: Number(match.bbo_player_id || 0),
      },
    };
  });
}

function normalizeMembers(rawMembers) {
  const members = Array.isArray(rawMembers?.data?.members) ? rawMembers.data.members : [];
  return members.map((player) => ({
    id: player.player_id,
    name: player.name,
    photo: player.profile_photo,
    skill: player.player_skill || "",
    isVerified: Boolean(player.is_verified),
    isCaptain: Boolean(player.is_captain),
    isAdmin: Boolean(player.is_admin),
    isPro: Boolean(player.is_player_pro),
    batterCategory: player.batter_category || "",
    batterCategoryInfo: player.batter_category_info || "",
    bowlerCategory: player.bowler_category || "",
    bowlerCategoryInfo: player.bowler_category_info || "",
    badges: [
      player.is_captain ? "Captain" : "",
      player.is_player_pro ? "Pro" : "",
      player.is_verified ? "Verified" : "",
      player.batter_category || "",
      player.bowler_category || "",
    ].filter(Boolean),
    performance: {
      playerOfMatch: 0,
      fielderOfMatch: 0,
      bestBatter: 0,
      bestBowler: 0,
      recentAwards: [],
    },
  }));
}

function addAward(player, label, match) {
  player.performance[label.key] += 1;
  player.performance.recentAwards.push({
    label: label.text,
    matchId: match.id,
    opponent: match.opponent,
    date: match.date,
  });
}

function attachAwards(players, matches) {
  const byId = new Map(players.map((player) => [Number(player.id), player]));
  const labels = [
    { key: "playerOfMatch", text: "Player of the Match" },
    { key: "fielderOfMatch", text: "Fielder of the Match" },
    { key: "bestBatter", text: "Best Batter" },
    { key: "bestBowler", text: "Best Bowler" },
  ];

  const opponentAwards = [];

  for (const match of matches) {
    for (const label of labels) {
      const playerId = Number(match.awards?.[label.key] || 0);
      if (!playerId) continue;

      const player = byId.get(playerId);
      if (player) {
        addAward(player, label, match);
      } else {
        opponentAwards.push({
          playerId,
          label: label.text,
          opponent: match.opponent,
          matchId: match.id,
          date: match.date,
        });
      }
    }
  }

  for (const player of players) {
    const totalAwards =
      player.performance.playerOfMatch +
      player.performance.fielderOfMatch +
      player.performance.bestBatter +
      player.performance.bestBowler;

    player.performance.awards = totalAwards;
    if (player.performance.playerOfMatch) player.badges.unshift("Match Winner");
    if (player.performance.bestBatter) player.badges.unshift("Form Batter");
    if (player.performance.bestBowler) player.badges.unshift("Strike Bowler");
  }

  return opponentAwards;
}

function buildOpponents(matches, opponentAwards) {
  const opponents = new Map();

  for (const match of matches) {
    if (!opponents.has(match.opponentId)) {
      opponents.set(match.opponentId, {
        id: match.opponentId,
        name: match.opponent,
        logo: match.opponentLogo,
        matches: 0,
        winsAgainstUs: 0,
        lossesAgainstUs: 0,
        lastScore: "",
        lastResult: "",
        lastPlayed: "",
        awards: [],
        badges: [],
      });
    }

    const opponent = opponents.get(match.opponentId);
    opponent.matches += 1;
    opponent.lastScore = match.opponentScore;
    opponent.lastResult = match.result === "win" ? "Lost to Warriors" : match.result === "loss" ? "Beat Warriors" : match.status;
    opponent.lastPlayed = match.date;
    if (match.result === "loss") opponent.winsAgainstUs += 1;
    if (match.result === "win") opponent.lossesAgainstUs += 1;
  }

  for (const award of opponentAwards) {
    const opponent = [...opponents.values()].find((item) => item.name === award.opponent);
    if (opponent) {
      opponent.awards.push(award);
    }
  }

  for (const opponent of opponents.values()) {
    if (opponent.winsAgainstUs) opponent.badges.push("Danger Side");
    if (opponent.awards.length) opponent.badges.push("Award Threat");
    if (opponent.matches > 1) opponent.badges.push("Repeat Rival");
  }

  return [...opponents.values()].sort((a, b) => b.matches - a.matches || b.winsAgainstUs - a.winsAgainstUs);
}

function summarize(matches) {
  const wins = matches.filter((match) => match.result === "win").length;
  const losses = matches.filter((match) => match.result === "loss").length;
  const latest = matches[0];

  return {
    matches: matches.length,
    wins,
    losses,
    winRate: matches.length ? Math.round((wins / matches.length) * 100) : 0,
    latestResult: latest?.resultText || "",
    latestOpponent: latest?.opponent || "",
  };
}

async function main() {
  const [matchesText, membersText] = await Promise.all([
    fetchFlightText(`${BASE_URL}/matches`),
    fetchFlightText(`${BASE_URL}/members`),
  ]);

  const teamDetails = extractJsonValue(matchesText, "teamDetails");
  const rawMatches = extractJsonValue(matchesText, "matches")?.data || [];
  const rawMembers = extractJsonValue(membersText, "members", membersText.indexOf("\"teamDetails\"")) || extractJsonValue(membersText, "members");

  const matches = buildMatches(rawMatches);
  const players = normalizeMembers(rawMembers);
  const opponentAwards = attachAwards(players, matches);
  const opponents = buildOpponents(matches, opponentAwards);

  const feed = {
    schemaVersion: 1,
    source: "CricHeroes public team pages",
    syncedAt: new Date().toISOString(),
    team: {
      id: TEAM_ID,
      name: teamDetails?.data?.team_name || TEAM_NAME,
      logo: teamDetails?.data?.logo || rawMembers?.data?.logo || "",
      city: teamDetails?.data?.city_name || rawMembers?.data?.city_name || "",
      cricHeroesUrl: BASE_URL,
      matchesUrl: `${BASE_URL}/matches`,
      membersUrl: `${BASE_URL}/members`,
    },
    summary: summarize(matches),
    matches,
    players: players.sort((a, b) => b.performance.awards - a.performance.awards || Number(b.isCaptain) - Number(a.isCaptain)),
    opponents,
    opponentAwards,
  };

  await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
  await fs.writeFile(OUTPUT_FILE, `${JSON.stringify(feed, null, 2)}\n`, "utf8");
  console.log(`Wrote ${OUTPUT_FILE}`);
  console.log(`Synced ${matches.length} matches, ${players.length} players, ${opponents.length} opponents.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
