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

function normalizeInnings(innings = []) {
  return innings.map((inning) => ({
    inning: inning.inning,
    startedAt: normalizeDate(inning.inning_start_time),
    endedAt: normalizeDate(inning.inning_end_time),
    totalRuns: Number(inning.total_run || 0),
    totalWickets: Number(inning.total_wicket || 0),
    totalExtras: Number(inning.total_extra || 0),
    oversPlayed: inning.overs_played || inning.summary?.over || "",
    ballsPlayed: Number(inning.balls_played || 0),
    runRate: inning.summary?.rr || "",
    score: inning.summary?.score || "",
    revisedTarget: inning.revised_target || "",
    revisedOvers: inning.revised_overs || "",
    leadBy: inning.lead_by || "",
    trailBy: inning.trail_by || "",
    declared: Boolean(inning.is_declare),
    forfeited: Boolean(inning.is_forfeited),
    followOn: Boolean(inning.is_followon),
  }));
}

function buildMatches(rawMatches) {
  return rawMatches.map((match) => {
    const ourSide = Number(match.team_a_id) === TEAM_ID ? "a" : "b";
    const opponentSide = ourSide === "a" ? "b" : "a";
    const ours = scoreFor(match, ourSide);
    const opponent = scoreFor(match, opponentSide);
    const winningTeamId = Number(match.winning_team_id || 0);
    const result = winningTeamId === TEAM_ID ? "win" : winningTeamId ? "loss" : normalizeMatchState(match.status || "scheduled");

    return {
      id: match.match_id,
      status: match.status,
      state: normalizeMatchState(match.status || match.match_result || match.match_summary?.summary || ""),
      date: normalizeDate(match.match_start_time || match.created_date),
      endDate: normalizeDate(match.match_end_time),
      createdAt: normalizeDate(match.created_date),
      matchType: match.match_type,
      matchCategoryName: match.match_category_name || "",
      ballType: match.ball_type,
      overs: match.overs,
      balls: Number(match.balls || 0),
      currentInning: Number(match.current_inning || 0),
      isSuperOver: Boolean(match.is_super_over),
      isDL: Boolean(match.is_dl),
      isVJD: Boolean(match.is_vjd),
      venue: match.ground_name?.trim() || match.city_name || "",
      venueId: Number(match.ground_id || 0),
      city: match.city_name || "",
      cityId: Number(match.city_id || 0),
      opponentId: opponent.teamId,
      opponent: opponent.team,
      opponentLogo: opponent.logo,
      ourScore: ours.score || "-",
      opponentScore: opponent.score || "-",
      ourRunRate: ours.innings?.[0]?.summary?.rr || "",
      opponentRunRate: opponent.innings?.[0]?.summary?.rr || "",
      result,
      resultText: match.match_summary?.summary || match.win_by || match.match_result || match.status,
      scoreUpdatedAt: normalizeDate(match.updated_at || match.modified_date || match.created_date || match.match_start_time),
      winner: match.winning_team || "",
      tournament: {
        id: Number(match.tournament_id || 0),
        name: match.tournament_name || "",
        categoryId: Number(match.tournament_category_id || 0),
        roundId: Number(match.tournament_round_id || 0),
        roundName: match.tournament_round_name || "",
      },
      association: {
        id: Number(match.association_id || 0),
        yearId: Number(match.association_year_id || 0),
        name: match.association_name || "",
        logo: match.association_logo || "",
      },
      liveAvailability: {
        watchLive: Boolean(match.is_watch_live),
        ticker: Boolean(match.is_ticker),
        web: Boolean(match.is_live_match_enable_in_web),
        app: Boolean(match.is_live_match_enable_in_app),
        matchStreaming: Boolean(match.is_enable_match_streaming),
        tournamentStreaming: Boolean(match.is_enable_tournament_streaming),
        videoAnalyst: Boolean(match.is_video_analyst),
        aiCommentary: Boolean(match.is_having_ai_commentary),
      },
      scorecards: {
        warriors: normalizeInnings(ours.innings),
        opponent: normalizeInnings(opponent.innings),
      },
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

function normalizeMatchState(value) {
  const state = String(value || "").toLowerCase();
  if (/live|in[_ -]?progress|started|playing|innings|batting|bowling|need|requires|target|drinks|break|stumps|toss/.test(state)) return "live";
  if (/past|complete|completed|won|lost|draw|abandon|no result|finished/.test(state)) return "past";
  if (/scheduled|upcoming|fixture|not started|pending|created/.test(state)) return "scheduled";
  return String(value || "scheduled").toLowerCase();
}

function matchTime(match) {
  const time = Date.parse(match.date || "");
  return Number.isNaN(time) ? 0 : time;
}

function isUpcomingMatch(match, now = new Date()) {
  if (isLiveMatch(match)) return false;
  const status = String(match.status || match.result || match.resultText || "").toLowerCase();
  const scheduledStatus = /scheduled|upcoming|fixture|not started|pending|created/.test(status);
  const startsAt = matchTime(match);
  const futureOrToday = startsAt && startsAt >= now.getTime() - 60 * 60 * 1000;
  return scheduledStatus || Boolean(futureOrToday && !["win", "loss"].includes(match.result));
}

function isLiveMatch(match) {
  const status = String(`${match.state || ""} ${match.status || ""} ${match.result || ""} ${match.resultText || ""}`).toLowerCase();
  const hasFinalResult = ["win", "loss", "past"].includes(match.result) || /won by|lost by|match tied|no result|abandon|complete/.test(status);
  return !hasFinalResult && /live|in[_ -]?progress|started|playing|innings|batting|bowling|need|requires|target|drinks|break|stumps|toss/.test(status);
}

function splitMatches(matches, now = new Date()) {
  const liveMatches = matches
    .filter((match) => isLiveMatch(match))
    .sort((a, b) => matchTime(a) - matchTime(b));
  const upcomingMatches = matches
    .filter((match) => isUpcomingMatch(match, now))
    .sort((a, b) => matchTime(a) - matchTime(b));
  const recentMatches = matches
    .filter((match) => !isLiveMatch(match) && !isUpcomingMatch(match, now))
    .sort((a, b) => matchTime(b) - matchTime(a));

  return { liveMatches, upcomingMatches, recentMatches };
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
    associationTag: player.association_tag || "",
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

function normalizeTeam(rawTeamDetails, rawMembers, players) {
  const details = rawTeamDetails?.data || {};
  const memberData = rawMembers?.data || {};
  const captainId = Number(details.captain_id || memberData.captain_id || 0);
  const captain = players.find((player) => Number(player.id) === captainId);

  return {
    id: Number(details.team_id || memberData.team_id || TEAM_ID),
    name: details.team_name || memberData.name || TEAM_NAME,
    shortName: memberData.short_name || "",
    logo: details.logo || memberData.team_logo || memberData.logo || "",
    city: details.city_name || memberData.city_name || "",
    cityId: Number(details.city_id || memberData.city_id || 0),
    createdDate: normalizeDate(details.created_date),
    isVerified: Boolean(details.is_verified || memberData.is_verified),
    isActive: Boolean(details.is_active || memberData.is_active),
    isSecure: Boolean(memberData.is_team_secure),
    isAssociationTeam: Boolean(memberData.is_association_team),
    captainId,
    captainName: captain?.name || "",
    totalPlayers: Number(memberData.total_team_players || players.length || 0),
    cricHeroesUrl: BASE_URL,
    matchesUrl: `${BASE_URL}/matches`,
    membersUrl: `${BASE_URL}/members`,
    awardsUrl: details.awards_link || "",
  };
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

function buildAwardsLedger(players, matches) {
  const byId = new Map(players.map((player) => [Number(player.id), player]));
  const labels = [
    { key: "playerOfMatch", text: "Player of the Match" },
    { key: "fielderOfMatch", text: "Fielder of the Match" },
    { key: "bestBatter", text: "Best Batter" },
    { key: "bestBowler", text: "Best Bowler" },
  ];

  return matches.flatMap((match) => {
    return labels
      .map((label) => {
        const playerId = Number(match.awards?.[label.key] || 0);
        if (!playerId) return null;
        const player = byId.get(playerId);
        return {
          id: `${match.id}-${label.key}`,
          label: label.text,
          playerId,
          playerName: player?.name || "Opponent player",
          playerPhoto: player?.photo || "",
          side: player ? "Kurukshetra Warriors" : match.opponent,
          matchId: match.id,
          opponent: match.opponent,
          result: match.result,
          date: match.date,
        };
      })
      .filter(Boolean);
  }).sort((a, b) => matchTime(b) - matchTime(a));
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

function summarize(matches, liveMatches, upcomingMatches, recentMatches) {
  const wins = matches.filter((match) => match.result === "win").length;
  const losses = matches.filter((match) => match.result === "loss").length;
  const live = liveMatches[0];
  const latest = recentMatches[0];
  const next = upcomingMatches[0];

  return {
    matches: matches.length,
    live: liveMatches.length,
    wins,
    losses,
    winRate: matches.length ? Math.round((wins / matches.length) * 100) : 0,
    liveOpponent: live?.opponent || "",
    liveScore: live ? `${live.ourScore || "-"} vs ${live.opponentScore || "-"}` : "",
    liveStatus: live?.resultText || live?.status || "",
    latestResult: latest?.resultText || "",
    latestOpponent: latest?.opponent || "",
    upcoming: upcomingMatches.length,
    nextOpponent: next?.opponent || "",
    nextMatchDate: next?.date || "",
    nextMatchVenue: next?.venue || next?.city || "",
  };
}

function countBy(items, getValue) {
  const counts = new Map();
  for (const item of items) {
    const value = getValue(item);
    if (!value) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function scoreNumber(value) {
  const match = String(value || "").match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function buildMemberSummary(players) {
  return {
    total: players.length,
    verified: players.filter((player) => player.isVerified).length,
    pro: players.filter((player) => player.isPro).length,
    captains: players.filter((player) => player.isCaptain).length,
    admins: players.filter((player) => player.isAdmin).length,
    skills: countBy(players, (player) => player.skill || "Unlisted"),
    batterCategories: countBy(players, (player) => player.batterCategory),
    bowlerCategories: countBy(players, (player) => player.bowlerCategory),
    badges: countBy(players.flatMap((player) => player.badges || []), (badge) => badge),
  };
}

function buildMatchInsights(matches) {
  const ourScores = matches.map((match) => scoreNumber(match.ourScore)).filter(Boolean);
  const opponentScores = matches.map((match) => scoreNumber(match.opponentScore)).filter(Boolean);
  const highestFor = matches.reduce((best, match) => scoreNumber(match.ourScore) > scoreNumber(best?.ourScore) ? match : best, null);
  const highestAgainst = matches.reduce((best, match) => scoreNumber(match.opponentScore) > scoreNumber(best?.opponentScore) ? match : best, null);

  return {
    total: matches.length,
    completed: matches.filter((match) => ["win", "loss", "past"].includes(match.result)).length,
    superOvers: matches.filter((match) => match.isSuperOver).length,
    dlMatches: matches.filter((match) => match.isDL).length,
    vjdMatches: matches.filter((match) => match.isVJD).length,
    averageFor: ourScores.length ? Math.round(ourScores.reduce((sum, score) => sum + score, 0) / ourScores.length) : 0,
    averageAgainst: opponentScores.length ? Math.round(opponentScores.reduce((sum, score) => sum + score, 0) / opponentScores.length) : 0,
    highestFor: highestFor ? { score: highestFor.ourScore, opponent: highestFor.opponent, date: highestFor.date } : null,
    highestAgainst: highestAgainst ? { score: highestAgainst.opponentScore, opponent: highestAgainst.opponent, date: highestAgainst.date } : null,
    matchTypes: countBy(matches, (match) => match.matchType),
    ballTypes: countBy(matches, (match) => match.ballType),
    venues: countBy(matches, (match) => match.venue || match.city),
    cities: countBy(matches, (match) => match.city),
    tournaments: countBy(matches, (match) => match.tournament?.name),
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
  const { liveMatches, upcomingMatches, recentMatches } = splitMatches(matches);
  const players = normalizeMembers(rawMembers);
  const team = normalizeTeam(teamDetails, rawMembers, players);
  const opponentAwards = attachAwards(players, recentMatches);
  const opponents = buildOpponents(recentMatches, opponentAwards);
  const awardLedger = buildAwardsLedger(players, recentMatches);

  const feed = {
    schemaVersion: 1,
    source: "CricHeroes public team pages",
    syncedAt: new Date().toISOString(),
    dataInventory: {
      teamProfile: true,
      matches: matches.length,
      liveMatches: liveMatches.length,
      upcomingMatches: upcomingMatches.length,
      recentMatches: recentMatches.length,
      players: players.length,
      opponents: opponents.length,
      awards: awardLedger.length,
      sourcePages: [BASE_URL, `${BASE_URL}/matches`, `${BASE_URL}/members`],
    },
    team,
    summary: summarize(matches, liveMatches, upcomingMatches, recentMatches),
    memberSummary: buildMemberSummary(players),
    matchInsights: buildMatchInsights(recentMatches),
    matches: [...liveMatches, ...upcomingMatches, ...recentMatches],
    liveMatches,
    upcomingMatches,
    recentMatches,
    players: players.sort((a, b) => b.performance.awards - a.performance.awards || Number(b.isCaptain) - Number(a.isCaptain)),
    opponents,
    awardLedger,
    opponentAwards,
  };

  await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
  await fs.writeFile(OUTPUT_FILE, `${JSON.stringify(feed, null, 2)}\n`, "utf8");
  console.log(`Wrote ${OUTPUT_FILE}`);
  console.log(`Synced ${matches.length} matches, ${liveMatches.length} live, ${players.length} players, ${opponents.length} opponents.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
