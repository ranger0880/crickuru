import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { applyRouteMetadata } from "./metadata.js";
import { AMAZON_COLLECTIONS, amazonProductUrl } from "./amazonProducts.js";
import { trackAmazonClick, trackEvent, trackSponsorClick } from "./analytics.js";
import QuizPage from "./QuizPage.jsx";
import "./styles.css";

const RouterContext = React.createContext(null);
      const localRouteFiles = {
        "/": "index.html",
        "/warriors": "warriors/index.html",
        "/players": "players/index.html",
        "/quiz": "quiz/index.html",
        "/coin": "coin/index.html",
        "/kurukshetra-coin": "kurukshetra-coin/index.html",
        "/india-matches": "india-matches/index.html",
        "/gt-gaming": "gt-gaming/index.html",
        "/shop": "shop/index.html",
      };

      function isLocalFilePreview() {
        return window.location.protocol === "file:";
      }

      function localPreviewPrefix() {
        const path = decodeURIComponent(window.location.pathname).replace(/\\/g, "/");
        return /\/(coin|kurukshetra-coin|india-matches|players|quiz|warriors|gt-gaming|shop)\/index\.html$/i.test(path) ? "../" : "";
      }

      function normalizePath(pathname, basename = "/") {
        const cleanBase = basename === "/" ? "" : basename.replace(/\/$/, "");
        let path = pathname || "/";
        if (cleanBase && path.startsWith(cleanBase)) {
          path = path.slice(cleanBase.length) || "/";
        }
        path = path.toLowerCase().replace(/\\/g, "/");
        if (path.endsWith("/index.html")) path = path.replace(/\/index\.html$/i, "");
        path = path.startsWith("/") ? path : `/${path}`;
        return path.length > 1 ? path.replace(/\/+$/, "") : path;
      }

      function currentRoutePath(basename = "/") {
        if (!isLocalFilePreview()) return normalizePath(window.location.pathname, basename);
        const path = decodeURIComponent(window.location.pathname).replace(/\\/g, "/").toLowerCase();
        const routeMatch = path.match(/\/(coin|kurukshetra-coin|india-matches|players|quiz|warriors|gt-gaming|shop)\/index\.html$/);
        return routeMatch ? `/${routeMatch[1]}` : "/";
      }

      function currentRouteSegment(pathname, basename = "/") {
        const normalized = normalizePath(pathname, basename);
        if (normalized === "/") return "/";
        return `/${normalized.replace(/^\/+/, "").split("/")[0]}`;
      }

      function localFileHref(to) {
        if (!isLocalFilePreview() || typeof to !== "string" || !to.startsWith("/")) return "";
        const route = localRouteFiles[normalizePath(to, "/")] || localRouteFiles["/"];
        return `${localPreviewPrefix()}${route}`;
      }

      function BrowserRouter({ basename = "/", children }) {
        const getBrowserPath = useCallback(() => {
          if (isLocalFilePreview()) return currentRoutePath(basename);
          return normalizePath(window.location.pathname, basename);
        }, [basename]);

        const [pathname, setPathname] = useState(() => getBrowserPath());

        useEffect(() => {
          const onPopState = () => setPathname(getBrowserPath());
          const onLoad = () => setPathname(getBrowserPath());
          onLoad();
          window.addEventListener("load", onLoad);
          window.addEventListener("popstate", onPopState);
          return () => {
            window.removeEventListener("load", onLoad);
            window.removeEventListener("popstate", onPopState);
          };
        }, [getBrowserPath]);

        const navigate = (to) => {
          if (!to || to.startsWith("http")) {
            window.location.href = to;
            return;
          }
          const cleanBase = basename === "/" ? "" : basename.replace(/\/$/, "");
          const target = to.startsWith("/") ? to : `/${to}`;
          if (isLocalFilePreview()) {
            setPathname(normalizePath(target, "/"));
            return;
          }
          window.history.pushState({}, "", `${cleanBase}${target}`);
          setPathname(normalizePath(target, basename));
        };

        return <RouterContext.Provider value={{ basename, pathname, navigate }}>{children}</RouterContext.Provider>;
      }

      function useRouter() {
        return useContext(RouterContext) || { basename: "/", pathname: "/", navigate: () => {} };
      }

      function useLocation() {
        const router = useRouter();
        return { pathname: router.pathname, hash: window.location.hash, search: window.location.search };
      }

      function useNavigate() {
        return useRouter().navigate;
      }

      function Link({ to, onClick, children, ...props }) {
        const router = useRouter();
        const cleanBase = router.basename === "/" ? "" : router.basename.replace(/\/$/, "");
        const href = localFileHref(to) || (typeof to === "string" && to.startsWith("/") ? `${cleanBase}${to}` : to);
        return (
          <a
            href={href}
            onClick={(event) => onClick?.(event)}
            {...props}
          >
            {children}
          </a>
        );
      }

      function NavLink({ to, className, children, ...props }) {
        const router = useRouter();
        const activePath = currentRouteSegment(router.pathname, router.basename);
        const targetPath = to === "/" ? "/" : `/${to.replace(/^\/+/, "").split("/")[0]}`;
        const isActive = activePath === targetPath;
        const resolvedClassName = typeof className === "function" ? className({ isActive }) : className;
        return <Link to={to} className={resolvedClassName} {...props}>{children}</Link>;
      }

      function Routes({ children }) {
        const router = useRouter();
        const routeList = React.Children.toArray(children);
        const resolvedPath = currentRouteSegment(router.pathname, router.basename);
        const exact = routeList.find((child) => child.props.path === resolvedPath);
        const fallback = routeList.find((child) => child.props.path === "*");
        return (exact || fallback)?.props.element || null;
      }

      function Route() {
        return null;
      }

      const CricLinks = {
        profile: "https://cricheroes.com/team-profile/8626734/kurukshetra-warriors",
        matches: "https://cricheroes.com/team-profile/8626734/kurukshetra-warriors/matches",
        members: "https://cricheroes.com/team-profile/8626734/kurukshetra-warriors/members",
      };

      const liveFeedFallback = {
        schemaVersion: 1,
        source: "CricKuru local feed",
        sourceStatus: "empty",
        syncedAt: "",
        lastCheckedAt: "",
        lastSuccessfulSyncAt: "",
        team: {
          name: "Kurukshetra Warriors",
          captainName: "Ankit Kulshreshtha",
          captainId: 29139731,
          logo: "",
          city: "Greater Noida",
          cricHeroesUrl: CricLinks.profile,
          matchesUrl: CricLinks.matches,
          membersUrl: CricLinks.members,
        },
        dataInventory: { teamProfile: false, matches: 0, liveMatches: 0, upcomingMatches: 0, recentMatches: 0, players: 0, opponents: 0, awards: 0, records: 0, playerProfiles: 0, playerRecentMatches: 0, playerHistoryMatches: 0, playerHistoryComplete: 0, sourcePages: [] },
        summary: { matches: 0, live: 0, wins: 0, losses: 0, winRate: 0, liveOpponent: "", liveScore: "", liveStatus: "", latestResult: "", latestOpponent: "", upcoming: 0, nextOpponent: "", nextMatchDate: "", nextMatchVenue: "" },
        memberSummary: { total: 0, verified: 0, pro: 0, captains: 0, admins: 0, skills: [], batterCategories: [], bowlerCategories: [], badges: [] },
        matchInsights: { total: 0, completed: 0, averageFor: 0, averageAgainst: 0, highestFor: null, highestAgainst: null, matchTypes: [], ballTypes: [], venues: [], cities: [], tournaments: [] },
        matches: [],
        liveMatches: [],
        upcomingMatches: [],
        recentMatches: [],
        players: [],
        opponents: [],
        awardLedger: [],
        recordLedger: [],
        recordHistory: [],
        rosterChangeLog: [],
        playerStatsUpdatedAt: "",
      };

      const indiaMatchesFallback = {
        schemaVersion: 1,
        source: "CricKuru India match feed",
        sourceStatus: "empty",
        syncedAt: "",
        lastCheckedAt: "",
        lastSuccessfulSyncAt: "",
        summary: { live: 0, recent: 0, upcoming: 0, total: 0 },
        all: [],
        live: [],
        recent: [],
        upcoming: [],
        importantMatches: [],
        importantTournaments: [],
        importantResultsByMonth: [],
        rankings: [
          { id: "international", label: "International", order: 1, live: 0, recent: 0, upcoming: 0, total: 0 },
          { id: "league", label: "League / IPL", order: 2, live: 0, recent: 0, upcoming: 0, total: 0 },
          { id: "women", label: "Women", order: 3, live: 0, recent: 0, upcoming: 0, total: 0 },
          { id: "domestic", label: "Domestic / State", order: 4, live: 0, recent: 0, upcoming: 0, total: 0 },
        ],
      };

      const IndiaMatchesContext = React.createContext({
        loading: false,
        error: "",
        data: indiaMatchesFallback,
      });
      const ThemeContext = React.createContext({
        theme: "dark",
        toggleTheme: () => {},
      });

      const themeStorageKey = "crickuru-theme";
      const quizProfileStorageKey = "crickuru-quiz-profile-v1";
      const onlinePresenceStorageKey = "crickuru-online-presence-v1";
      const playerChatStorageKey = "crickuru-player-chat-v1";
      const onlinePresenceTtl = 90 * 1000;
      const playerChatLimit = 80;

      function getInitialTheme() {
        try {
          const stored = window.localStorage.getItem(themeStorageKey);
          if (stored === "light" || stored === "dark") return stored;
          return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
        } catch {
          return "dark";
        }
      }

      function applyTheme(theme) {
        const root = document.documentElement;
        root.dataset.theme = theme;
        root.classList.toggle("theme-light", theme === "light");
        root.classList.toggle("theme-dark", theme === "dark");
        root.style.colorScheme = theme;
      }

      function ThemeProvider({ children }) {
        const [theme, setTheme] = useState(getInitialTheme);

        useEffect(() => {
          applyTheme(theme);
          try {
            window.localStorage.setItem(themeStorageKey, theme);
          } catch {
            // Some private browsing modes block localStorage. The live toggle still works for the session.
          }
        }, [theme]);

        const value = useMemo(() => ({
          theme,
          toggleTheme: () => setTheme((current) => (current === "light" ? "dark" : "light")),
        }), [theme]);

        return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
      }

      function useThemeMode() {
        return useContext(ThemeContext);
      }

      function readQuizProfileForPresence() {
        try {
          const profile = JSON.parse(window.localStorage.getItem(quizProfileStorageKey) || "null");
          return profile?.registered && profile?.id ? profile : null;
        } catch {
          return null;
        }
      }

      function readOnlinePresence() {
        try {
          const stored = JSON.parse(window.localStorage.getItem(onlinePresenceStorageKey) || "[]");
          return Array.isArray(stored) ? stored : [];
        } catch {
          return [];
        }
      }

      function readPlayerChatMessages() {
        try {
          const stored = JSON.parse(window.localStorage.getItem(playerChatStorageKey) || "[]");
          return Array.isArray(stored) ? stored.filter((message) => message?.text && message?.senderName).slice(-playerChatLimit) : [];
        } catch {
          return [];
        }
      }

      function useOnlinePlayers() {
        const guestId = useRef(`guest-${Date.now()}-${Math.random().toString(36).slice(2)}`).current;
        const [players, setPlayers] = useState([]);

        useEffect(() => {
          const heartbeat = () => {
            const now = Date.now();
            const profile = readQuizProfileForPresence();
            const current = {
              id: String(profile?.id || guestId),
              name: String(profile?.name || "Guest Warrior"),
              avatar: String(profile?.avatar || ""),
              updatedAt: now,
            };
            const fresh = readOnlinePresence()
              .filter((player) => player.id !== current.id && now - Number(player.updatedAt) < onlinePresenceTtl)
              .concat(current);
            try {
              window.localStorage.setItem(onlinePresenceStorageKey, JSON.stringify(fresh));
            } catch {
              // Keep the current visitor visible even when browser storage is unavailable.
            }
            setPlayers(fresh.sort((a, b) => Number(b.updatedAt) - Number(a.updatedAt)));
          };

          const removeCurrent = () => {
            const profile = readQuizProfileForPresence();
            const currentId = String(profile?.id || guestId);
            const remaining = readOnlinePresence().filter((player) => player.id !== currentId);
            try {
              window.localStorage.setItem(onlinePresenceStorageKey, JSON.stringify(remaining));
            } catch {
              // Ignore cleanup failures during tab close.
            }
          };

          heartbeat();
          const interval = window.setInterval(heartbeat, 20 * 1000);
          window.addEventListener("storage", heartbeat);
          window.addEventListener("beforeunload", removeCurrent);
          return () => {
            window.clearInterval(interval);
            window.removeEventListener("storage", heartbeat);
            window.removeEventListener("beforeunload", removeCurrent);
          };
        }, [guestId]);

        return players;
      }

      function assetUrl(path) {
        if (isLocalFilePreview()) {
          const cleanPath = path.startsWith("/") ? path.slice(1) : path;
          return `${localPreviewPrefix()}${cleanPath}`;
        }
        const cleanBase = window.location.hostname.endsWith("github.io") ? "/crickuru" : "";
        return `${cleanBase}${path.startsWith("/") ? path : `/${path}`}`;
      }

      function safeImageUrl(value) {
        try {
          const url = new URL(String(value || ""), window.location.origin);
          const allowedHost = url.hostname === window.location.hostname || url.hostname === "media.cricheroes.in";
          return url.protocol === "https:" && allowedHost ? url.href : "";
        } catch {
          return "";
        }
      }

      function useLiveCricketFeed() {
        const [state, setState] = useState({ loading: true, error: "", data: liveFeedFallback });
        const liveMode = asArray(state.data.liveMatches).length > 0;

        useEffect(() => {
          let cancelled = false;

          const loadFeed = async () => {
            try {
              const response = await fetch(assetUrl(`/data/crickuru-live.json?v=${Date.now()}`), { cache: "no-store" });
              if (!response.ok) throw new Error(`Live feed returned ${response.status}`);
              const data = await response.json();
              if (!cancelled) setState({ loading: false, error: "", data: { ...liveFeedFallback, ...data } });
            } catch (error) {
              if (!cancelled) {
                setState((current) => ({
                  loading: false,
                  error: error.message || "Live feed unavailable",
                  data: current.data || liveFeedFallback,
                }));
              }
            }
          };

          loadFeed();
          const interval = window.setInterval(loadFeed, liveMode ? 15 * 1000 : 60 * 1000);
          return () => {
            cancelled = true;
            window.clearInterval(interval);
          };
        }, [liveMode]);

        return state;
      }

      function useIndiaMatchesFeed() {
        const [state, setState] = useState({ loading: true, error: "", data: indiaMatchesFallback });
        const liveMode = asArray(state.data.live).length > 0;

        useEffect(() => {
          let cancelled = false;

          const loadFeed = async () => {
            try {
              const response = await fetch(assetUrl(`/data/india-matches.json?v=${Date.now()}`), { cache: "no-store" });
              if (!response.ok) throw new Error(`India matches feed returned ${response.status}`);
              const data = await response.json();
              if (!cancelled) setState({ loading: false, error: "", data: { ...indiaMatchesFallback, ...data } });
            } catch (error) {
              if (!cancelled) {
                setState((current) => ({
                  loading: false,
                  error: error.message || "India matches feed unavailable",
                  data: current.data || indiaMatchesFallback,
                }));
              }
            }
          };

          loadFeed();
          const interval = window.setInterval(loadFeed, liveMode ? 15 * 1000 : 60 * 1000);
          return () => {
            cancelled = true;
            window.clearInterval(interval);
          };
        }, [liveMode]);

        return state;
      }

      function IndiaMatchesProvider({ children }) {
        const feed = useIndiaMatchesFeed();
        return <IndiaMatchesContext.Provider value={feed}>{children}</IndiaMatchesContext.Provider>;
      }

      function useIndiaMatches() {
        return useContext(IndiaMatchesContext);
      }

      function formatFeedDate(value) {
        if (!value) return "Waiting for sync";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return new Intl.DateTimeFormat("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }).format(date);
      }

      function indiaMonthKey(value) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "";
        const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit" }).formatToParts(date);
        const year = parts.find((part) => part.type === "year")?.value;
        const month = parts.find((part) => part.type === "month")?.value;
        return year && month ? `${year}-${month}` : "";
      }

      function radarMonthWindow(now = new Date()) {
        const current = indiaMonthKey(now);
        if (!current) return new Set();
        const [year, month] = current.split("-").map(Number);
        return new Set([-1, 0, 1].map((offset) => {
          const date = new Date(Date.UTC(year, month - 1 + offset, 1));
          return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
        }));
      }

      function isRadarWindowMatch(match, now = new Date()) {
        return radarMonthWindow(now).has(indiaMonthKey(match?.startTime || match?.date));
      }

      function compactFeedDate(value) {
        if (!value) return "Awaiting schedule";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return new Intl.DateTimeFormat("en-IN", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        }).format(date);
      }

      function cleanMatchText(value, fallback = "") {
        return String(value || fallback)
          .replace(/&nbsp;/g, " ")
          .replace(/\s+/g, " ")
          .trim();
      }

      function asArray(value) {
        return Array.isArray(value) ? value : [];
      }

      const CRICHEROES_STATS_SOURCE = "CricHeroes public player stats";
      const BOT_API_URL = String(import.meta.env.VITE_BOT_API_URL || "").replace(/\/+$/, "");
      const GT_GAMING_CHAIR_IMAGE = "https://gtgaming.shop/wp-content/uploads/2026/07/Adobe-Express-file.png";

      function hasPlayerStats(stats) {
        if (!stats || typeof stats !== "object") return false;
        return Object.entries(stats).some(([key, value]) => key !== "source" && key !== "updatedAt" && value !== null && value !== undefined && value !== "");
      }

      function numericStatValue(value) {
        if (typeof value === "number") return Number.isFinite(value) ? value : 0;
        const parsed = Number.parseFloat(String(value ?? "").replace(/,/g, "").replace(/%/g, ""));
        return Number.isFinite(parsed) ? parsed : 0;
      }

      function extractLeadingNumber(value) {
        const match = String(value ?? "").replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
        return match ? numericStatValue(match[0]) : 0;
      }

      function normalizePlayerStats(stats) {
        if (!hasPlayerStats(stats)) return {};
        const sections = stats.sections && typeof stats.sections === "object" ? stats.sections : {};
        const sectionValue = (sectionName, aliases) => {
          const wanted = new Set(aliases.map((alias) => String(alias).toLowerCase().replace(/[^a-z0-9]/g, "")));
          const row = asArray(sections[sectionName]).find((item) => wanted.has(String(item?.title || "").toLowerCase().replace(/[^a-z0-9]/g, "")));
          return row?.value;
        };
        const choose = (field, sectionName, aliases) => stats[field] ?? sectionValue(sectionName, aliases);
        const battingMatches = choose("matches", "batting", ["matches"]);
        const battingInnings = choose("battingInnings", "batting", ["innings"]);
        const bowlingInnings = choose("bowlingInnings", "bowling", ["innings"]);
        const fieldingMatches = choose("fieldingMatches", "fielding", ["matches"]);
        const captainMatches = choose("captainMatches", "captain", ["matches"]);
        const bestScore = stats.bestScore ?? extractLeadingNumber(sectionValue("batting", ["highest runs", "highestruns"]));
        const bestBowling = stats.bestBowling ?? sectionValue("bowling", ["best bowling", "bestbowling"]);
        return {
          ...stats,
          matches: battingMatches ?? stats.matchesTracked,
          battingInnings,
          bowlingInnings,
          fieldingMatches: fieldingMatches ?? stats.matchesTracked,
          captainMatches,
          bestScore,
          bestWickets: stats.bestWickets ?? extractLeadingNumber(bestBowling),
          bestBowling: bestBowling ?? (stats.bestWickets ? `${stats.bestWickets} wickets` : undefined),
          notOut: choose("notOut", "batting", ["not out", "notout"]),
          runs: choose("runs", "batting", ["runs"]),
          average: choose("average", "batting", ["avg", "average"]),
          strikeRate: choose("strikeRate", "batting", ["sr", "strikerate", "strikerate"]),
          thirties: choose("thirties", "batting", ["30s", "30"]),
          fifties: choose("fifties", "batting", ["50s", "50"]),
          hundreds: choose("hundreds", "batting", ["100s", "100"]),
          fours: choose("fours", "batting", ["4s", "4"]),
          sixes: choose("sixes", "batting", ["6s", "6"]),
          ducks: choose("ducks", "batting", ["ducks"]),
          wins: choose("wins", "batting", ["won", "wins"]),
          losses: choose("losses", "batting", ["loss", "losses"]),
          overs: choose("overs", "bowling", ["overs"]),
          maidens: choose("maidens", "bowling", ["maidens"]),
          wickets: choose("wickets", "bowling", ["wickets"]),
          runsConceded: choose("runsConceded", "bowling", ["runs", "runsconceded"]),
          threeWicketHauls: choose("threeWicketHauls", "bowling", ["3 wickets", "3wickets"]),
          fiveWicketHauls: choose("fiveWicketHauls", "bowling", ["5 wickets", "5wickets"]),
          economy: choose("economy", "bowling", ["economy", "eco"]),
          bowlingStrikeRate: choose("bowlingStrikeRate", "bowling", ["sr", "strikerate"]),
          bowlingAverage: choose("bowlingAverage", "bowling", ["avg", "average"]),
          wides: choose("wides", "bowling", ["wides", "wd"]),
          noBalls: choose("noBalls", "bowling", ["noballs", "no balls"]),
          dotBalls: choose("dotBalls", "bowling", ["dot balls", "dotballs"]),
          catches: choose("catches", "fielding", ["catches"]),
          caughtBehind: choose("caughtBehind", "fielding", ["caught behind", "caughtbehind"]),
          runOuts: choose("runOuts", "fielding", ["run outs", "runouts"]),
          stumpings: choose("stumpings", "fielding", ["stumpings"]),
          assistedRunOuts: choose("assistedRunOuts", "fielding", ["assisted run outs", "assistedrunouts"]),
          byeRunsWicketkeeper: choose("byeRunsWicketkeeper", "fielding", ["bye runs (wk)", "byerunswk"]),
          tossesWon: choose("tossesWon", "captain", ["toss won", "tosses won", "tosswon"]),
          captainWinPercentage: choose("captainWinPercentage", "captain", ["win per", "win percentage", "winper"]),
          publicFieldCount: stats.publicFieldCount || Object.values(sections).reduce((count, rows) => count + asArray(rows).length, 0),
        };
      }

      function playerOverallStats(player) {
        const candidates = [player?.liveCricHeroesStats, player?.overallStats, player?.stats, player?.warriorsStats];
        const overall = candidates.find((stats) => stats?.source === CRICHEROES_STATS_SOURCE);
        return normalizePlayerStats(overall || candidates.find(hasPlayerStats));
      }

      function visiblePlayerOverallStats(player) {
        return player?.publicStatsLocked ? {} : playerOverallStats(player);
      }

      function playerStatsSource(player, stats = playerOverallStats(player)) {
        if (stats?.source === CRICHEROES_STATS_SOURCE) return "Overall CricHeroes career";
        if (hasPlayerStats(stats)) return "Kurukshetra Warriors tracked";
        return "Overall profile refresh scheduled";
      }

      function matchTimeLine(match) {
        const parts = [
          match.dateLabel || compactFeedDate(match.startTime),
          match.time,
          match.place,
        ].map((part) => cleanMatchText(part)).filter(Boolean);
        return parts.length ? parts.join(" - ") : "Schedule pending";
      }

      function matchTitle(match) {
        return cleanMatchText(match.title || match.series || "India cricket match");
      }

      function matchTeamLabel(team) {
        return [cleanMatchText(team?.name || team?.team), cleanMatchText(team?.score || team?.run)]
          .filter(Boolean)
          .join(" ");
      }

      function initialsFromName(name = "KW") {
        return name
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part[0]?.toUpperCase())
          .join("") || "KW";
      }

      const fallbackIcons = {
        ArrowRight: (props) => <SvgIcon {...props}><path d="M5 12h14" /><path d="m13 5 7 7-7 7" /></SvgIcon>,
        Bot: (props) => <SvgIcon {...props}><rect x="4" y="7" width="16" height="13" rx="3" /><path d="M12 3v4" /><path d="M8 13h.01" /><path d="M16 13h.01" /><path d="M8 17h8" /></SvgIcon>,
        CalendarDays: (props) => <SvgIcon {...props}><path d="M8 2v4" /><path d="M16 2v4" /><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 10h18" /><path d="M8 14h.01" /><path d="M12 14h.01" /><path d="M16 14h.01" /><path d="M8 18h.01" /><path d="M12 18h.01" /></SvgIcon>,
        ChevronDown: (props) => <SvgIcon {...props}><path d="m6 9 6 6 6-6" /></SvgIcon>,
        CircleUserRound: (props) => <SvgIcon {...props}><path d="M18 20a6 6 0 0 0-12 0" /><circle cx="12" cy="10" r="4" /><circle cx="12" cy="12" r="10" /></SvgIcon>,
        ExternalLink: (props) => <SvgIcon {...props}><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></SvgIcon>,
        LogIn: (props) => <SvgIcon {...props}><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /></SvgIcon>,
        History: (props) => <SvgIcon {...props}><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 3v6h6" /><path d="M12 7v5l3 2" /></SvgIcon>,
        Menu: (props) => <SvgIcon {...props}><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" /></SvgIcon>,
        MessageCircle: (props) => <SvgIcon {...props}><path d="M20 11.5a7.5 7.5 0 0 1-7.8 7.5 8.5 8.5 0 0 1-3.5-.8L4 20l1.7-4.1A7.4 7.4 0 0 1 4.5 11.5 7.5 7.5 0 0 1 12 4a7.5 7.5 0 0 1 8 7.5Z" /><path d="M8 11.5h.01" /><path d="M12 11.5h.01" /><path d="M16 11.5h.01" /></SvgIcon>,
        Moon: (props) => <SvgIcon {...props}><path d="M12 3a6 6 0 0 0 8.8 6.9A9 9 0 1 1 12 3Z" /></SvgIcon>,
        Mouse: (props) => <SvgIcon {...props}><rect x="5" y="2" width="14" height="20" rx="7" /><path d="M12 6v4" /></SvgIcon>,
        Play: (props) => <SvgIcon {...props}><polygon points="6 3 20 12 6 21 6 3" /></SvgIcon>,
        Radio: (props) => <SvgIcon {...props}><path d="M4.9 19.1a10 10 0 0 1 0-14.2" /><path d="M7.8 16.2a6 6 0 0 1 0-8.5" /><circle cx="12" cy="12" r="2" /><path d="M16.2 7.8a6 6 0 0 1 0 8.5" /><path d="M19.1 4.9a10 10 0 0 1 0 14.2" /></SvgIcon>,
        Search: (props) => <SvgIcon {...props}><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></SvgIcon>,
        ShoppingBag: (props) => <SvgIcon {...props}><path d="M6 8h12l1 13H5L6 8Z" /><path d="M9 8a3 3 0 0 1 6 0" /></SvgIcon>,
        Shield: (props) => <SvgIcon {...props}><path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3v8Z" /></SvgIcon>,
        Send: (props) => <SvgIcon {...props}><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></SvgIcon>,
        Sparkles: (props) => <SvgIcon {...props}><path d="m12 3-1.9 5.8L4 11l6.1 2.2L12 19l1.9-5.8L20 11l-6.1-2.2L12 3Z" /><path d="M5 3v4" /><path d="M3 5h4" /><path d="M19 17v4" /><path d="M17 19h4" /></SvgIcon>,
        Sun: (props) => <SvgIcon {...props}><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></SvgIcon>,
        Swords: (props) => <SvgIcon {...props}><path d="m14.5 17.5 3 3 3-3-3-3" /><path d="m3 3 8.5 8.5" /><path d="m11.5 6.5 2-2L21 12l-2 2" /><path d="m3 21 8.5-8.5" /><path d="m6.5 11.5-2 2L12 21l2-2" /></SvgIcon>,
        Trophy: (props) => <SvgIcon {...props}><path d="M8 21h8" /><path d="M12 17v4" /><path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" /><path d="M5 9a3 3 0 0 1-3-3V5h5" /><path d="M19 9a3 3 0 0 0 3-3V5h-5" /></SvgIcon>,
        Users: (props) => <SvgIcon {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></SvgIcon>,
        X: (props) => <SvgIcon {...props}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></SvgIcon>,
      };

      function SvgIcon({ children, className = "", size = 20, ...props }) {
        return (
          <svg
            viewBox="0 0 24 24"
            width={size}
            height={size}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
            {...props}
          >
            {children}
          </svg>
        );
      }

      const Icon = { ...fallbackIcons, ...(window.LucideReact || {}) };

      const navItems = [
        { label: "Home", path: "/" },
        { label: "Warriors", path: "/warriors" },
        { label: "India", path: "/india-matches" },
        { label: "Players", path: "/players" },
        { label: "Quiz", path: "/quiz" },
        { label: "Kuru Coin", path: "/coin" },
        { label: "GT Chairs", path: "/gt-gaming" },
        { label: "Gear Shop", path: "/shop" },
      ];

      const ease = [0.22, 1, 0.36, 1];

      function useCursorParallax() {
        const [point, setPoint] = useState({ x: 0, y: 0 });

        useEffect(() => {
          const isTouch = window.matchMedia("(pointer: coarse)").matches;
          if (isTouch) return undefined;

          const onMove = (event) => {
            const x = ((event.clientX / window.innerWidth) - 0.5) * 14;
            const y = ((event.clientY / window.innerHeight) - 0.5) * 14;
            setPoint({ x, y });
            document.documentElement.style.setProperty("--cursor-x", `${x}px`);
            document.documentElement.style.setProperty("--cursor-y", `${y}px`);
            document.documentElement.style.setProperty("--parallax-x", `${x * -0.35}px`);
            document.documentElement.style.setProperty("--parallax-y", `${y * -0.2}px`);
          };

          window.addEventListener("pointermove", onMove, { passive: true });
          return () => window.removeEventListener("pointermove", onMove);
        }, []);

        return point;
      }

      function ScrollToTop() {
        const location = useLocation();

        useEffect(() => {
          if (!location.hash) {
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        }, [location.pathname]);

        return null;
      }

      function MetaManager() {
        const location = useLocation();

        useEffect(() => {
          applyRouteMetadata(location.pathname);
        }, [location.pathname]);

        return null;
      }

      function PageLoader() {
        const [show, setShow] = useState(true);

        useEffect(() => {
          const timeout = window.setTimeout(() => setShow(false), 720);
          return () => window.clearTimeout(timeout);
        }, []);

        return (
          <AnimatePresence>
            {show && (
              <motion.div
                className="fixed inset-0 z-[100] grid place-items-center bg-night"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.65, ease }}
                aria-hidden="true"
              >
                <motion.div
                  className="font-display text-5xl font-black tracking-normal"
                  initial={{ opacity: 0, y: 18, filter: "blur(12px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration: 0.7, ease }}
                >
                  <span className="text-white">CRIC</span><span className="text-gold">KURU</span>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        );
      }

      function Logo({ onClick }) {
        return (
          <Link
            to="/"
            onClick={onClick}
            aria-label="CricKuru home"
            className="group flex items-center gap-3"
          >
            <span className="relative grid h-10 w-10 place-items-center rounded-full border border-gold/40 bg-white/5 shadow-[0_0_35px_rgba(244,185,66,0.18)]">
              <span className="absolute h-6 w-6 rounded-full border-2 border-crimson/90">
                <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 rotate-[28deg] bg-white/70" />
              </span>
            </span>
            <span className="font-display text-3xl font-black leading-none">
              <span className="text-white">CRIC</span><span className="text-gold">KURU</span>
            </span>
          </Link>
        );
      }

      function ThemeToggle({ wide = false }) {
        const { theme, toggleTheme } = useThemeMode();
        const nextTheme = theme === "light" ? "dark" : "light";
        const label = `Switch to ${nextTheme} mode`;

        return (
          <button
            type="button"
            className={`theme-toggle inline-flex min-h-12 items-center justify-center gap-3 rounded-full border border-white/15 bg-white/5 px-4 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:border-gold/45 hover:text-gold ${wide ? "w-full" : "w-12 px-0"}`}
            aria-label={label}
            aria-pressed={theme === "light"}
            title={label}
            onClick={toggleTheme}
          >
            {theme === "light" ? <Icon.Sun size={19} /> : <Icon.Moon size={19} />}
            <span className={wide ? "" : "sr-only"}>{theme === "light" ? "Light" : "Dark"}</span>
          </button>
        );
      }

      function Navbar() {
        const [scrolled, setScrolled] = useState(false);
        const [open, setOpen] = useState(false);
        const location = useLocation();

        useEffect(() => {
          const onScroll = () => setScrolled(window.scrollY > 24);
          onScroll();
          window.addEventListener("scroll", onScroll, { passive: true });
          return () => window.removeEventListener("scroll", onScroll);
        }, []);

        useEffect(() => {
          setOpen(false);
        }, [location.pathname]);

        return (
          <>
            <header
              className={`cyber-navbar fixed left-0 right-0 top-9 z-50 transition-all duration-500 ${
                scrolled
                  ? "border-b border-gold/25 bg-night/78 shadow-2xl shadow-black/35 backdrop-blur-xl"
                  : "border-b border-transparent bg-transparent"
              }`}
            >
              <nav
                className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8"
                aria-label="Primary navigation"
              >
                <Logo />
                <div className="hidden items-center gap-1 lg:flex">
                  {navItems.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) =>
                        `nav-link rounded-full px-4 py-2 text-sm font-semibold uppercase tracking-[0.16em] transition ${
                          isActive
                            ? "bg-white/10 text-gold"
                            : "text-white/72 hover:bg-white/8 hover:text-white"
                        }`
                      }
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </div>
                <div className="hidden lg:block">
                  <ThemeToggle />
                </div>
                <div className="flex items-center gap-2 lg:hidden">
                  <ThemeToggle />
                  <button
                    className="grid h-12 w-12 place-items-center rounded-full border border-white/15 bg-white/5 text-white"
                    type="button"
                    aria-label="Open menu"
                    aria-expanded={open}
                    onClick={() => setOpen(true)}
                  >
                    <Icon.Menu size={24} />
                  </button>
                </div>
              </nav>
            </header>

            <AnimatePresence>
              {open && <MobileMenu onClose={() => setOpen(false)} />}
            </AnimatePresence>
          </>
        );
      }

      function MobileMenu({ onClose }) {
        return (
          <motion.div
            className="mobile-menu fixed inset-0 z-[80] px-6 py-6 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.34, ease }}
          >
            <div className="flex items-center justify-between">
              <Logo onClick={onClose} />
              <button
                className="grid h-12 w-12 place-items-center rounded-full border border-white/15 bg-white/5 text-white"
                type="button"
                aria-label="Close menu"
                onClick={onClose}
              >
                <Icon.X size={24} />
              </button>
            </div>
            <div className="mt-8">
              <ThemeToggle wide />
            </div>
            <div className="mt-12 grid gap-3">
              {navItems.map((item, index) => (
                <motion.div
                  key={item.path}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.48, ease }}
                >
                  <Link
                    to={item.path}
                    onClick={onClose}
                    className="flex min-h-14 items-center justify-between rounded-[8px] border border-white/12 bg-white/[0.045] px-5 font-display text-3xl font-black uppercase text-white"
                  >
                    {item.label}
                    <Icon.ArrowRight className="text-gold" size={22} />
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        );
      }

      function IndiaLiveStrip() {
        const { loading, error, data } = useIndiaMatches();
        const liveMatches = asArray(data.live);
        const upcomingMatches = asArray(data.upcoming);
        const recentMatches = asArray(data.recent);
        const tickerMatches = liveMatches.length ? liveMatches : upcomingMatches.length ? upcomingMatches.slice(0, 3) : recentMatches.slice(0, 3);
        const repeatedMatches = tickerMatches.length > 1 ? [...tickerMatches, ...tickerMatches] : tickerMatches;
        const statusLabel = liveMatches.length ? `${liveMatches.length} LIVE NOW` : "";

        return (
          <aside className="cyber-score-strip fixed left-0 right-0 top-0 z-[70] h-9 border-b border-gold/20 bg-night/95 text-white shadow-xl shadow-black/30 backdrop-blur-xl" aria-label="India live cricket score panel">
            <div className="mx-auto flex h-full max-w-7xl items-center gap-3 px-3 sm:px-8">
              <Link
                to="/india-matches"
                className="inline-flex h-6 shrink-0 items-center gap-2 rounded-full border border-gold/35 bg-gold/12 px-3 text-[0.64rem] font-black uppercase tracking-[0.16em] text-gold"
              >
                <span className={`h-2 w-2 rounded-full ${liveMatches.length ? "bg-crimson shadow-[0_0_12px_rgba(183,25,50,0.9)]" : "bg-gold"}`} />
                India{loading ? " sync" : statusLabel ? ` ${statusLabel}` : ""}
              </Link>
              <div className="india-ticker min-w-0 flex-1 overflow-hidden" aria-live="polite">
                {repeatedMatches.length ? (
                  <div className={`india-ticker-track flex w-max items-center gap-6 ${repeatedMatches.length < 2 ? "animate-none" : ""}`}>
                    {repeatedMatches.map((match, index) => (
                      <IndiaTickerItem key={`${match.id || match.title}-${index}`} match={match} />
                    ))}
                  </div>
                ) : (
                  <p className="truncate text-xs font-semibold text-white/62">
                    {error ? "India match feed is using the last saved update." : "No India live match listed right now. Upcoming and recent matches appear in the India tab."}
                  </p>
                )}
              </div>
              <Link to="/india-matches" className="hidden shrink-0 items-center gap-1 text-[0.64rem] font-black uppercase tracking-[0.16em] text-cyan sm:inline-flex">
                Open <Icon.ArrowRight size={13} />
              </Link>
            </div>
          </aside>
        );
      }

      function IndiaTickerItem({ match }) {
        const teams = asArray(match.teams).map(matchTeamLabel).filter(Boolean);
        const scoreText = teams.length ? teams.join(" vs ") : matchTitle(match);
        return (
          <Link to="/india-matches" className="inline-flex max-w-[86vw] items-center gap-2 text-xs font-semibold text-white/78 sm:max-w-none">
            <span className={`rounded-full border px-2 py-0.5 text-[0.58rem] font-black uppercase tracking-[0.14em] ${match.status === "live" ? "border-crimson/50 bg-crimson/15 text-crimson" : "border-white/12 bg-white/7 text-cyan"}`}>
              {match.statusLabel || match.status || "match"}
            </span>
            <span className="truncate">{scoreText}</span>
            <span className="hidden text-white/42 sm:inline">{match.overview || matchTimeLine(match)}</span>
          </Link>
        );
      }

      function LandingPage() {
        useCursorParallax();

        return (
          <main className="stadium-page-bg page-grain min-h-screen">
            <HeroSection />
            <CricHeroesSection />
            <Footer />
          </main>
        );
      }

      function HeroSection() {
        return (
          <section className="relative min-h-screen overflow-hidden pt-32" aria-labelledby="hero-title">
            <div className="hero-scene" aria-hidden="true">
              <div className="stadium-rim" />
              <StadiumLights />
              <div className="fog-layer" />
              <div className="pitch-lines" />
              <FloatingParticles />
              <BatterSilhouette />
              <AnimatedCricketBall />
            </div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_48%,transparent,rgba(5,7,11,0.44)_40%,rgba(5,7,11,0.88)_88%)]" />
            <div className="relative z-10 mx-auto flex min-h-[calc(100vh-8rem)] max-w-7xl items-center px-5 py-12 sm:px-8">
              <div className="grid w-full items-center gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
                <HeroContent />
                <FeaturedMatchCard />
              </div>
            </div>
            <ScrollIndicator />
          </section>
        );
      }

      function StadiumLights() {
        return (
          <div className="absolute inset-x-0 top-0 h-72" aria-hidden="true">
            <div className="absolute left-[6%] top-0 h-28 w-64 rotate-[-10deg] rounded-b-full bg-white/10 blur-2xl" />
            <div className="absolute right-[7%] top-0 h-28 w-72 rotate-[12deg] rounded-b-full bg-gold/12 blur-2xl" />
            <div className="absolute left-[16%] top-16 h-[440px] w-24 origin-top -rotate-[18deg] bg-gradient-to-b from-white/18 to-transparent blur-xl" />
            <div className="absolute right-[19%] top-14 h-[450px] w-28 origin-top rotate-[18deg] bg-gradient-to-b from-gold/18 to-transparent blur-xl" />
          </div>
        );
      }

      function FloatingParticles() {
        const particles = useMemo(
          () =>
            Array.from({ length: 24 }, (_, index) => ({
              id: index,
              left: `${(index * 41) % 100}%`,
              top: `${14 + ((index * 29) % 70)}%`,
              size: `${2 + (index % 5)}px`,
              alpha: (0.18 + (index % 5) * 0.08).toFixed(2),
              duration: `${11 + (index % 7) * 2}s`,
              delay: `${index * -0.47}s`,
              driftX: `${index % 2 ? 34 : -28}px`,
              driftY: `${-22 - (index % 6) * 7}px`,
              depth: (0.08 + (index % 6) * 0.04).toFixed(2),
            })),
          []
        );

        return (
          <div className="absolute inset-0" aria-hidden="true">
            {particles.map((particle) => (
              <span
                key={particle.id}
                className="particle"
                style={{
                  "--left": particle.left,
                  "--top": particle.top,
                  "--size": particle.size,
                  "--alpha": particle.alpha,
                  "--duration": particle.duration,
                  "--delay": particle.delay,
                  "--drift-x": particle.driftX,
                  "--drift-y": particle.driftY,
                  "--depth": particle.depth,
                }}
              />
            ))}
          </div>
        );
      }

      function BatterSilhouette() {
        return (
          <div className="batter-silhouette" aria-hidden="true">
            <div className="bat" />
            <div className="head" />
            <div className="body" />
            <div className="front-arm" />
            <div className="back-arm" />
            <div className="front-leg" />
            <div className="back-leg" />
          </div>
        );
      }

      function AnimatedCricketBall() {
        const reduceMotion = useReducedMotion();

        return (
          <motion.div
            className="cricket-ball right-[5%] top-[18%] z-[3] opacity-35 sm:right-[12%] sm:top-[18%] sm:opacity-100"
            initial={{ x: 0, y: 0, scale: 0.82, rotate: 0 }}
            animate={
              reduceMotion
                ? { opacity: 0.74 }
                : {
                    x: [-4, -120, -210, -70],
                    y: [0, 90, 190, 48],
                    scale: [0.82, 1, 1.15, 0.92],
                    rotate: [0, 150, 315, 420],
                  }
            }
            transition={{
              duration: 16,
              repeat: Infinity,
              repeatType: "mirror",
              ease: "easeInOut",
            }}
            aria-label="Slow moving cricket ball"
          />
        );
      }

      function HeroContent() {
        const navigate = useNavigate();

        return (
          <motion.div
            className="max-w-4xl text-center lg:text-left"
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
            }}
          >
            <Reveal>
              <p className="mb-5 text-xs font-extrabold uppercase tracking-[0.38em] text-cyan/90">
                THE GLOBAL CRICKET COMMUNITY
              </p>
            </Reveal>
            <Reveal y={54}>
              <h1
                id="hero-title"
                className="font-display text-[clamp(3.25rem,9vw,7.4rem)] font-black uppercase leading-[0.86] text-white"
              >
                Cricket Is More
                <span className="block">Than a Game.</span>
                <span className="block">
                  It Is Your{" "}
                  <span className="bg-gradient-to-r from-gold via-white to-gold bg-clip-text text-transparent drop-shadow-[0_0_24px_rgba(244,185,66,0.22)]">
                    Legacy.
                  </span>
                </span>
              </h1>
            </Reveal>
            <Reveal>
              <div className="gold-divider mx-auto my-7 lg:mx-0" />
            </Reveal>
            <Reveal>
              <p className="mx-auto max-w-2xl text-lg leading-8 text-white/76 sm:text-xl lg:mx-0">
                Follow Kurukshetra Warriors match info, explore player form and open the official CricHeroes team pages.
              </p>
            </Reveal>
            <Reveal>
              <p className="mt-4 font-display text-2xl font-bold uppercase text-gold">
                Watch. Play. Share the Madness.
              </p>
            </Reveal>
            <Reveal>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center lg:justify-start">
                <button
                  type="button"
                  onClick={() => navigate("/players")}
                  className="shine-button inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-gold px-7 text-sm font-black uppercase tracking-[0.18em] text-night shadow-[0_0_46px_rgba(244,185,66,0.32)] transition hover:scale-[1.03]"
                  aria-label="Open Kurukshetra Warriors player profiles"
                >
                  Explore Players <Icon.ArrowRight size={19} />
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/warriors")}
                  className="inline-flex min-h-14 items-center justify-center gap-3 rounded-full border border-gold/35 bg-white/8 px-7 text-sm font-black uppercase tracking-[0.18em] text-white backdrop-blur-xl transition hover:border-gold hover:bg-gold/10 hover:text-gold"
                  aria-label="Open Kurukshetra Warriors match updates"
                >
                  Live Updates <Icon.ChevronDown size={19} />
                </button>
              </div>
            </Reveal>
            <Reveal>
              <p className="mt-5 text-sm font-semibold uppercase tracking-[0.2em] text-white/54">
                Home of the founding team - Kurukshetra Warriors - <Link to="/captain/ankit-kulshreshtha" className="text-gold underline decoration-gold/40 underline-offset-4 hover:text-white">Captain Ankit Kulshreshtha</Link>
              </p>
            </Reveal>
          </motion.div>
        );
      }

      function Reveal({ children, y = 34 }) {
        return (
          <motion.div
            variants={{
              hidden: { opacity: 0.01, y },
              show: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.52, ease }}
          >
            {children}
          </motion.div>
        );
      }

      function FeaturedMatchCard() {
        const { loading, data } = useLiveCricketFeed();
        const liveMatch = data.liveMatches?.[0];
        const nextMatch = data.upcomingMatches?.[0];
        const latestMatch = data.recentMatches?.[0] || data.matches?.[0];
        const displayMatch = liveMatch || nextMatch || latestMatch;
        const latestHighlight = latestMatchPlayerHighlight(latestMatch, data.players || []);
        const topPlayer = data.players?.find((player) => player.performance?.awards > 0) || data.players?.[0];
        const topRival = data.opponents?.[0];

        return (
          <motion.aside
            className="cyber-live-console interactive-card glass relative mx-auto mt-6 w-full max-w-sm rounded-[8px] p-5 lg:ml-auto lg:mt-48"
            initial={{ opacity: 0, y: 36, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: [0, -10, 0], filter: "blur(0px)" }}
            transition={{ opacity: { duration: 0.8, delay: 1.2 }, y: { duration: 7, repeat: Infinity, ease: "easeInOut" } }}
            aria-label="Live CricHeroes match and player preview"
          >
            <div className="mb-5 flex items-center justify-between">
              <p className="text-[0.68rem] font-black uppercase tracking-[0.24em] text-gold">
                Top Live Dashboard
              </p>
              <span className="live-beacon flex items-center gap-2 rounded-full border border-gold/45 bg-gold/12 px-3 py-1 text-[0.62rem] font-black uppercase tracking-[0.16em] text-gold">
                <span className="h-2 w-2 rounded-full bg-gold shadow-[0_0_12px_rgba(244,185,66,0.9)]" />
                {loading ? "Syncing" : "CricHeroes"}
              </span>
            </div>

            {liveMatch && (
              <div className="mb-4 rounded-[8px] border border-crimson/35 bg-crimson/12 p-3">
                <p className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-crimson">Live now</p>
                <p className="mt-1 text-sm font-semibold leading-6 text-white/78">
                  {liveMatch.resultText || liveMatch.status || "CricHeroes live score is updating."}
                </p>
              </div>
            )}

            {displayMatch ? (
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <TeamScore initials="KW" team={data.team?.name || "Kurukshetra Warriors"} score={displayMatch.ourScore} />
                <span className="font-display text-xl font-black text-white/40">VS</span>
                <TeamScore initials={initialsFromName(displayMatch.opponent)} team={displayMatch.opponent} score={displayMatch.opponentScore} align="right" />
              </div>
            ) : (
              <div className="rounded-[8px] border border-gold/18 bg-night/55 p-4">
                <p className="font-display text-3xl font-black uppercase text-white">CricHeroes feed ready</p>
                <p className="mt-2 text-sm text-white/62">Upload the latest data file to show match updates here.</p>
              </div>
            )}

            <div className="mt-5 grid gap-3">
              <HeroLiveTile
                label={liveMatch ? "Live Match" : nextMatch ? "Next Match" : "Match Updates"}
                title={liveMatch ? `Warriors vs ${liveMatch.opponent}` : nextMatch ? `Warriors vs ${nextMatch.opponent}` : latestMatch?.resultText || "Waiting for latest score"}
                detail={displayMatch ? `${formatFeedDate(displayMatch.date)} - ${displayMatch.venue || displayMatch.city || "CricHeroes"}` : "Sync data/crickuru-live.json"}
              />
              <HeroLiveTile
                label="Latest game standout"
                title={latestHighlight?.name || "Scorecard highlight"}
                detail={latestHighlight?.detail || "Player moments appear after the latest scorecard sync"}
              />
              <HeroLiveTile
                label="Player Tracker"
                title={topPlayer?.name || "Warriors roster"}
                detail={topPlayer?.badges?.slice(0, 3).join(" / ") || "Badges update from synced performance"}
              />
              <HeroLiveTile
                label="Rival Form"
                title={topRival?.name || "Opponent teams"}
                detail={topRival ? `${topRival.lastResult} - ${topRival.lastScore || "score pending"}` : "Opponent cards update after sync"}
              />
            </div>
            <a
              href={CricLinks.matches}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex w-full min-h-11 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/7 text-sm font-bold uppercase tracking-[0.16em] text-white/84 transition hover:border-gold/60 hover:text-gold"
            >
              Open Matches <Icon.ExternalLink size={16} />
            </a>
          </motion.aside>
        );
      }

      function latestMatchPlayerHighlight(match, players = []) {
        if (!match) return null;
        const scorecard = match.scorecard || {};
        const lines = [
          ...asArray(scorecard.batting),
          ...asArray(scorecard.bowling),
          ...asArray(scorecard.fielding),
        ].filter((line) => line?.playerName || line?.player_name || line?.name);
        const award = scorecard.playerOfTheMatch || {};
        const awardId = String(award.player_id || match.awards?.playerOfMatch || "");
        const hasAward = Boolean(awardId && awardId !== "0");
        const awardName = cleanMatchText(award.player_name || award.playerName);
        const player = players.find((candidate) => {
          const candidateId = String(candidate?.id || candidate?.playerId || "");
          return hasAward && candidateId === awardId;
        }) || (awardName ? players.find((candidate) => cleanMatchText(candidate?.name).toLocaleLowerCase() === awardName.toLocaleLowerCase()) : null);
        const playerName = cleanMatchText(player?.name || awardName);
        const matchingLines = lines.filter((line) => {
          const lineId = String(line?.playerId || line?.player_id || "");
          const lineName = cleanMatchText(line?.playerName || line?.player_name || line?.name).toLocaleLowerCase();
          return (hasAward && lineId === awardId) || (playerName && lineName === playerName.toLocaleLowerCase());
        });
        const batting = matchingLines.find((line) => line?.runs !== undefined);
        const bowling = matchingLines.find((line) => line?.wickets !== undefined);
        const fielding = matchingLines.find((line) => line?.catches !== undefined || line?.stumpings !== undefined || line?.runOuts !== undefined);
        const performance = [];
        if (batting && Number.isFinite(Number(batting.runs))) {
          performance.push(`${batting.runs} runs${batting.balls ? ` off ${batting.balls}` : ""}`);
        }
        if (bowling && Number(bowling.wickets) > 0) {
          performance.push(`${bowling.wickets} wicket${Number(bowling.wickets) === 1 ? "" : "s"}`);
        }
        if (fielding) {
          const catches = Number(fielding.catches) || 0;
          const stumpings = Number(fielding.stumpings) || 0;
          if (catches) performance.push(`${catches} catch${catches === 1 ? "" : "es"}`);
          if (stumpings) performance.push(`${stumpings} stumping${stumpings === 1 ? "" : "s"}`);
        }
        if (!playerName && !matchingLines.length) return null;
        const label = awardName || hasAward ? "Player of the Match" : "Latest scorecard impact";
        const detail = `${label}${performance.length ? ` · ${performance.join(" · ")}` : " · Impact recorded in latest scorecard"}`;
        return { name: playerName || cleanMatchText(matchingLines[0]?.playerName || matchingLines[0]?.player_name || matchingLines[0]?.name), detail };
      }

      function matchTopPerformers(match) {
        const scorecard = match?.scorecard || {};
        const performerMap = new Map();
        const isWarriorsLine = (line) => {
          const teamId = Number(line?.teamId || line?.team_id || 0);
          const teamName = cleanMatchText(line?.teamName || line?.team_name).toLocaleLowerCase();
          return teamId === 8626734 || teamName.includes("kurukshetra warriors");
        };
        const add = (line, label, value, weight = 1) => {
          const name = cleanMatchText(line?.playerName || line?.player_name || line?.name);
          if (!name || !Number.isFinite(Number(value)) || Number(value) <= 0) return;
          const key = String(line?.playerId || line?.player_id || name).toLocaleLowerCase();
          const current = performerMap.get(key) || { name, score: 0, details: [] };
          current.score += Number(value) * weight;
          current.details.push(`${value} ${label}`);
          performerMap.set(key, current);
        };

        asArray(scorecard.batting).filter(isWarriorsLine).forEach((line) => {
          add(line, `run${Number(line.runs) === 1 ? "" : "s"}${line.balls ? ` off ${line.balls}` : ""}`, line.runs, 1);
        });
        asArray(scorecard.bowling).filter(isWarriorsLine).forEach((line) => {
          add(line, `wicket${Number(line.wickets) === 1 ? "" : "s"}`, line.wickets, 25);
        });
        asArray(scorecard.fielding).filter(isWarriorsLine).forEach((line) => {
          const catches = Number(line.catches) || 0;
          const stumpings = Number(line.stumpings) || 0;
          const runOuts = Number(line.runOuts || line.runouts) || 0;
          if (catches) add(line, `catch${catches === 1 ? "" : "es"}`, catches, 10);
          if (stumpings) add(line, `stumping${stumpings === 1 ? "" : "s"}`, stumpings, 12);
          if (runOuts) add(line, `run-out${runOuts === 1 ? "" : "s"}`, runOuts, 10);
        });

        return [...performerMap.values()]
          .map((performer) => ({ ...performer, details: [...new Set(performer.details)].slice(0, 2) }))
          .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
          .slice(0, 3);
      }

      function HeroLiveTile({ label, title, detail }) {
        return (
          <div className="interactive-card rounded-[8px] border border-white/10 bg-night/55 p-3">
            <p className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-cyan">{label}</p>
            <p className="mt-1 font-display text-2xl font-black uppercase leading-none text-white">{title}</p>
            <p className="mt-2 text-xs font-semibold leading-5 text-white/55">{detail}</p>
          </div>
        );
      }

      function TeamScore({ initials, team, score, align = "left" }) {
        return (
          <div className={align === "right" ? "text-right" : "text-left"}>
            <div className={`mb-2 flex items-center gap-2 ${align === "right" ? "justify-end" : ""}`}>
              <span className="grid h-10 w-10 place-items-center rounded-full border border-gold/35 bg-gold/10 font-display text-xl font-black text-gold">
                {initials}
              </span>
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/54">{team}</p>
            <p className="font-display text-4xl font-black text-white">{score}</p>
          </div>
        );
      }

      function ScrollIndicator() {
        const [hidden, setHidden] = useState(false);

        useEffect(() => {
          const onScroll = () => setHidden(window.scrollY > 90);
          window.addEventListener("scroll", onScroll, { passive: true });
          return () => window.removeEventListener("scroll", onScroll);
        }, []);

        return (
          <motion.div
            className="pointer-events-none absolute bottom-6 left-1/2 z-20 hidden -translate-x-1/2 flex-col items-center gap-3 text-center md:flex"
            animate={{ opacity: hidden ? 0 : 1 }}
            transition={{ duration: 0.35 }}
            aria-hidden="true"
          >
            <Icon.Mouse className="text-white/62" size={23} />
            <p className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-white/58">Scroll to Enter</p>
            <motion.span
              className="h-12 w-px bg-gradient-to-b from-gold to-transparent"
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
        );
      }

      function CricHeroesSection() {
        const { loading, data } = useLiveCricketFeed();
        const [tab, setTab] = useState("matches");
        const tabs = [
          { id: "matches", label: "Matches", icon: Icon.CalendarDays },
          { id: "members", label: "Members", icon: Icon.Users },
        ];
        const lastThreeMatches = [...asArray(data.recentMatches).filter((match) => match?.status === "past" || match?.state === "past" || match?.result)]
          .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
          .slice(0, 3);

        return (
          <section id="team-hub" className="relative overflow-hidden bg-night/82 px-5 py-24 sm:px-8" aria-labelledby="cricheroes-title">
            <div className="absolute inset-0" aria-hidden="true">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/35 to-transparent" />
              <div className="absolute left-1/2 top-32 h-[520px] w-[760px] -translate-x-1/2 rounded-full bg-cyan/6 blur-3xl" />
            </div>
            <div className="relative mx-auto max-w-7xl">
              <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.32em] text-gold">Kurukshetra Warriors</p>
                  <h2 id="cricheroes-title" className="mt-4 font-display text-5xl font-black uppercase leading-none text-white sm:text-7xl">
                    Official Team Info
                  </h2>
                  <p className="mt-6 max-w-xl text-lg leading-8 text-white/66">
                    Follow Kurukshetra Warriors on CricHeroes for real matches, squad members and team activity.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 lg:justify-end" role="tablist" aria-label="Kurukshetra Warriors tabs">
                  {tabs.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      role="tab"
                      aria-selected={tab === item.id}
                      onClick={() => setTab(item.id)}
                      className={`funk-tab inline-flex min-h-12 items-center gap-2 rounded-full border px-5 text-sm font-black uppercase tracking-[0.16em] transition ${
                        tab === item.id
                          ? "border-gold/60 text-gold shadow-[0_0_34px_rgba(244,185,66,0.18)]"
                          : "border-white/12 text-white/64 hover:border-white/25 hover:text-white"
                      }`}
                    >
                      <item.icon size={17} /> {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-10">
                <AnimatePresence mode="wait">
                  {tab === "matches" && <MatchesPanel key="matches" matches={lastThreeMatches} players={asArray(data.players)} loading={loading} syncedAt={data.syncedAt} />}
                  {tab === "members" && <MembersPanel key="members" />}
                </AnimatePresence>
              </div>
            </div>
          </section>
        );
      }

      function PanelShell({ children }) {
        return (
          <motion.div
            initial={{ opacity: 0, y: 24, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -16, filter: "blur(10px)" }}
            transition={{ duration: 0.45, ease }}
          >
            {children}
          </motion.div>
        );
      }

      function MatchesPanel({ matches = [], players = [], loading = false, syncedAt = "" }) {
        return (
          <PanelShell>
            <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="grid gap-5 md:grid-cols-3 lg:grid-cols-1">
                {matches.length ? matches.map((match) => <HomeRecentMatchCard key={match.id} match={match} players={players} />) : (
                  <article className="rounded-[8px] border border-white/12 bg-night/55 p-5 md:col-span-3 lg:col-span-1">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan">{loading ? "Syncing CricHeroes" : "Recent Warriors matches"}</p>
                    <h3 className="mt-3 font-display text-3xl font-black uppercase text-white">{loading ? "Loading latest results" : "No completed matches yet"}</h3>
                    <p className="mt-2 text-sm leading-6 text-white/55">{loading ? "The latest scorecards will appear here automatically." : `Feed checked ${formatFeedDate(syncedAt)}`}</p>
                  </article>
                )}
              </div>
              <div className="glass rounded-[8px] p-6">
                <div className="flex items-center gap-3">
                  <div className="grid h-14 w-14 place-items-center rounded-[8px] bg-crimson/14 text-crimson">
                    <Icon.Swords size={28} />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-white/48">Official Source</p>
                    <h3 className="font-display text-3xl font-black uppercase text-white">CricHeroes Matchbook</h3>
                  </div>
                </div>
                <p className="mt-6 leading-8 text-white/68">
                  The official Kurukshetra Warriors match page is linked here so fans can open the full scorecards, match history and CricHeroes details without any fake sync.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <a
                    href={CricLinks.matches}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shine-button inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-gold px-5 text-sm font-black uppercase tracking-[0.16em] text-night"
                  >
                    Open Matches <Icon.ExternalLink size={16} />
                  </a>
                  <a
                    href={CricLinks.members}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/7 px-5 text-sm font-black uppercase tracking-[0.16em] text-white transition hover:border-gold/55 hover:text-gold"
                  >
                    Open Members <Icon.ExternalLink size={16} />
                  </a>
                </div>
              </div>
            </div>
          </PanelShell>
        );
      }

      function MembersPanel() {
        const memberTiles = [
          { initials: "KW", role: "Official Squad", label: "CricHeroes roster" },
          { initials: "BAT", role: "Batting Unit", label: "Open member page" },
          { initials: "ALL", role: "All-rounders", label: "Verified profiles" },
          { initials: "BWL", role: "Bowling Unit", label: "Team members" },
        ];

        return (
          <PanelShell>
            <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="glass rounded-[8px] p-6">
                <p className="text-xs font-black uppercase tracking-[0.26em] text-cyan">Members</p>
                <h3 className="mt-3 font-display text-5xl font-black uppercase leading-none text-white">Warriors Roster Wall</h3>
                <p className="mt-5 leading-8 text-white/68">
                  The official player list stays on CricHeroes. This CricKuru panel is designed to showcase verified player profiles once the final member names are added.
                </p>
                <a
                  href={CricLinks.members}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-gold px-6 text-sm font-black uppercase tracking-[0.16em] text-night transition hover:scale-[1.03]"
                >
                  Open Official Members <Icon.ExternalLink size={16} />
                </a>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {memberTiles.map((member, index) => (
                  <motion.article
                    key={member.role}
                    className="relative overflow-hidden rounded-[8px] border border-white/12 bg-white/[0.045] p-5"
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.08, duration: 0.42, ease }}
                  >
                    <div className="absolute right-[-24px] top-[-24px] h-24 w-24 rounded-full bg-gold/10 blur-2xl" />
                    <div className="grid h-16 w-16 place-items-center rounded-[8px] border border-gold/28 bg-gold/10 font-display text-2xl font-black text-gold">
                      {member.initials}
                    </div>
                    <h4 className="mt-6 font-display text-3xl font-black uppercase text-white">{member.role}</h4>
                    <p className="mt-2 text-sm font-semibold uppercase tracking-[0.16em] text-white/46">{member.label}</p>
                  </motion.article>
                ))}
              </div>
            </div>
          </PanelShell>
        );
      }

      function LiveMatchIntelSection() {
        const { loading, error, data } = useLiveCricketFeed();
        const matches = data.matches || [];
        const liveMatches = data.liveMatches || [];
        const upcomingMatches = data.upcomingMatches || [];
        const recentMatches = data.recentMatches || matches;
        const players = data.players || [];
        const opponents = data.opponents || [];
        const liveMatch = liveMatches[0];
        const nextMatch = upcomingMatches[0];
        const latestMatch = recentMatches[0] || matches[0];
        const visiblePlayers = players.slice(0, 6);
        const visibleOpponents = opponents.slice(0, 4);
        const hasFeed = Boolean(matches.length || players.length || opponents.length);

        return (
          <section id="live-intel" className="relative overflow-hidden bg-[linear-gradient(180deg,#05070B,#080D16_54%,#05070B)] px-5 py-24 sm:px-8" aria-labelledby="live-intel-title">
            <div className="absolute inset-0" aria-hidden="true">
              <div className="absolute left-[-10%] top-24 h-96 w-96 rounded-full bg-gold/8 blur-3xl" />
              <div className="absolute right-[-8%] bottom-12 h-96 w-96 rounded-full bg-cyan/8 blur-3xl" />
            </div>
            <div className="relative mx-auto max-w-7xl">
              <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.32em] text-cyan">Live CricHeroes Intelligence</p>
                  <h2 id="live-intel-title" className="mt-4 font-display text-5xl font-black uppercase leading-none text-white sm:text-7xl">
                    Match Updates, Player Badges and Rival Form
                  </h2>
                  <p className="mt-6 max-w-2xl text-lg leading-8 text-white/66">
                    CricKuru reads the synced CricHeroes feed, then updates Warriors performance badges and opponent cards from the latest match data.
                  </p>
                </div>
                <div className="glass rounded-[8px] p-5">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <LiveStat label="Live" value={data.summary?.live ?? liveMatches.length ?? "-"} />
                    <LiveStat label="Upcoming" value={data.summary?.upcoming ?? upcomingMatches.length ?? "-"} />
                    <LiveStat label="Warriors wins" value={data.summary?.wins ?? "-"} />
                  </div>
                  <div className="mt-4 flex flex-col gap-3 text-sm text-white/58 sm:flex-row sm:items-center sm:justify-between">
                    <span>{loading ? "Syncing CricHeroes feed..." : `Score feed checked: ${formatFeedDate(data.syncedAt)}`}</span>
                    <a href={data.team?.matchesUrl || CricLinks.matches} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-black uppercase tracking-[0.16em] text-gold">
                      CricHeroes <Icon.ExternalLink size={15} />
                    </a>
                  </div>
                </div>
              </div>

              {!hasFeed ? (
                <LiveFeedEmpty loading={loading} error={error} />
              ) : (
                <div className="mt-10 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
                  <div className="grid gap-5">
                    {liveMatch && <WarriorsLiveNowCard match={liveMatch} team={data.team} />}
                    {nextMatch && <NextLiveMatchCard match={nextMatch} team={data.team} />}
                    {latestMatch && <LatestLiveMatchCard match={latestMatch} team={data.team} />}
                    <div className="glass rounded-[8px] p-5">
                      <div className="mb-5 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.24em] text-white/45">Recent scorecards</p>
                          <h3 className="font-display text-3xl font-black uppercase text-white">CricHeroes Match Pulse</h3>
                        </div>
                        {error && <span className="rounded-full border border-crimson/35 bg-crimson/10 px-3 py-1 text-xs font-bold text-crimson">Using last feed</span>}
                      </div>
                      <div className="grid gap-3">
                        {recentMatches.slice(0, 4).map((match) => <LiveMatchRow key={match.id} match={match} />)}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-5">
                    <div className="glass rounded-[8px] p-5">
                      <p className="text-xs font-black uppercase tracking-[0.24em] text-gold">Warriors badges</p>
                      <h3 className="mt-2 font-display text-3xl font-black uppercase text-white">Player Performance Wall</h3>
                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        {visiblePlayers.map((player) => <PlayerBadgeCard key={player.id} player={player} />)}
                      </div>
                    </div>
                    <div className="glass rounded-[8px] p-5">
                      <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan">Opponent cards</p>
                      <h3 className="mt-2 font-display text-3xl font-black uppercase text-white">Rival Form Tracker</h3>
                      <div className="mt-5 grid gap-3">
                        {visibleOpponents.map((opponent) => <OpponentIntelCard key={opponent.id} opponent={opponent} />)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        );
      }

      function LiveFeedEmpty({ loading, error }) {
        return (
          <div className="mt-10 rounded-[8px] border border-white/12 bg-white/[0.045] p-8 text-center">
            <p className="font-display text-4xl font-black uppercase text-white">{loading ? "Syncing CricHeroes" : "Live Feed Ready"}</p>
            <p className="mx-auto mt-4 max-w-2xl leading-8 text-white/62">
              {error
                ? "The live JSON feed could not load yet. Upload data/crickuru-live.json with the latest synced output and this section will update automatically."
                : "Add CricHeroes sync data to data/crickuru-live.json and this section will show match updates, player badges and opponent performance."}
            </p>
          </div>
        );
      }

      function LiveStat({ label, value }) {
        return (
          <div className="rounded-[8px] border border-white/10 bg-white/[0.04] p-3">
            <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-white/40">{label}</p>
            <p className="mt-1 font-display text-3xl font-black uppercase text-white">{value}</p>
          </div>
        );
      }

      function WarriorsLiveNowCard({ match, team }) {
        return (
          <article className="relative overflow-hidden rounded-[8px] border border-crimson/35 bg-[radial-gradient(circle_at_82%_12%,rgba(183,25,50,0.24),transparent_30%),rgba(255,255,255,0.045)] p-5">
            <div className="absolute right-[-42px] top-[-42px] h-40 w-40 rounded-full bg-crimson/14 blur-3xl" />
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-crimson">Live now from CricHeroes</p>
                <h3 className="mt-2 font-display text-4xl font-black uppercase leading-none text-white">
                  {team?.name || "Kurukshetra Warriors"} vs {match.opponent}
                </h3>
                <p className="mt-3 text-sm font-semibold text-white/50">
                  {formatFeedDate(match.date)} - {match.venue || match.city || "CricHeroes"}
                </p>
              </div>
              <span className="rounded-full border border-crimson/35 bg-crimson/12 px-4 py-2 text-sm font-black uppercase tracking-[0.16em] text-crimson">
                live
              </span>
            </div>
            <div className="relative mt-6 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
              <LiveScoreBlock logo={team?.logo} name={team?.name || "Kurukshetra Warriors"} score={match.ourScore} runRate={match.ourRunRate} />
              <span className="hidden font-display text-2xl font-black text-white/28 sm:block">VS</span>
              <LiveScoreBlock logo={match.opponentLogo} name={match.opponent} score={match.opponentScore} runRate={match.opponentRunRate} align="right" />
            </div>
            <div className="relative mt-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <p className="rounded-[8px] border border-white/10 bg-night/55 p-4 font-display text-3xl font-black uppercase text-white">
                {match.resultText || match.status || "Live score updating"}
              </p>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/44">
                Feed check {formatFeedDate(match.scoreUpdatedAt || match.date)}
              </p>
            </div>
          </article>
        );
      }

      function NextLiveMatchCard({ match, team }) {
        return (
          <article className="relative overflow-hidden rounded-[8px] border border-cyan/24 bg-[radial-gradient(circle_at_82%_12%,rgba(34,211,238,0.16),transparent_30%),rgba(255,255,255,0.045)] p-5">
            <div className="absolute right-[-42px] top-[-42px] h-40 w-40 rounded-full bg-cyan/10 blur-3xl" />
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan">Next scheduled match</p>
                <h3 className="mt-2 font-display text-4xl font-black uppercase leading-none text-white">
                  {team?.name || "Kurukshetra Warriors"} vs {match.opponent}
                </h3>
                <p className="mt-3 text-sm font-semibold text-white/50">{formatFeedDate(match.date)} - {match.venue || match.city || "CricHeroes"}</p>
              </div>
              <span className="rounded-full border border-cyan/35 bg-cyan/10 px-4 py-2 text-sm font-black uppercase tracking-[0.16em] text-cyan">
                upcoming
              </span>
            </div>
            <p className="relative mt-5 rounded-[8px] border border-white/10 bg-night/55 p-4 font-display text-3xl font-black uppercase text-white">
              CricHeroes sync checks this fixture frequently and refreshes the site automatically.
            </p>
          </article>
        );
      }

      function LatestLiveMatchCard({ match, team }) {
        const resultTone = match.result === "win" ? "text-gold" : match.result === "loss" ? "text-crimson" : "text-cyan";
        return (
          <article className="relative overflow-hidden rounded-[8px] border border-gold/24 bg-[radial-gradient(circle_at_82%_12%,rgba(244,185,66,0.18),transparent_30%),rgba(255,255,255,0.045)] p-5">
            <div className="absolute right-[-42px] top-[-42px] h-40 w-40 rounded-full bg-gold/10 blur-3xl" />
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-gold">Latest CricHeroes match</p>
                <h3 className="mt-2 font-display text-4xl font-black uppercase leading-none text-white">
                  {team?.name || "Kurukshetra Warriors"} vs {match.opponent}
                </h3>
                <p className="mt-3 text-sm font-semibold text-white/50">{formatFeedDate(match.date)} - {match.venue || match.city || "CricHeroes"}</p>
              </div>
              <span className={`rounded-full border border-white/12 bg-night/72 px-4 py-2 text-sm font-black uppercase tracking-[0.16em] ${resultTone}`}>
                {match.result}
              </span>
            </div>
            <div className="relative mt-6 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
              <LiveScoreBlock logo={team?.logo} name={team?.name || "Kurukshetra Warriors"} score={match.ourScore} runRate={match.ourRunRate} />
              <span className="hidden font-display text-2xl font-black text-white/28 sm:block">VS</span>
              <LiveScoreBlock logo={match.opponentLogo} name={match.opponent} score={match.opponentScore} runRate={match.opponentRunRate} align="right" />
            </div>
            <p className="relative mt-5 rounded-[8px] border border-white/10 bg-night/55 p-4 font-display text-3xl font-black uppercase text-white">
              {match.resultText}
            </p>
          </article>
        );
      }

      function LiveScoreBlock({ logo, name, score, runRate, align = "left" }) {
        return (
          <div className={align === "right" ? "text-right" : "text-left"}>
            <div className={`mb-2 flex items-center gap-3 ${align === "right" ? "justify-end" : ""}`}>
              <LiveAvatar src={logo} name={name} />
              <p className="max-w-[12rem] text-xs font-black uppercase tracking-[0.14em] text-white/54">{name}</p>
            </div>
            <p className="font-display text-5xl font-black text-white">{score || "-"}</p>
            {runRate && <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/42">RR {runRate}</p>}
          </div>
        );
      }

      function LiveMatchRow({ match }) {
        return (
          <article className="flex flex-col gap-3 rounded-[8px] border border-white/10 bg-white/[0.035] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/42">{formatFeedDate(match.date)}</p>
              <h4 className="mt-1 font-display text-2xl font-black uppercase text-white">vs {match.opponent}</h4>
              <p className="text-sm text-white/54">{match.venue || match.city}</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="font-display text-3xl font-black text-gold">{match.ourScore} - {match.opponentScore}</p>
              <p className="text-sm font-semibold text-white/60">{match.resultText}</p>
            </div>
          </article>
        );
      }

      function PlayerBadgeCard({ player }) {
        const awards = player.performance?.awards || 0;
        const primaryBadges = (player.badges || []).slice(0, 4);
        return (
          <article className="rounded-[8px] border border-white/10 bg-white/[0.035] p-4">
            <div className="flex items-center gap-3">
              <LiveAvatar src={player.photo} name={player.name} />
              <div className="min-w-0">
                <h4 className="truncate font-display text-2xl font-black uppercase text-white">{player.name}</h4>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/42">{player.skill || "Warriors squad"}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {primaryBadges.length ? primaryBadges.map((badge) => <BadgePill key={badge} label={badge} />) : <BadgePill label="Roster" />}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <LiveTinyStat label="Awards" value={awards} />
              <LiveTinyStat label="POM" value={player.performance?.playerOfMatch || 0} />
              <LiveTinyStat label="BAT" value={player.performance?.bestBatter || 0} />
            </div>
          </article>
        );
      }

      function OpponentIntelCard({ opponent }) {
        return (
          <article className="rounded-[8px] border border-white/10 bg-white/[0.035] p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <LiveAvatar src={opponent.logo} name={opponent.name} />
                <div className="min-w-0">
                  <h4 className="truncate font-display text-2xl font-black uppercase text-white">{opponent.name}</h4>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/42">{opponent.lastResult}</p>
                </div>
              </div>
              <p className="font-display text-3xl font-black text-gold">{opponent.lastScore || "-"}</p>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <LiveTinyStat label="Games" value={opponent.matches || 0} />
              <LiveTinyStat label="Beat KW" value={opponent.winsAgainstUs || 0} />
              <LiveTinyStat label="Lost" value={opponent.lossesAgainstUs || 0} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {(opponent.badges || ["Opponent"]).slice(0, 3).map((badge) => <BadgePill key={badge} label={badge} />)}
            </div>
          </article>
        );
      }

      function LiveTinyStat({ label, value }) {
        return (
          <div className="rounded-[8px] bg-night/55 p-2">
            <p className="text-[0.6rem] font-black uppercase tracking-[0.14em] text-white/38">{label}</p>
            <p className="font-display text-2xl font-black text-white">{value}</p>
          </div>
        );
      }

      function BadgePill({ label }) {
        const text = String(label || "Badge");
        const lower = text.toLowerCase();
        const tone = lower.includes("danger") || lower.includes("lost")
          ? "border-crimson/35 bg-crimson/10 text-crimson"
          : lower.includes("bowler") || lower.includes("economist") || lower.includes("spearhead") || lower.includes("wildcard")
            ? "border-cyan/35 bg-cyan/10 text-cyan"
            : "border-gold/35 bg-gold/10 text-gold";

        return <span className={`rounded-full border px-3 py-1 text-[0.62rem] font-black uppercase tracking-[0.14em] ${tone}`}>{text}</span>;
      }

      const warriorsDataTabs = [
        { id: "overview", label: "Overview" },
        { id: "matches", label: "Matches" },
        { id: "roster", label: "Roster" },
        { id: "awards", label: "Awards" },
        { id: "trophy", label: "Trophy Room" },
        { id: "opponents", label: "Opponents" },
      ];

      function WarriorsDataPage() {
        const { loading, error, data } = useLiveCricketFeed();
        const [activeTab, setActiveTab] = useState("overview");
        const [selectedPlayer, setSelectedPlayer] = useState(null);
        const team = data.team || liveFeedFallback.team;
        const inventory = data.dataInventory || liveFeedFallback.dataInventory;
        const matches = [...asArray(data.matches)].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        const recentMatches = asArray(data.recentMatches).length
          ? [...asArray(data.recentMatches)].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
          : matches;
        const players = asArray(data.players);
        const opponents = asArray(data.opponents);
        const awards = asArray(data.awardLedger);
        const records = asArray(data.recordLedger);
        const rosterChanges = asArray(data.rosterChangeLog);
        const sourcePages = asArray(inventory.sourcePages);
        const totalMatchesPlayed = Number(data.summary?.matches ?? inventory.matches ?? matches.length);
        const syncText = loading ? "Syncing CricHeroes" : `Updated ${formatFeedDate(data.syncedAt)}`;

        return (
          <main className="route-bg cyber-command-page page-grain min-h-screen px-5 pb-16 pt-36 sm:px-8">
            <section className="mx-auto max-w-7xl">
              <div className="cyber-command-hero grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-end">
                <motion.div className="min-w-0" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }}>
                  <p className="text-xs font-black uppercase tracking-[0.32em] text-cyan">CricHeroes Team Feed</p>
                  <h1 className="mt-4 max-w-full font-display text-5xl font-black uppercase leading-none text-white sm:text-7xl lg:text-8xl">
                    <span className="block">Warriors</span>
                    <span className="block">Data Vault</span>
                  </h1>
                  <p className="mt-6 max-w-full text-lg leading-8 text-white/68 sm:max-w-2xl">
                    Every public Kurukshetra Warriors signal currently available from CricHeroes is pulled into this page: team profile, matches, scorecards, roster, overall player profiles, cross-team recent form, awards and opponent form.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3 text-xs font-black uppercase tracking-[0.16em]">
                    <span className="rounded-full border border-gold/30 bg-gold/10 px-4 py-2 text-gold">{syncText}</span>
                    {error && <span className="rounded-full border border-crimson/35 bg-crimson/10 px-4 py-2 text-crimson">Using saved feed</span>}
                  </div>
                </motion.div>

                <div className="min-w-0 rounded-[8px] border border-white/12 bg-white/[0.045] p-5">
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex min-w-0 items-center gap-4">
                      <LiveAvatar src={team.logo} name={team.name || "Kurukshetra Warriors"} />
                      <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-gold">{team.city || "Greater Noida"}</p>
                        <h2 className="max-w-full font-display text-2xl font-black uppercase leading-none text-white sm:text-4xl">
                          {String(team.name || "Kurukshetra Warriors").split(/\s+/).filter(Boolean).map((word, index) => (
                            <span key={`${word}-${index}`} className="block sm:inline">
                              {index > 0 && <span className="hidden sm:inline"> </span>}{word}
                            </span>
                          ))}
                        </h2>
                        <p className="mt-1 text-sm font-semibold text-white/50">Captain {team.captainName || "listed on CricHeroes"}</p>
                      </div>
                    </div>
                    <a
                      href={team.cricHeroesUrl || CricLinks.profile}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gold px-5 text-sm font-black uppercase tracking-[0.14em] text-night transition hover:scale-[1.03]"
                    >
                      Official Profile <Icon.ExternalLink size={15} />
                    </a>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <LiveStat label="Total matches played" value={totalMatchesPlayed || "-"} />
                    <LiveStat label="Players" value={inventory.players ?? players.length ?? "-"} />
                    <LiveStat label="Opponents" value={inventory.opponents ?? opponents.length ?? "-"} />
                    <LiveStat label="Awards" value={inventory.awards ?? awards.length ?? "-"} />
                  </div>
                  <p className="mt-4 text-[0.62rem] font-black uppercase tracking-[0.16em] text-white/38">Team total checked from CricHeroes {formatFeedDate(data.syncedAt)}</p>
                </div>
              </div>

              <div className="mt-10 flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Kurukshetra Warriors CricHeroes data sections">
                {warriorsDataTabs.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`shrink-0 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.14em] transition ${
                      activeTab === item.id
                        ? "border-gold/60 bg-gold/12 text-gold"
                        : "border-white/12 bg-white/[0.045] text-white/58 hover:border-white/25 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <section className="mt-6" aria-live="polite">
                {activeTab === "overview" && <WarriorsOverviewPanel data={data} sourcePages={sourcePages} />}
                {activeTab === "matches" && <WarriorsMatchesPanel matches={matches} awards={awards} />}
                {activeTab === "roster" && <WarriorsRosterPanel players={players} memberSummary={data.memberSummary} rosterChanges={rosterChanges} onSelectPlayer={setSelectedPlayer} />}
                {activeTab === "awards" && <WarriorsAwardsPanel awards={awards} />}
                {activeTab === "trophy" && <WarriorsTrophyRoomPanel records={records} updatedAt={data.playerStatsUpdatedAt || data.syncedAt} />}
                {activeTab === "opponents" && <WarriorsOpponentsPanel opponents={opponents} />}
              </section>
            </section>
            {selectedPlayer && <PlayerDetailModal player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />}
          </main>
        );
      }

      function WarriorsOverviewPanel({ data, sourcePages }) {
        const team = data.team || liveFeedFallback.team;
        const summary = data.summary || liveFeedFallback.summary;
        const memberSummary = data.memberSummary || liveFeedFallback.memberSummary;
        const insights = data.matchInsights || liveFeedFallback.matchInsights;
        const uniqueSourcePages = [...new Set([team.cricHeroesUrl || CricLinks.profile, ...sourcePages].filter(Boolean))];

        return (
          <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="grid gap-5">
              <article className="rounded-[8px] border border-white/12 bg-white/[0.045] p-5">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan">Team profile</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <DataFact label="CricHeroes ID" value={team.id || "8626734"} />
                  <DataFact label="Captain" value={team.captainName || "Available on CricHeroes"} />
                  <DataFact label="Created" value={formatFeedDate(team.createdDate)} />
                  <DataFact label="City" value={team.city || "Greater Noida"} />
                  <DataFact label="Active" value={team.isActive ? "Yes" : "Not marked"} />
                  <DataFact label="Secure team" value={team.isSecure ? "Yes" : "Not marked"} />
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  {team.isVerified && <BadgePill label="Verified team" />}
                  {team.isActive && <BadgePill label="Active" />}
                  {team.isSecure && <BadgePill label="Secure roster" />}
                  {team.isAssociationTeam && <BadgePill label="Association team" />}
                </div>
              </article>

              <article className="rounded-[8px] border border-white/12 bg-white/[0.045] p-5">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-gold">Public source pages</p>
                <p className="mt-2 text-sm leading-6 text-white/50">Open the live team pages directly. CricKuru keeps the synchronized data inside the experience.</p>
                <div className="mt-4 grid gap-3">
                  {uniqueSourcePages.map((url) => {
                    const source = publicSourceDetails(url);
                    return (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center justify-between gap-4 rounded-[8px] border border-white/10 bg-night/55 p-4 transition hover:-translate-y-0.5 hover:border-gold/45 hover:bg-gold/[0.06]"
                      >
                        <span className="min-w-0">
                          <span className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-cyan">
                            {source.label}
                            <span className="rounded-full border border-cyan/25 px-2 py-0.5 text-[0.55rem] text-cyan/75">Live source</span>
                          </span>
                          <span className="mt-1 block font-display text-2xl font-black uppercase text-white group-hover:text-gold">{source.title}</span>
                          <span className="mt-1 block text-sm font-semibold text-white/45">{source.description}</span>
                        </span>
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/12 bg-white/[0.04] text-white/55 transition group-hover:border-gold/40 group-hover:text-gold">
                          <Icon.ExternalLink size={16} />
                        </span>
                      </a>
                    );
                  })}
                </div>
              </article>
            </div>

            <div className="grid gap-5">
              <article className="rounded-[8px] border border-white/12 bg-white/[0.045] p-5">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan">Match intelligence</p>
                <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <LiveStat label="Wins" value={summary.wins ?? "-"} />
                  <LiveStat label="Losses" value={summary.losses ?? "-"} />
                  <LiveStat label="Win rate" value={summary.winRate ? `${summary.winRate}%` : "0%"} />
                  <LiveStat label="Live now" value={summary.live ?? "0"} />
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <DataFact label="Average score for" value={insights.averageFor || "-"} />
                  <DataFact label="Average against" value={insights.averageAgainst || "-"} />
                  <DataFact label="Highest Warriors score" value={insights.highestFor ? `${insights.highestFor.score} vs ${insights.highestFor.opponent}` : "-"} />
                  <DataFact label="Highest conceded" value={insights.highestAgainst ? `${insights.highestAgainst.score} vs ${insights.highestAgainst.opponent}` : "-"} />
                </div>
              </article>

              <div className="grid gap-5 md:grid-cols-2">
                <CountList title="Player skills" items={memberSummary.skills} />
                <CountList title="Batter types" items={memberSummary.batterCategories} />
                <CountList title="Bowler types" items={memberSummary.bowlerCategories} />
                <CountList title="Venues" items={insights.venues} />
              </div>
            </div>
          </div>
        );
      }

      function publicSourceDetails(url) {
        const value = String(url || "");
        if (/\/matches(?:$|\?)/i.test(value)) {
          return { label: "Matchbook", title: "Matches and scorecards", description: "Results, score summaries and match-by-match updates." };
        }
        if (/\/members(?:$|\?)/i.test(value)) {
          return { label: "Roster", title: "Members and player profiles", description: "The public squad list, roles and player identity signals." };
        }
        if (/crickuru-live\.json/i.test(value)) {
          return { label: "Snapshot", title: "CricKuru synced feed", description: "The latest normalized data snapshot used by this site." };
        }
        return { label: "Team profile", title: "Official Kurukshetra Warriors page", description: "Team identity, captain, location and public activity." };
      }

      function WarriorsMatchesPanel({ matches, awards }) {
        if (!matches.length) {
          return <DataEmpty title="No matches in the feed" description="The CricHeroes match list will appear here after the next successful sync." />;
        }

        return (
          <div className="grid gap-4">
            {matches.map((match) => (
              <WarriorsMatchDataCard
                key={`${match.id}-${match.state}`}
                match={match}
                awards={awards.filter((award) => Number(award.matchId) === Number(match.id))}
              />
            ))}
          </div>
        );
      }

      function WarriorsMatchDataCard({ match, awards }) {
        const resultTone = match.result === "win" ? "text-gold" : match.result === "loss" ? "text-crimson" : "text-cyan";

        return (
          <article className="interactive-card rounded-[8px] border border-white/12 bg-white/[0.045] p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-white/42">{formatFeedDate(match.date)} - {match.venue || match.city || "CricHeroes"}</p>
                <h2 className="mt-2 font-display text-4xl font-black uppercase leading-none text-white">Warriors vs {match.opponent}</h2>
                <p className={`mt-3 font-display text-3xl font-black uppercase ${resultTone}`}>{match.resultText || match.status || match.result}</p>
              </div>
              <div className="grid gap-2 text-left lg:text-right">
                <p className="font-display text-4xl font-black text-gold">{match.ourScore || "-"} / {match.opponentScore || "-"}</p>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-white/44">{match.matchType || "Match"} - {match.ballType || "Ball"} - {match.overs || "-"} overs</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <ScorecardMiniList label="Warriors innings" innings={match.scorecards?.warriors} fallback={match.ourScore} />
              <ScorecardMiniList label={`${match.opponent || "Opponent"} innings`} innings={match.scorecards?.opponent} fallback={match.opponentScore} />
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <DataFact label="Toss" value={match.toss || "Not listed"} />
              <DataFact label="Winner" value={match.winner || "Not listed"} />
              <DataFact label="Score checked" value={formatFeedDate(match.scoreUpdatedAt || match.date)} />
            </div>

            {awards.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {awards.map((award) => <BadgePill key={award.id} label={`${award.label}: ${award.playerName}`} />)}
              </div>
            )}
          </article>
        );
      }

      function ScorecardMiniList({ label, innings, fallback }) {
        const rows = asArray(innings);
        return (
          <div className="rounded-[8px] border border-white/10 bg-night/55 p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-white/42">{label}</p>
            {rows.length ? (
              <div className="mt-3 grid gap-2">
                {rows.map((inning, index) => (
                  <div key={`${label}-${index}`} className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold text-white/64">Innings {inning.inning || index + 1}</span>
                    <span className="font-display text-2xl font-black text-white">{inning.score || fallback || "-"}</span>
                    <span className="text-right text-xs font-bold uppercase tracking-[0.14em] text-white/38">RR {inning.runRate || "-"}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 font-display text-2xl font-black text-white">{fallback || "-"}</p>
            )}
          </div>
        );
      }

      function WarriorsRosterPanel({ players, memberSummary, rosterChanges, onSelectPlayer }) {
        if (!players.length) {
          return <DataEmpty title="No players in the feed" description="The CricHeroes member list will appear here after the next successful sync." />;
        }

        const displayPlayers = rankPlayers(players)
          .sort((a, b) => Number(b.isCaptain) - Number(a.isCaptain) || a.rank - b.rank);
        const levelCounts = displayPlayers.reduce((counts, player) => {
          counts[player.level.key] = (counts[player.level.key] || 0) + 1;
          return counts;
        }, {});

        return (
          <div className="grid gap-5">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <LiveStat label="Total" value={memberSummary?.total || players.length} />
              <LiveStat label="Pro" value={levelCounts.pro || 0} />
              <LiveStat label="Semi-Pro" value={levelCounts.semiPro || 0} />
              <LiveStat label="Amateur" value={levelCounts.amateur || 0} />
              <LiveStat label="Verified" value={memberSummary?.verified || 0} />
            </div>
            <p className="max-w-3xl text-sm leading-6 text-white/55">CricKuru levels measure public cricket experience and repeat performance, not employment status. Every level is match-ready, and every amateur player has a visible growth path.</p>
            {rosterChanges.length > 0 && <RosterChangePanel changes={rosterChanges} />}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {displayPlayers.map((player) => <WarriorsRosterDataCard key={player.id || player.name} player={player} rank={player.rank} onSelect={() => onSelectPlayer?.(player)} />)}
            </div>
          </div>
        );
      }

      function WarriorsRosterDataCard({ player, rank, onSelect }) {
        const stats = player.warriorsStats || player.stats || {};
        const level = player.level || playerLevel(player);
        const neon = playerNeonTheme(player.impact || 0, level);
        return (
          <article
            className="player-level-card interactive-card cursor-pointer rounded-[8px] border border-white/12 bg-white/[0.045] p-4 transition hover:bg-gold/[0.05] focus:outline-none focus:ring-2 focus:ring-gold/60"
            style={{ "--player-neon-color": neon.color, "--player-neon-glow": neon.glow }}
            onClick={onSelect}
            onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect?.(); } }}
            role="button"
            tabIndex={0}
            aria-label={`Open full profile for ${player.name}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <LiveAvatar src={player.photo} name={player.name} />
                <div className="min-w-0">
                  <p className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-gold">Roster #{rank}</p>
                  <h2 className="truncate font-display text-3xl font-black uppercase text-white">{player.name}</h2>
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-white/44">{player.role}</p>
                  <PlayerLevelBadge level={level} compact />
                </div>
              </div>
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-white/10 bg-night/60 font-display text-xl font-black text-white">{player.impact}</span>
            </div>
            <PlayerLevelInfographic level={level} />
            <PlayerRankingInfographic player={player} compact />
            <div className="mt-4 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
              <LiveTinyStat label="Runs" value={stats.runs || 0} />
              <LiveTinyStat label="Wkts" value={stats.wickets || 0} />
              <LiveTinyStat label="Best" value={stats.bestScore || 0} />
              <LiveTinyStat label="Field" value={(stats.catches || 0) + (stats.stumpings || 0)} />
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between text-[0.62rem] font-black uppercase tracking-[0.14em] text-white/42">
                <span>Performance charge</span>
                <span>{player.impact}/100</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/8">
                <span className="block h-full rounded-full bg-gradient-to-r from-gold via-cyan to-crimson" style={{ width: `${player.impact}%` }} />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {(player.badges?.length ? player.badges : ["Roster"]).slice(0, 6).map((badge) => <BadgePill key={badge} label={badge} />)}
              {player.associationTag && <BadgePill label={player.associationTag} />}
            </div>
            <button type="button" className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[7px] border border-gold/35 bg-gold/10 px-4 text-xs font-black uppercase tracking-[0.16em] text-gold transition hover:border-gold hover:bg-gold/15 focus:outline-none focus:ring-2 focus:ring-gold/60" onClick={(event) => { event.stopPropagation(); onSelect?.(); }}>
              <Icon.Sparkles size={16} /> Open AI coach + profile
            </button>
          </article>
        );
      }

      function RosterChangePanel({ changes }) {
        return (
          <section className="rounded-[8px] border border-cyan/20 bg-cyan/[0.045] p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan">Roster watch</p>
                <h2 className="mt-2 font-display text-3xl font-black uppercase text-white">Recent squad changes</h2>
              </div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-white/38">Checked every 5 minutes from CricHeroes</p>
            </div>
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {changes.slice(0, 6).map((change, index) => (
                <div key={`${change.type}-${change.playerId}-${change.detectedAt}-${index}`} className="flex items-center justify-between gap-3 rounded-[6px] border border-white/8 bg-night/45 px-3 py-3">
                  <span className="flex min-w-0 items-center gap-3">
                    <LiveAvatar src={change.playerPhoto} name={change.playerName} />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-white/82">{change.playerName}</span>
                      <span className={`block text-xs font-black uppercase tracking-[0.12em] ${change.type === "added" ? "text-cyan" : "text-crimson"}`}>{change.label}</span>
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-xs font-bold text-white/38">{formatFeedDate(change.detectedAt)}</span>
                </div>
              ))}
            </div>
          </section>
        );
      }

      function WarriorsAwardsPanel({ awards }) {
        if (!awards.length) {
          return <DataEmpty title="No awards in the feed" description="CricHeroes award records will appear after they are present on the public match cards." />;
        }

        return (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {awards.map((award) => (
              <article key={award.id} className="rounded-[8px] border border-white/12 bg-white/[0.045] p-4">
                <div className="flex items-center gap-3">
                  <LiveAvatar src={award.playerPhoto} name={award.playerName} />
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan">{award.label}</p>
                    <h2 className="truncate font-display text-3xl font-black uppercase text-white">{award.playerName}</h2>
                    <p className="text-sm font-semibold text-white/50">{award.side}</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-2 text-sm text-white/58">
                  <p>vs {award.opponent}</p>
                  <p>{formatFeedDate(award.date)}</p>
                </div>
                <div className="mt-4">
                  <BadgePill label={award.result || "match award"} />
                </div>
              </article>
            ))}
          </div>
        );
      }

      function WarriorsTrophyRoomPanel({ records, updatedAt }) {
        if (!records.length) {
          return (
            <div className="grid gap-5">
              <div className="rounded-[8px] border border-gold/25 bg-[radial-gradient(circle_at_50%_0%,rgba(244,185,66,0.14),transparent_38%),rgba(255,255,255,0.045)] p-8 text-center">
                <p className="text-xs font-black uppercase tracking-[0.28em] text-gold">Trophy Room</p>
                <h2 className="mt-3 font-display text-5xl font-black uppercase text-white">First record awaits</h2>
                <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-white/55">Rare scorecard achievements will appear here when the public CricHeroes data records a 150+ score, hat-trick, five-wicket haul, four-stumping match or five-catch match.</p>
                <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-white/35">Stats checked {formatFeedDate(updatedAt)}</p>
              </div>
            </div>
          );
        }

        return (
          <div className="grid gap-5">
            <div className="flex flex-col gap-3 rounded-[8px] border border-gold/25 bg-[radial-gradient(circle_at_85%_10%,rgba(244,185,66,0.18),transparent_34%),rgba(255,255,255,0.045)] p-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.28em] text-gold">Trophy Room</p>
                <h2 className="mt-2 font-display text-5xl font-black uppercase text-white">Current record holders</h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-white/55">These all-team records stay on the wall until a stronger performance appears in a later CricHeroes scorecard.</p>
              </div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-white/40">Updated {formatFeedDate(updatedAt)}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {records.map((record) => (
                <article key={record.type} className="rounded-[8px] border border-gold/25 bg-night/55 p-5 shadow-[0_0_30px_rgba(244,185,66,0.08)]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan">{record.title}</p>
                      <h3 className="mt-2 font-display text-3xl font-black uppercase text-white">{record.playerName}</h3>
                    </div>
                    <p className="font-display text-4xl font-black text-gold">{record.value}<span className="ml-1 text-sm uppercase tracking-[0.12em]">{record.unit}</span></p>
                  </div>
                  <div className="mt-5 grid gap-2 text-sm font-semibold text-white/52 sm:grid-cols-2">
                    <span>{record.teamName || "CricHeroes team"} vs {record.opponent || "opponent"}</span>
                    <span className="sm:text-right">{formatFeedDate(record.date)}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <BadgePill label="Current holder" />
                    <BadgePill label="CricHeroes scorecard" />
                  </div>
                </article>
              ))}
            </div>
          </div>
        );
      }

      function WarriorsOpponentsPanel({ opponents }) {
        if (!opponents.length) {
          return <DataEmpty title="No opponents in the feed" description="Opponent cards are built automatically from completed CricHeroes matches." />;
        }

        return (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {opponents.map((opponent) => (
              <article key={opponent.id || opponent.name} className="rounded-[8px] border border-white/12 bg-white/[0.045] p-5">
                <div className="flex items-center gap-3">
                  <LiveAvatar src={opponent.logo} name={opponent.name} />
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-gold">Rival #{opponent.matches || 1}</p>
                    <h2 className="truncate font-display text-3xl font-black uppercase text-white">{opponent.name}</h2>
                    <p className="text-sm font-semibold text-white/50">{opponent.lastResult || "Recorded opponent"}</p>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                  <LiveTinyStat label="Games" value={opponent.matches || 0} />
                  <LiveTinyStat label="Beat KW" value={opponent.winsAgainstUs || 0} />
                  <LiveTinyStat label="Lost" value={opponent.lossesAgainstUs || 0} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(opponent.badges?.length ? opponent.badges : ["Opponent"]).map((badge) => <BadgePill key={badge} label={badge} />)}
                </div>
                <p className="mt-4 text-sm font-semibold text-white/52">Last score: {opponent.lastScore || "-"}</p>
              </article>
            ))}
          </div>
        );
      }

      function CountList({ title, items }) {
        const rows = asArray(items).slice(0, 6);
        return (
          <article className="cyber-panel interactive-card rounded-[8px] border border-white/12 bg-white/[0.045] p-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-gold">{title}</p>
            {rows.length ? (
              <div className="mt-4 grid gap-2">
                {rows.map((item) => (
                  <div key={item.name} className="flex items-center justify-between gap-3 rounded-[8px] bg-night/55 px-3 py-2">
                    <span className="truncate text-sm font-semibold text-white/70">{item.name}</span>
                    <span className="font-display text-2xl font-black text-white">{item.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm leading-6 text-white/52">Waiting for CricHeroes data.</p>
            )}
          </article>
        );
      }

      function DataFact({ label, value }) {
        return (
          <div className="rounded-[8px] border border-white/10 bg-night/55 p-3">
            <p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-white/38">{label}</p>
            <p className="mt-1 text-sm font-bold text-white/78">{value || "-"}</p>
          </div>
        );
      }

      function DataEmpty({ title, description }) {
        return (
          <div className="rounded-[8px] border border-white/12 bg-white/[0.045] p-8 text-center">
            <p className="font-display text-4xl font-black uppercase text-white">{title}</p>
            <p className="mx-auto mt-3 max-w-2xl leading-7 text-white/62">{description}</p>
          </div>
        );
      }

      const playerFilterTabs = [
        { id: "all", label: "All" },
        { id: "awards", label: "Award Winners" },
        { id: "batters", label: "Batters" },
        { id: "bowlers", label: "Bowlers" },
        { id: "verified", label: "Verified" },
        { id: "career", label: "Career tracked" },
      ];

      function PlayersPage() {
        const { loading, error, data } = useLiveCricketFeed();
        const [filter, setFilter] = useState("all");
        const [playerQuery, setPlayerQuery] = useState("");
        const [selectedPlayer, setSelectedPlayer] = useState(null);
        const rosterChanges = asArray(data.rosterChangeLog);
        const players = useMemo(() => {
          return rankPlayers(data.players);
        }, [data.players]);
        const captain = useMemo(() => {
          const captainId = Number(data.team?.captainId || 0);
          const captainName = String(data.team?.captainName || "Ankit Kulshreshtha").trim().toLocaleLowerCase();
          return players.find((player) => captainId && Number(player.id) === captainId)
            || players.find((player) => String(player.name || "").trim().toLocaleLowerCase() === captainName)
            || players.find((player) => String(player.name || "").toLocaleLowerCase().includes("ankit kulshreshtha"));
        }, [data.team?.captainId, data.team?.captainName, players]);
        const normalizedPlayerQuery = playerQuery.trim().toLocaleLowerCase();
        const filteredPlayers = players.filter((player) => {
          if (!playerMatchesFilter(player, filter)) return false;
          if (!normalizedPlayerQuery) return true;
          return [player.name, player.role, player.skill, player.id]
            .filter(Boolean)
            .join(" ")
            .toLocaleLowerCase()
            .includes(normalizedPlayerQuery);
        });
        const openFirstSearchResult = (event) => {
          if (event.key !== "Enter" || !filteredPlayers[0]) return;
          event.preventDefault();
          setSelectedPlayer(filteredPlayers[0]);
        };
        const leaders = {
          impact: players[0],
          batting: [...players].sort((a, b) => (playerOverallStats(b).runs || 0) - (playerOverallStats(a).runs || 0) || b.impact - a.impact)[0],
          bowling: [...players].sort((a, b) => (playerOverallStats(b).wickets || 0) - (playerOverallStats(a).wickets || 0) || b.impact - a.impact)[0],
          fielding: [...players].sort((a, b) => ((playerOverallStats(b).catches || 0) + (playerOverallStats(b).stumpings || 0)) - ((playerOverallStats(a).catches || 0) + (playerOverallStats(a).stumpings || 0)) || b.impact - a.impact)[0],
        };
        const totalAwards = players.reduce((sum, player) => sum + (player.performance?.awards || 0), 0);
        const verifiedCount = players.filter((player) => player.isVerified).length;
        const refreshedStatsCount = players.filter((player) => hasPlayerStats(playerOverallStats(player))).length;
        const feedCheckedAt = data.lastCheckedAt || data.syncedAt;
        const feedChangedAt = data.sourceStatus === "partial"
          ? data.playerRecentMatchesUpdatedAt || data.playerStatsUpdatedAt || data.lastSuccessfulSyncAt || data.syncedAt
          : data.lastSuccessfulSyncAt || data.playerStatsUpdatedAt || data.syncedAt;
        const feedStatus = data.sourceStatus === "stale"
          ? "Using saved CricHeroes data"
          : data.sourceStatus === "partial"
            ? "Recent player form refreshed"
            : "CricHeroes live sync ready";
        const feedStatusClass = data.sourceStatus === "stale"
          ? "border-crimson/35 bg-crimson/10 text-crimson"
          : data.sourceStatus === "partial"
            ? "border-gold/35 bg-gold/10 text-gold"
            : "border-emerald-300/25 bg-emerald-300/10 text-emerald-200";

        return (
          <main className="route-bg cyber-command-page page-grain min-h-screen px-5 pb-16 pt-36 sm:px-8">
            <section className="mx-auto max-w-7xl">
              <div className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-end">
                <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }}>
                  <p className="text-xs font-black uppercase tracking-[0.32em] text-gold">Kurukshetra Warriors</p>
                  <h1 className="mt-4 font-display text-6xl font-black uppercase leading-none text-white sm:text-8xl">
                    Player Command Room
                  </h1>
                  <p className="mt-6 max-w-2xl text-lg leading-8 text-white/68">
                    A mobile-friendly squad wall powered by overall CricHeroes career stats, cross-team recent form, Warriors awards and performance signals.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3 text-xs font-black uppercase tracking-[0.16em]">
                    <span className="rounded-full border border-gold/30 bg-gold/10 px-4 py-2 text-gold">
                      {loading ? "Syncing players" : `${players.length} Warriors`}
                    </span>
                    <span className="rounded-full border border-white/12 bg-white/7 px-4 py-2 text-white/58">
                      Stats changed {formatFeedDate(feedChangedAt)}
                    </span>
                    <span className="rounded-full border border-cyan/20 bg-cyan/6 px-4 py-2 text-cyan/75">
                      Checked {formatFeedDate(feedCheckedAt)}
                    </span>
                    <span className={`rounded-full border px-4 py-2 ${feedStatusClass}`}>
                      {feedStatus}
                    </span>
                    {error && <span className="rounded-full border border-crimson/35 bg-crimson/10 px-4 py-2 text-crimson">Using saved roster</span>}
                  </div>
                </motion.div>

                <div className="cyber-stats-grid grid gap-3 sm:grid-cols-4">
                  <LiveStat label="Players" value={players.length || "-"} />
                  <LiveStat label="Awards" value={totalAwards || "-"} />
                  <LiveStat label="Verified" value={verifiedCount || "-"} />
                  <LiveStat label="Data ready" value={`${refreshedStatsCount}/${players.length || 0}`} />
                </div>
              </div>

              {captain && <CaptainSpotlightCard player={captain} onSelect={() => setSelectedPlayer(captain)} />}

              <div className="cyber-leader-grid mt-10 grid gap-5 lg:grid-cols-4">
                <PlayerLeaderCard label="Impact Leader" player={leaders.impact} metric={`${leaders.impact?.impact || 0}/100`} />
                <PlayerLeaderCard label="Batting Edge" player={leaders.batting} metric={`${playerOverallStats(leaders.batting).runs || 0} RUNS`} />
                <PlayerLeaderCard label="Strike Bowler" player={leaders.bowling} metric={`${playerOverallStats(leaders.bowling).wickets || 0} WKTS`} />
                <PlayerLeaderCard label="Field Watch" player={leaders.fielding} metric={`${(playerOverallStats(leaders.fielding).catches || 0) + (playerOverallStats(leaders.fielding).stumpings || 0)} FIELD`} />
              </div>

              <TopTenFormPanel players={players.slice(0, 10)} />

              {rosterChanges.length > 0 && <RosterChangePanel changes={rosterChanges} />}

              <div className="mt-10 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <label className="relative block min-w-0">
                  <span className="sr-only">Search Warriors players by name</span>
                  <Icon.Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-cyan" />
                  <input
                    type="search"
                    value={playerQuery}
                    onChange={(event) => setPlayerQuery(event.target.value)}
                    onKeyDown={openFirstSearchResult}
                    placeholder="Search player name"
                    aria-label="Search Warriors players by name"
                    autoComplete="off"
                    className="min-h-12 w-full rounded-full border border-cyan/25 bg-white/[0.06] pl-11 pr-12 text-sm font-semibold text-white outline-none transition placeholder:text-white/38 focus:border-cyan focus:ring-2 focus:ring-cyan/20"
                  />
                  {playerQuery && (
                    <button
                      type="button"
                      onClick={() => setPlayerQuery("")}
                      aria-label="Clear player search"
                      title="Clear player search"
                      className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-white/48 transition hover:bg-white/10 hover:text-white"
                    >
                      <Icon.X size={16} />
                    </button>
                  )}
                </label>
                <span className="text-xs font-black uppercase tracking-[0.14em] text-white/45 sm:text-right">
                  {normalizedPlayerQuery ? `${filteredPlayers.length} result${filteredPlayers.length === 1 ? "" : "s"}` : `${players.length} players`}
                </span>
              </div>

              <div className="mt-4 flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Player filters">
                {playerFilterTabs.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={filter === item.id}
                    onClick={() => setFilter(item.id)}
                    className={`shrink-0 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.14em] transition ${
                      filter === item.id
                        ? "border-gold/60 bg-gold/12 text-gold"
                        : "border-white/12 bg-white/[0.045] text-white/58 hover:border-white/25 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {filteredPlayers.length ? (
                <div className="cyber-player-grid mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {filteredPlayers.map((player) => <PlayerProfileCard key={player.id || player.name} player={player} rank={player.rank} onSelect={() => setSelectedPlayer(player)} />)}
                </div>
              ) : (
                <div className="mt-8 rounded-[8px] border border-white/12 bg-white/[0.045] p-8 text-center">
                  <p className="font-display text-4xl font-black uppercase text-white">No players in this filter</p>
                  <p className="mx-auto mt-3 max-w-2xl leading-7 text-white/62">
                    The roster will fill automatically when the CricHeroes member feed exposes matching player data.
                  </p>
                </div>
              )}

              <div className="mt-10 flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-2xl text-sm leading-7 text-white/54">
                  Performance charge is a 1-100 role-aware score built from the public CricHeroes batting, bowling, fielding and captaincy sections. Recent form helps the coach, while ranking confidence stays separate from performance so small samples are not overstated.
                </p>
                <a
                  href={data.team?.membersUrl || CricLinks.members}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-gold/35 bg-gold/10 px-5 text-sm font-black uppercase tracking-[0.16em] text-gold transition hover:border-gold hover:bg-gold/15"
                >
                  Official Members <Icon.ExternalLink size={16} />
                </a>
              </div>
            </section>
            {selectedPlayer && <PlayerDetailModal player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />}
          </main>
        );
      }

      function CaptainSpotlightCard({ player, onSelect }) {
        const stats = visiblePlayerOverallStats(player);
        const captainMatches = playerDetailNumber(stats.captainMatches);
        const captainWinRate = stats.captainWinPercentage || "-";
        const level = player.level || playerLevel(player);
        const neon = playerNeonTheme(player.impact || 0, level);
        return (
          <article
            className="player-level-card relative mt-8 cursor-pointer overflow-hidden rounded-[8px] border border-gold/35 bg-[radial-gradient(circle_at_92%_12%,rgba(244,185,66,0.2),transparent_30%),linear-gradient(135deg,rgba(183,25,50,0.16),rgba(255,255,255,0.045))] p-5 shadow-[0_0_36px_rgba(244,185,66,0.1)] transition hover:-translate-y-1 hover:border-gold focus:outline-none focus:ring-2 focus:ring-gold/60 sm:p-6"
            style={{ "--player-neon-color": neon.color, "--player-neon-glow": neon.glow, "--player-neon-soft": neon.soft }}
            onClick={(event) => { if (!event.target.closest("a")) onSelect?.(); }}
            onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect?.(); } }}
            role="button"
            tabIndex={0}
            aria-label={`Open captain profile for ${player.name}`}
          >
            <div className="absolute right-[-50px] top-[-70px] h-44 w-44 rounded-full bg-gold/10 blur-3xl" aria-hidden="true" />
            <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_auto] lg:items-center">
              <div className="flex min-w-0 items-center gap-4">
                <span className="rounded-full p-1" style={{ boxShadow: "0 0 0 2px #F4B942, 0 0 24px rgba(244,185,66,0.5)" }}>
                  <LiveAvatar src={player.photo} name={player.name} />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[0.64rem] font-black uppercase tracking-[0.22em] text-gold">Team captain</p>
                    <PlayerLevelBadge level={level} compact />
                  </div>
                  <h2 className="mt-2 truncate font-display text-3xl font-black uppercase leading-none text-white sm:text-4xl">{player.name}</h2>
                  <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-white/58">{player.role || "Kurukshetra Warriors captain"} • {level.descriptor}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                <LiveTinyStat label="Captain matches" value={captainMatches || "-"} />
                <LiveTinyStat label="Win rate" value={captainWinRate} />
                <LiveTinyStat label="Career runs" value={stats.runs || "-"} />
                <LiveTinyStat label="Career wkts" value={stats.wickets || "-"} />
              </div>
              <button type="button" onClick={(event) => { event.stopPropagation(); onSelect?.(); }} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[7px] border border-gold/40 bg-gold/10 px-5 text-xs font-black uppercase tracking-[0.16em] text-gold transition hover:border-gold hover:bg-gold/15 focus:outline-none focus:ring-2 focus:ring-gold/60">
                <Icon.CircleUserRound size={16} /> Open captain profile
              </button>
            </div>
          </article>
        );
      }

      function PlayerLeaderCard({ label, player, metric }) {
        return (
          <article className="rounded-[8px] border border-white/12 bg-white/[0.045] p-4">
            <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-cyan">{label}</p>
            {player ? (
              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <LiveAvatar src={player.photo} name={player.name} />
                  <div className="min-w-0">
                    <h2 className="truncate font-display text-2xl font-black uppercase text-white">{player.name}</h2>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/42">{player.role}</p>
                  </div>
                </div>
                <p className="font-display text-3xl font-black text-gold">{metric}</p>
              </div>
            ) : (
              <p className="mt-4 font-display text-2xl font-black uppercase text-white">Roster syncing</p>
            )}
          </article>
        );
      }

      function HomeRecentMatchCard({ match, players }) {
        const performers = matchTopPerformers(match);
        const resultTone = match.result === "win" ? "text-cyan" : match.result === "loss" ? "text-crimson" : "text-gold";
        return (
          <article className="interactive-card score-tile rounded-[8px] border border-white/12 bg-night/55 p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <span className="rounded-full bg-gold/12 px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.18em] text-gold">Last match</span>
              <span className="text-right text-[0.62rem] font-bold uppercase tracking-[0.12em] text-white/42">{formatFeedDate(match.date)}</span>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/45">{match.ballType || "Cricket"} · {match.overs ? `${match.overs} overs` : "Scorecard"}</p>
            <h3 className="mt-2 font-display text-2xl font-black uppercase leading-none text-white">Warriors vs {match.opponent || "Opponent"}</h3>
            <div className="mt-4 grid grid-cols-2 gap-3 border-y border-white/10 py-3">
              <div>
                <p className="text-[0.58rem] font-black uppercase tracking-[0.14em] text-white/40">Kurukshetra Warriors</p>
                <p className="mt-1 font-display text-3xl font-black text-white">{match.ourScore || "-"}</p>
              </div>
              <div className="text-right">
                <p className="text-[0.58rem] font-black uppercase tracking-[0.14em] text-white/40">{match.opponent || "Opponent"}</p>
                <p className="mt-1 font-display text-3xl font-black text-white">{match.opponentScore || "-"}</p>
              </div>
            </div>
            <p className={`mt-3 text-sm font-black uppercase tracking-[0.08em] ${resultTone}`}>{match.resultText || "Result updating"}</p>
            <div className="mt-4 border-t border-white/10 pt-3">
              <p className="text-[0.58rem] font-black uppercase tracking-[0.16em] text-cyan">Top Warriors performers</p>
              {performers.length ? (
                <div className="mt-2 grid gap-1.5">
                  {performers.map((performer) => <p key={performer.name} className="flex items-center justify-between gap-3 text-xs"><span className="truncate font-bold text-white/78">{performer.name}</span><span className="shrink-0 text-white/48">{performer.details.join(" · ")}</span></p>)}
                </div>
              ) : <p className="mt-2 text-xs text-white/45">Top-player lines will appear after the scorecard sync.</p>}
            </div>
            {match.scorecardUrl && <a href={match.scorecardUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-gold hover:text-white">Open scorecard <Icon.ExternalLink size={13} /></a>}
          </article>
        );
      }

      function TopTenFormPanel({ players }) {
        return (
          <section className="cyber-rank-board mt-8 rounded-[8px] border border-cyan/20 bg-cyan/[0.045] p-4 sm:p-5" aria-labelledby="top-ten-form-title">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-cyan">Ranked form board</p>
                <h2 id="top-ten-form-title" className="mt-1 font-display text-3xl font-black uppercase text-white">Top 10 + recent matches</h2>
              </div>
              <p className="max-w-xl text-xs leading-5 text-white/48">Career totals come from the public CricHeroes snapshot. Recent form is pulled from each player’s cross-team match history and links directly to the scorecard.</p>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {players.map((player) => {
                const stats = playerOverallStats(player);
                const recentMatches = playerRecentForm(player, 2);
                return (
                  <article key={`top-ten-${player.id || player.name}`} className="cyber-mini-card min-w-0 rounded-[7px] border border-white/10 bg-night/55 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[0.56rem] font-black uppercase tracking-[0.16em] text-gold">Rank {player.rank}</p>
                        <h3 className="mt-1 truncate text-sm font-black uppercase text-white" title={player.name}>{player.name}</h3>
                      </div>
                      <span className="shrink-0 font-display text-xl font-black text-cyan">{player.impact}</span>
                    </div>
                    <p className="mt-2 truncate text-[0.58rem] font-black uppercase tracking-[0.1em] text-white/42">{stats.matches || "-"} matches • {stats.runs || "-"} runs • {stats.wickets || "-"} wkts</p>
                    <div className="mt-3 border-t border-white/8 pt-2">
                      <p className="text-[0.56rem] font-black uppercase tracking-[0.14em] text-white/35">Latest form</p>
                      {recentMatches.length ? (
                        <div className="mt-2 grid gap-1.5">
                          {recentMatches.map((match) => (
                            <a key={`top-form-${player.id}-${match.id || match.scorecardUrl}`} href={match.performance?.scorecardUrl || match.scorecardUrl} target="_blank" rel="noopener noreferrer" className="block min-w-0 rounded-[5px] border border-white/8 px-2 py-1.5 text-[0.64rem] leading-4 text-white/68 transition hover:border-gold/35 hover:text-white">
                              <span className="block truncate font-semibold">{match.performance?.highlight || `${match.teamA || "Match"} vs ${match.teamB || "opponent"}`}</span>
                              <span className="block truncate text-[0.55rem] text-white/35">{match.performance?.teamName || "Cross-team"} • {formatFeedDate(match.date)}</span>
                            </a>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-[0.64rem] leading-4 text-white/38">No public recent match line yet.</p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      }

      function PlayerProfileCard({ player, rank, onSelect }) {
        const awards = player.performance?.awards || 0;
        const activity = asArray(player.performance?.recentAwards).slice(0, 3);
        const recentMatches = playerRecentForm(player, 3);
        const stats = playerOverallStats(player);
        const hasStats = hasPlayerStats(stats);
        const impact = player.impact || 0;
        const level = player.level || playerLevel(player);
        const neon = playerNeonTheme(impact, level);
        const improvementReport = createImprovementReport(player, stats);

        return (
          <article
            className="cyber-player-card player-level-card interactive-card group relative cursor-pointer overflow-hidden rounded-[8px] border border-white/12 bg-[radial-gradient(circle_at_85%_8%,rgba(244,185,66,0.14),transparent_28%),rgba(255,255,255,0.045)] p-2 focus:outline-none focus:ring-2 focus:ring-gold/60 sm:p-5 lg:aspect-square lg:overflow-visible lg:p-3"
            style={{ "--player-neon-color": neon.color, "--player-neon-glow": neon.glow }}
            onClick={(event) => { if (!event.target.closest("a")) onSelect?.(); }}
            onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect?.(); } }}
            role="button"
            tabIndex={0}
            aria-label={`Open full profile for ${player.name}`}
          >
            <div className="absolute right-[-56px] top-[-56px] h-40 w-40 rounded-full bg-cyan/8 blur-3xl" aria-hidden="true" />
            <div className="relative flex items-start justify-between gap-1.5 sm:gap-3 lg:gap-2">
              <div className="flex min-w-0 items-center gap-1.5 sm:gap-3 lg:gap-2">
                <LiveAvatar src={player.photo} name={player.name} className="h-8 w-8 text-sm sm:h-12 sm:w-12 sm:text-xl lg:h-9 lg:w-9 lg:text-sm" />
                <div className="min-w-0">
                  <p className="text-[0.5rem] font-black uppercase tracking-[0.12em] text-gold sm:text-[0.62rem] lg:text-[0.52rem]">Rank {rank}</p>
                  <h2 className="truncate font-display text-sm font-black uppercase leading-none text-white sm:text-3xl lg:text-lg">{player.name}</h2>
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-white/44 lg:hidden">{player.role}</p>
                  <PlayerLevelBadge level={level} compact />
                </div>
              </div>
              <div
                className="player-impact-ring grid h-12 w-12 shrink-0 place-items-center rounded-full border border-white/12 text-center sm:h-16 sm:w-16"
                style={{ background: `conic-gradient(#F4B942 ${impact * 3.6}deg, rgba(255,255,255,0.08) 0deg)` }}
                aria-label={`Impact score ${impact} out of 100`}
              >
                <span className="grid h-12 w-12 place-items-center rounded-full bg-night font-display text-2xl font-black text-white">{impact}</span>
              </div>
            </div>

            <PlayerLevelInfographic level={level} compact className="lg:hidden" />
            <PlayerRankingInfographic player={player} compact />

            <div className="player-card-detail-stack lg:hidden">
            <div className="relative mt-5 rounded-[7px] border border-cyan/20 bg-cyan/[0.06] p-4">
              <div className="flex items-center gap-2 text-[0.62rem] font-black uppercase tracking-[0.16em] text-cyan"><Icon.Sparkles size={14} /> Areas of improvement</div>
              {improvementReport.focus.length ? (
                <div className="mt-3 grid gap-2">
                  {improvementReport.focus.slice(0, 3).map((item) => (
                    <div key={`${item.area}-${item.title}`} className="flex items-start justify-between gap-3 rounded-[6px] border border-white/8 bg-night/45 px-3 py-2">
                      <span className="min-w-0 text-sm font-bold leading-5 text-white/82">{item.title}</span>
                      <span className={`shrink-0 text-[0.55rem] font-black uppercase tracking-[0.1em] ${item.priority === "High" ? "text-crimson" : item.priority === "Medium" ? "text-gold" : "text-white/45"}`}>{item.priority}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm leading-5 text-white/58">Maintain current strengths while more public data is tracked.</p>
              )}
            </div>

            <div className="relative mt-5">
              <p className="mb-2 text-[0.62rem] font-black uppercase tracking-[0.16em] text-cyan">{playerStatsSource(player, stats)}</p>
              <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
                <LiveTinyStat label="Runs" value={hasStats ? stats.runs || 0 : "-"} />
                <LiveTinyStat label="Wkts" value={hasStats ? stats.wickets || 0 : "-"} />
                <LiveTinyStat label="Best" value={hasStats ? stats.bestScore || 0 : "-"} />
                <LiveTinyStat label="Field" value={hasStats ? (stats.catches || 0) + (stats.stumpings || 0) : "-"} />
              </div>
              <p className="mt-3 text-center text-[0.62rem] font-black uppercase tracking-[0.12em] text-white/38">{hasStats ? `${stats.matches || 0} matches | Avg ${stats.average || "-"} | SR ${stats.strikeRate || "-"}` : "Profile totals will appear after the next public sync"}</p>
              {stats.source !== CRICHEROES_STATS_SOURCE && <p className="mt-2 text-center text-[0.58rem] font-black uppercase tracking-[0.12em] text-gold/70">Warriors totals refreshed • public career aggregate restricted</p>}
            </div>

            <div className="relative mt-4 flex flex-wrap gap-2">
              {player.statsUrl && <a className="rounded-full border border-cyan/25 px-3 py-1 text-[0.62rem] font-black uppercase tracking-[0.12em] text-cyan transition hover:border-cyan hover:bg-cyan/10" href={player.statsUrl} target="_blank" rel="noopener noreferrer">Overall profile</a>}
              {player.matchesUrl && <a className="rounded-full border border-white/12 px-3 py-1 text-[0.62rem] font-black uppercase tracking-[0.12em] text-white/55 transition hover:border-gold/45 hover:text-gold" href={player.matchesUrl} target="_blank" rel="noopener noreferrer">All-team matches</a>}
            </div>

            <div className="relative mt-5">
              <div className="flex items-center justify-between text-xs font-black uppercase tracking-[0.14em] text-white/42">
                <span>Performance charge</span>
                <span>{impact}/100 charge</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/8">
                <span className="block h-full rounded-full bg-gradient-to-r from-gold via-cyan to-crimson" style={{ width: `${Math.min(100, Math.max(8, impact))}%` }} />
              </div>
            </div>

            <div className="relative mt-5 flex flex-wrap gap-2">
              {(player.badges?.length ? player.badges : ["Warriors roster"]).slice(0, 5).map((badge) => <BadgePill key={badge} label={badge} />)}
            </div>

            <div className="relative mt-5 border-t border-white/10 pt-4">
              <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-white/40">Recent form across teams</p>
              {recentMatches.length ? (
                <div className="mt-3 grid gap-2">
                  {recentMatches.map((match) => (
                    <a key={`recent-${match.id}`} href={match.performance?.scorecardUrl || match.scorecardUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 rounded-[6px] border border-white/8 bg-night/45 px-3 py-2 text-sm transition hover:border-gold/35">
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-white/76">{match.performance?.highlight || `${match.teamA} vs ${match.teamB}`}</span>
                        <span className="block truncate text-xs text-white/40">{match.performance?.teamName || "Cross-team match"} • {formatFeedDate(match.date)}</span>
                      </span>
                      <Icon.ExternalLink className="shrink-0 text-white/35" size={14} />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm leading-6 text-white/52">Waiting for the public player match history.</p>
              )}
              <p className="mt-5 text-[0.65rem] font-black uppercase tracking-[0.18em] text-white/40">Recent awards with Warriors</p>
              {activity.length ? (
                <div className="mt-3 grid gap-2">
                  {activity.map((award) => (
                    <div key={`${award.matchId}-${award.label}`} className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-semibold text-white/76">{award.label}</span>
                      <span className="truncate text-right text-white/42">vs {award.opponent}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm leading-6 text-white/52">Waiting for the next CricHeroes award entry.</p>
              )}
            </div>
            </div>

            <div className="player-hover-dossier absolute left-2 right-2 top-[calc(100%-1rem)] z-30 rounded-[8px] border border-cyan/45 bg-[#08121b]/[0.98] p-4 text-white shadow-[0_20px_60px_rgba(0,0,0,0.55),0_0_28px_var(--player-neon-glow)] opacity-0 invisible transition duration-200 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 lg:left-0 lg:right-0 lg:top-[calc(100%-0.5rem)]">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div>
                  <p className="text-[0.58rem] font-black uppercase tracking-[0.18em] text-cyan">Player dossier</p>
                  <p className="mt-1 text-sm font-black uppercase text-white">{player.name}</p>
                </div>
                <span className="font-display text-2xl font-black text-gold">{impact}/100</span>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                <LiveTinyStat label="Runs" value={hasStats ? stats.runs || 0 : "-"} />
                <LiveTinyStat label="Wkts" value={hasStats ? stats.wickets || 0 : "-"} />
                <LiveTinyStat label="Best" value={hasStats ? stats.bestScore || 0 : "-"} />
                <LiveTinyStat label="Field" value={hasStats ? (stats.catches || 0) + (stats.stumpings || 0) : "-"} />
              </div>
              <div className="mt-3 rounded-[6px] border border-cyan/20 bg-cyan/8 p-3">
                <p className="text-[0.58rem] font-black uppercase tracking-[0.16em] text-cyan">AI coach focus</p>
                <p className="mt-1 text-xs leading-5 text-white/72">{improvementReport.focus[0]?.title || "Maintain current strengths while more public data is tracked."}</p>
              </div>
              <p className="mt-3 text-[0.58rem] font-black uppercase tracking-[0.14em] text-white/42">Hover summary • click for full profile</p>
            </div>

            <button type="button" className="ai-coach-cta relative mt-2 inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-[7px] border border-cyan/60 bg-cyan/12 px-2 text-[0.5rem] font-black uppercase tracking-[0.1em] text-cyan transition hover:border-cyan hover:bg-cyan/20 focus:outline-none focus:ring-2 focus:ring-cyan/70 sm:mt-5 sm:min-h-12 sm:px-4 sm:text-xs sm:tracking-[0.16em] lg:mt-2 lg:min-h-9 lg:px-2 lg:text-[0.55rem] lg:tracking-[0.1em]" onClick={(event) => { event.stopPropagation(); onSelect?.(); }}>
              <Icon.Sparkles size={16} /> Open AI coach + profile
            </button>
          </article>
        );
      }

      function playerImpactScore(player) {
        return playerRankingSnapshot(player).score;
      }

      function boundedScore(value, minimum = 0, maximum = 100) {
        return Math.min(100, Math.max(0, Math.round(((value - minimum) / (maximum - minimum || 1)) * 100)));
      }

      function inverseScore(value, best, worst) {
        if (!Number.isFinite(value) || value <= 0) return 0;
        return Math.min(100, Math.max(0, Math.round(((worst - value) / (worst - best || 1)) * 100)));
      }

      function weightedDimension(items) {
        const usable = items.filter((item) => item.active && Number.isFinite(item.score));
        const weight = usable.reduce((sum, item) => sum + item.weight, 0);
        if (!weight) return { score: 0, weight: 0 };
        return { score: Math.round(usable.reduce((sum, item) => sum + item.score * item.weight, 0) / weight), weight };
      }

      function playerRankingSnapshot(player) {
        const stats = playerOverallStats(player);
        const roleText = `${player?.role || ""} ${player?.skill || ""} ${player?.batterCategory || ""} ${player?.bowlerCategory || ""}`.toLowerCase();
        const matches = numericStatValue(stats.matches);
        const battingInnings = numericStatValue(stats.battingInnings);
        const bowlingInnings = numericStatValue(stats.bowlingInnings);
        const fieldingMatches = numericStatValue(stats.fieldingMatches || matches);
        const runs = numericStatValue(stats.runs);
        const wickets = numericStatValue(stats.wickets);
        const average = numericStatValue(stats.average);
        const strikeRate = numericStatValue(stats.strikeRate);
        const bowlingAverage = numericStatValue(stats.bowlingAverage);
        const bowlingStrikeRate = numericStatValue(stats.bowlingStrikeRate);
        const economy = numericStatValue(stats.economy);
        const overs = numericStatValue(stats.overs);
        const dotBalls = numericStatValue(stats.dotBalls);
        const catches = numericStatValue(stats.catches);
        const stumpings = numericStatValue(stats.stumpings);
        const runOuts = numericStatValue(stats.runOuts);
        const assistedRunOuts = numericStatValue(stats.assistedRunOuts);
        const directFielding = catches + stumpings + runOuts + assistedRunOuts;
        const battingRate = battingInnings ? runs / battingInnings : 0;
        const wicketsRate = bowlingInnings ? wickets / bowlingInnings : 0;
        const fieldingRate = fieldingMatches ? directFielding / fieldingMatches : 0;
        const captainWinRate = numericStatValue(stats.captainWinPercentage);
        const batting = weightedDimension([
          { score: boundedScore(battingRate, 0, 55), weight: 0.28, active: battingInnings > 0 || runs > 0 },
          { score: boundedScore(average, 0, 50), weight: 0.24, active: average > 0 },
          { score: boundedScore(strikeRate, 70, 220), weight: 0.22, active: strikeRate > 0 },
          { score: boundedScore((numericStatValue(stats.fifties) + numericStatValue(stats.hundreds) * 2) / Math.max(1, battingInnings), 0, 0.35), weight: 0.14, active: battingInnings > 0 },
          { score: boundedScore((numericStatValue(stats.fours) + numericStatValue(stats.sixes)) / Math.max(1, runs), 0, 0.5), weight: 0.12, active: runs > 0 },
        ]);
        const bowling = weightedDimension([
          { score: boundedScore(wicketsRate, 0, 1.4), weight: 0.32, active: bowlingInnings > 0 || wickets > 0 },
          { score: inverseScore(economy, 6, 14), weight: 0.22, active: economy > 0 },
          { score: inverseScore(bowlingAverage, 15, 45), weight: 0.18, active: bowlingAverage > 0 && wickets > 0 },
          { score: inverseScore(bowlingStrikeRate, 10, 40), weight: 0.16, active: bowlingStrikeRate > 0 && wickets > 0 },
          { score: boundedScore(overs ? dotBalls / (overs * 6) : 0, 0, 0.45), weight: 0.12, active: overs > 0 && dotBalls >= 0 },
        ]);
        const fielding = weightedDimension([
          { score: boundedScore(fieldingRate, 0, 0.7), weight: 0.6, active: fieldingMatches > 0 || directFielding > 0 },
          { score: boundedScore(fieldingMatches ? catches / fieldingMatches : 0, 0, 0.45), weight: 0.25, active: fieldingMatches > 0 },
          { score: boundedScore(fieldingMatches ? (stumpings + runOuts + assistedRunOuts) / fieldingMatches : 0, 0, 0.25), weight: 0.15, active: fieldingMatches > 0 },
        ]);
        const captaincy = weightedDimension([
          { score: boundedScore(captainWinRate, 0, 100), weight: 0.75, active: numericStatValue(stats.captainMatches) > 0 && captainWinRate > 0 },
          { score: boundedScore(numericStatValue(stats.tossesWon) / Math.max(1, numericStatValue(stats.captainMatches)), 0, 1), weight: 0.25, active: numericStatValue(stats.captainMatches) > 0 },
        ]);
        const roleWeights = {
          batting: roleText.includes("bowler") && !roleText.includes("batter") ? 0.3 : 0.43,
          bowling: roleText.includes("batter") && !roleText.includes("bowler") ? 0.22 : 0.35,
          fielding: 0.14,
          captaincy: player?.isCaptain || numericStatValue(stats.captainMatches) > 0 ? 0.08 : 0,
        };
        const overall = weightedDimension([
          { score: batting.score, weight: roleWeights.batting, active: batting.weight > 0 },
          { score: bowling.score, weight: roleWeights.bowling, active: bowling.weight > 0 },
          { score: fielding.score, weight: roleWeights.fielding, active: fielding.weight > 0 },
          { score: captaincy.score, weight: roleWeights.captaincy, active: captaincy.weight > 0 && roleWeights.captaincy > 0 },
        ]);
        const publicFields = numericStatValue(stats.publicFieldCount);
        const confidence = Math.min(100, Math.round(Math.min(70, publicFields / 43 * 70) + Math.min(30, matches / 30 * 30)));
        const evidence = Math.max(battingInnings, bowlingInnings, fieldingMatches, matches);
        const sampleFactor = evidence ? Math.min(1, Math.sqrt(evidence / 80)) : 0;
        const reliability = Math.min(1, (confidence / 100) * 0.75 + sampleFactor * 0.25);
        const adjustedScore = evidence ? Math.round(35 + (overall.score - 35) * reliability) : 1;
        return {
          score: Math.max(1, Math.min(100, adjustedScore)),
          confidence,
          evidence,
          rawScore: Math.max(1, Math.min(100, overall.score)),
          batting: batting.score,
          bowling: bowling.score,
          fielding: fielding.score,
          captaincy: captaincy.score,
          dimensions: { batting: batting.score, bowling: bowling.score, fielding: fielding.score, captaincy: captaincy.score },
          label: confidence >= 75 ? "High confidence" : confidence >= 45 ? "Growing sample" : "Early sample",
          source: stats.source === CRICHEROES_STATS_SOURCE ? "CricHeroes public player stats" : "Available public feed",
        };
      }

      function rankPlayers(players) {
        return asArray(players)
          .map((player) => {
            const ranking = playerRankingSnapshot(player);
            return { ...player, ranking, impact: ranking.score, role: playerRoleLabel(player), level: playerLevel({ ...player, ranking }) };
          })
          .sort((a, b) => b.impact - a.impact || b.ranking.evidence - a.ranking.evidence || a.name.localeCompare(b.name))
          .map((player, index) => ({ ...player, rank: index + 1 }));
      }

      const PLAYER_LEVELS = {
        pro: {
          label: "PRO",
          descriptor: "Elite community form",
          encouragement: "Setting the pace for the squad",
          color: "#ff315a",
          glow: "rgba(255,49,90,0.72)",
          soft: "rgba(255,49,90,0.14)",
        },
        semiPro: {
          label: "SEMI-PRO",
          descriptor: "Competitive community form",
          encouragement: "Turning consistency into impact",
          color: "#F4B942",
          glow: "rgba(244,185,66,0.72)",
          soft: "rgba(244,185,66,0.14)",
        },
        amateur: {
          label: "AMATEUR",
          descriptor: "Building cricket momentum",
          encouragement: "Every innings is progress",
          color: "#23d5e8",
          glow: "rgba(35,213,232,0.68)",
          soft: "rgba(35,213,232,0.14)",
        },
      };

      function playerLevel(player) {
        const currentPlayer = player || {};
        const stats = playerOverallStats(currentPlayer);
        const ranking = currentPlayer.ranking || playerRankingSnapshot(currentPlayer);
        const matches = numericStatValue(stats.matches);
        const levelScore = ranking.score;
        const isPro = levelScore >= 78 && ranking.confidence >= 55 && matches >= 40;
        const isSemiPro = levelScore >= 48 && ranking.confidence >= 25 && matches >= 10;
        const key = isPro ? "pro" : isSemiPro ? "semiPro" : "amateur";
        return { key, score: levelScore, confidence: ranking.confidence, ...PLAYER_LEVELS[key] };
      }

      function PlayerLevelBadge({ level, compact = false }) {
        const current = level || PLAYER_LEVELS.amateur;
        return (
          <span className={`player-level-badge ${compact ? "player-level-badge-compact" : ""}`} style={{ "--player-neon-color": current.color, "--player-neon-glow": current.glow }} title={`${current.label}: ${current.descriptor}`}>
            <span className="player-level-badge-dot" aria-hidden="true" />
            <span>{current.label}</span>
            {!compact && <span className="player-level-badge-score">{current.score}/100 level index</span>}
          </span>
        );
      }

      function PlayerLevelInfographic({ level, compact = false, className = "" }) {
        const current = level || PLAYER_LEVELS.amateur;
        return (
          <div className={`player-level-infographic lg:mt-2 lg:p-2 ${compact ? "player-level-infographic-compact" : ""} ${className}`} style={{ "--player-neon-color": current.color, "--player-neon-glow": current.glow, "--player-neon-soft": current.soft }}>
            <div className="flex min-w-0 items-center gap-3">
              <PlayerLevelBadge level={current} compact={compact} />
              <p className="min-w-0 text-xs font-bold leading-5 text-white/58 lg:hidden">{current.encouragement}</p>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10 lg:mt-2" aria-label={`${current.label} level index ${current.score} out of 100`}>
              <span className="block h-full rounded-full" style={{ width: `${Math.max(6, current.score)}%`, background: current.color, boxShadow: `0 0 14px ${current.glow}` }} />
            </div>
            <div className="mt-2 flex justify-between text-[0.55rem] font-black uppercase tracking-[0.12em] text-white/35 lg:mt-1"><span>Community level</span><span>{current.score}/100 signal</span></div>
          </div>
        );
      }

      function PlayerRankingInfographic({ player, compact = false }) {
        const ranking = player?.ranking || playerRankingSnapshot(player);
        const dimensions = [
          ["Bat", ranking.batting, "#F4B942"],
          ["Bowl", ranking.bowling, "#23d5e8"],
          ["Field", ranking.fielding, "#86efac"],
          ["Lead", ranking.captaincy, "#ff315a"],
        ];
        return (
          <div className={`player-ranking-infographic mt-4 rounded-[7px] border border-white/10 bg-night/55 lg:mt-2 lg:p-2 ${compact ? "p-3" : "p-4"}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[0.58rem] font-black uppercase tracking-[0.18em] text-cyan">Overall CricHeroes rank</p>
                <p className="player-ranking-source mt-1 text-xs font-bold text-white/48 lg:hidden">{ranking.source} • {ranking.label}</p>
              </div>
              <div className="text-right">
                <span className="font-display text-2xl font-black text-white">{player?.rank ? `#${player.rank}` : "-"}</span>
                <span className="ml-2 text-xs font-black text-gold">{ranking.score}/100</span>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2 lg:mt-2 lg:gap-1" aria-label="Ranking dimensions">
              {dimensions.map(([label, score, color]) => (
                <div key={label} className="min-w-0">
                  <div className="flex items-center justify-between gap-1 text-[0.52rem] font-black uppercase tracking-[0.08em] text-white/40"><span>{label}</span><span>{score}</span></div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full" style={{ width: `${score}%`, background: color, boxShadow: `0 0 10px ${color}` }} /></div>
                </div>
              ))}
            </div>
            {!compact && <p className="mt-3 text-xs leading-5 text-white/44">The rank blends batting output, bowling threat, fielding contributions and captaincy only when that data is present. Confidence is reported separately from performance.</p>}
          </div>
        );
      }

      function playerDetailNumber(value) {
        const number = Number(value);
        return Number.isFinite(number) ? number : 0;
      }

      function playerDetailDecimal(value) {
        const number = Number.parseFloat(String(value ?? "").replace(/[^0-9.-]/g, ""));
        return Number.isFinite(number) ? number : 0;
      }

      function playerDetailPercent(value) {
        return playerDetailDecimal(String(value ?? "").replace("%", ""));
      }

      function playerRecentForm(player, limit = 5) {
        const byId = new Map();
        for (const match of [...asArray(player?.recentMatches), ...asArray(player?.matchHistory)]) {
          if (!match) continue;
          const key = String(match.id || match.scorecardUrl || `${match.date || ""}-${match.teamA || ""}-${match.teamB || ""}`);
          const previous = byId.get(key);
          byId.set(key, previous?.performance && !match.performance ? previous : { ...previous, ...match });
        }
        return [...byId.values()]
          .filter((match) => match.date || match.teamA || match.teamB || match.performance)
          .sort((a, b) => {
            const aTime = new Date(a.date || a.matchDate || a.startTime || 0).getTime();
            const bTime = new Date(b.date || b.matchDate || b.startTime || 0).getTime();
            return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
          })
          .slice(0, limit);
      }

      function playerBallTypeStats(player) {
        const formats = [
          { key: "TENNIS", label: "Tennis ball", color: "cyan", description: "Public tennis-ball match history" },
          { key: "LEATHER", label: "Leather ball", color: "gold", description: "Public leather-ball match history" },
        ];
        const buckets = Object.fromEntries(formats.map((format) => [format.key, {
          matches: 0,
          scorecardsWithPlayerLine: 0,
          runs: 0,
          wickets: 0,
          latestDate: "",
        }]));
        const matches = [...asArray(player?.matchHistory), ...asArray(player?.recentMatches)];
        const seen = new Set();
        for (const match of matches) {
          const key = String(match?.id || match?.scorecardUrl || `${match?.date || ""}-${match?.ballType || ""}`);
          if (seen.has(key)) continue;
          seen.add(key);
          const ballType = String(match?.ballType || "").toUpperCase();
          const bucket = buckets[ballType];
          if (!bucket) continue;
          bucket.matches += 1;
          const performance = match.performance || {};
          const hasVerifiedPlayerLine = Boolean(
            performance.teamId ||
            performance.teamName ||
            performance.opponent ||
            performance.highlight ||
            ["runs", "balls", "fours", "sixes", "wickets", "ballsBowled", "runsConceded", "catches", "stumpings"]
              .some((key) => Number(performance[key]) > 0),
          );
          if (hasVerifiedPlayerLine) {
            bucket.scorecardsWithPlayerLine += 1;
            bucket.runs += playerDetailNumber(performance.runs);
            bucket.wickets += playerDetailNumber(performance.wickets);
          }
          if (!bucket.latestDate || new Date(match.date || 0).getTime() > new Date(bucket.latestDate).getTime()) {
            bucket.latestDate = match.date || bucket.latestDate;
          }
        }
        return formats.map((format) => ({
          ...format,
          ...buckets[format.key],
          latestDate: buckets[format.key].latestDate ? formatFeedDate(buckets[format.key].latestDate) : "No dated match in snapshot",
        }));
      }

      function playerMatchForm(player) {
        return playerRecentForm(player, 8)
          .map((match) => match.performance || {})
          .filter((performance) => Object.values(performance).some((value) => Number(value) > 0));
      }

      function coachingEvidence(label, value, suffix = "") {
        return `${label}: ${value}${suffix}`;
      }

      function createImprovementReport(player, stats) {
        const form = playerMatchForm(player);
        const innings = playerDetailNumber(stats.battingInnings);
        const bowlingInnings = playerDetailNumber(stats.bowlingInnings);
        const fieldingMatches = playerDetailNumber(stats.fieldingMatches || stats.matches);
        const average = playerDetailDecimal(stats.average);
        const strikeRate = playerDetailDecimal(stats.strikeRate);
        const bowlingAverage = playerDetailDecimal(stats.bowlingAverage);
        const economy = playerDetailDecimal(stats.economy);
        const captainWinPercentage = playerDetailPercent(stats.captainWinPercentage);
        const formRuns = form.reduce((sum, item) => sum + playerDetailNumber(item.runs), 0);
        const formWickets = form.reduce((sum, item) => sum + playerDetailNumber(item.wickets), 0);
        const formCatches = form.reduce((sum, item) => sum + playerDetailNumber(item.catches), 0);
        const formStumpings = form.reduce((sum, item) => sum + playerDetailNumber(item.stumpings), 0);
        const roleText = `${player.role || ""} ${player.batterCategory || ""}`.toLocaleLowerCase();
        const isWicketkeeper = roleText.includes("keeper") || playerDetailNumber(stats.caughtBehind) > 0 || playerDetailNumber(stats.stumpings) > 0 || playerDetailNumber(stats.byeRunsWicketkeeper) > 0;
        const fieldingArea = isWicketkeeper ? "Keeping" : "Fielding";
        const roleLabel = player.role || playerRoleLabel(player);
        const battingSnapshot = `Recorded batting innings: ${innings}; runs: ${playerDetailNumber(stats.runs)}; average: ${average ? average.toFixed(2) : "not available"}; strike rate: ${strikeRate ? strikeRate.toFixed(2) : "not available"}.`;
        const bowlingSnapshot = `Recorded bowling innings: ${bowlingInnings}; wickets: ${playerDetailNumber(stats.wickets)}; economy: ${economy ? economy.toFixed(2) : "not available"}; bowling average: ${bowlingAverage ? bowlingAverage.toFixed(2) : "not available"}.`;
        const fieldingSnapshot = `${isWicketkeeper ? "Recorded keeping" : "Recorded fielding"} matches: ${fieldingMatches}; catches: ${playerDetailNumber(stats.catches)}; stumpings: ${playerDetailNumber(stats.stumpings)}; run outs: ${playerDetailNumber(stats.runOuts)}.`;
        const report = [];
        const strengths = [];
        const addFocus = (area, priority, title, observed, why, action, target, confidence = "High") => report.push({ area, priority, title, observed, why, action, target, confidence });
        const addStrength = (area, title, value) => strengths.push({ area, title, value });

        if (innings >= 8) {
          if (average && average < 25) addFocus("Batting", "High", "Turn starts into stable scores", coachingEvidence("career average", average.toFixed(2)), "The public batting average is below the consistency benchmark.", "Use a first-20-ball plan: leave or defend the hard ball, then target singles before expanding the boundary options.", "Raise average toward 25+ while keeping the current role.");
          else if (average >= 40) addStrength("Batting", "Reliable run base", coachingEvidence("average", average.toFixed(2)));
          if (strikeRate && strikeRate < 110) addFocus("Batting", "Medium", "Lift scoring tempo", coachingEvidence("strike rate", strikeRate.toFixed(2)), "The scoring rate suggests too many low-value balls between scoring shots.", "Practise two boundary options and a single option for each scoring zone, with a six-ball intent reset after a dot-ball pair.", "Move strike rate toward 110+ without reducing average.");
          else if (strikeRate >= 160) addStrength("Batting", "Boundary pressure", coachingEvidence("strike rate", strikeRate.toFixed(2)));
          if (playerDetailNumber(stats.fifties) > 0 && !playerDetailNumber(stats.hundreds)) addFocus("Batting", "Medium", "Convert fifties into match-winning hundreds", coachingEvidence("50s", stats.fifties), "There are established scoring starts but no recorded century conversion yet.", "At 40+, switch to a low-risk rotation plan and protect the scoring areas that are already working.", "Convert one established fifty into a 100+ score.");
          if (playerDetailNumber(stats.ducks) / innings > 0.1) addFocus("Batting", "Medium", "Improve first-10-ball control", coachingEvidence("ducks", stats.ducks), "Early dismissals are a meaningful share of recorded innings.", "Train the opening phase against swing and short-ball scenarios before adding power shots.", "Reduce duck rate below 10% of innings.");
        } else {
          addFocus("Batting", "Watch", "Build a larger batting sample", battingSnapshot, "The feed has too few recorded batting innings for a reliable technical conclusion.", "Log the first 20 balls of every innings: contact quality, dot balls, singles and dismissals.", "Collect 8+ innings before changing technique", "Low");
        }

        if (bowlingInnings >= 8) {
          if (bowlingAverage > 30) addFocus("Bowling", "High", "Improve wicket efficiency", coachingEvidence("bowling average", bowlingAverage.toFixed(2)), "Runs per wicket are high compared with a strong control profile.", "Build an over-by-over wicket plan: one setup ball, one change-up, then attack the stumps or the outside edge.", "Bring bowling average below 30.");
          else if (bowlingAverage && bowlingAverage < 22) addStrength("Bowling", "Wicket efficiency", coachingEvidence("average", bowlingAverage.toFixed(2)));
          if (economy > 10.5) addFocus("Bowling", "High", "Tighten run control", coachingEvidence("economy", economy.toFixed(2)), "The current economy gives batters too many low-risk scoring balls.", "Practise a repeatable stock line for six balls, then use one planned variation rather than changing every delivery.", "Bring economy below 10.5.");
          else if (economy && economy < 8) addStrength("Bowling", "Run control", coachingEvidence("economy", economy.toFixed(2)));
          const wides = playerDetailNumber(stats.wides);
          const noBalls = playerDetailNumber(stats.noBalls);
          if ((wides + noBalls) / bowlingInnings > 0.6) addFocus("Bowling", "Medium", "Improve bowling discipline", coachingEvidence("wides + no-balls per innings", ((wides + noBalls) / bowlingInnings).toFixed(2)), "Extras are costing more than half a delivery per bowling innings on average.", "Use a target-zone drill with a smaller run-up and finish balanced over the front leg.", "Reduce wides and no-balls below 0.6 per innings.");
          if (playerDetailNumber(stats.wickets) > 0 && !playerDetailNumber(stats.fiveWicketHauls)) addFocus("Bowling", "Watch", "Finish strong spells", coachingEvidence("wickets", stats.wickets), "Wickets are present but no five-wicket haul is recorded in the public totals.", "Rehearse a closing spell: attack the stumps when a batter is set and keep one boundary-saving field option ready.", "Turn one strong spell into a five-wicket haul.", "Medium");
        } else {
          addFocus("Bowling", "Watch", "Build a repeatable bowling sample", bowlingSnapshot, "There are not enough recorded bowling innings to separate control, threat and role effects.", "Track line, length, pace, extras and wickets after every over for the next eight innings.", "Collect 8+ bowling innings before changing the action", "Low");
        }

        const fieldingEvents = playerDetailNumber(stats.catches) + playerDetailNumber(stats.stumpings) + playerDetailNumber(stats.runOuts);
        if (fieldingMatches >= 8) {
          const fieldingRate = fieldingEvents / fieldingMatches;
          if (fieldingRate < 0.2) addFocus(fieldingArea, "Medium", isWicketkeeper ? "Improve keeping impact" : "Create more direct fielding impact", coachingEvidence("dismissal contributions per match", fieldingRate.toFixed(2)), isWicketkeeper ? "The public keeping totals show limited catches, stumpings or run outs per keeping match." : "The public fielding totals show limited catches, stumpings or run outs per fielding match.", isWicketkeeper ? "Work through takes standing back, takes standing up and fast glove-to-throw drills under match pressure." : "Use three stations each week: reaction catches, one-hand pickups and throw-to-target under fatigue.", "Build toward 0.20+ direct contributions per match.");
          else addStrength(fieldingArea, isWicketkeeper ? "Reliable keeping involvement" : "Reliable fielding involvement", coachingEvidence("direct contributions", fieldingEvents));
          if (playerDetailNumber(stats.caughtBehind) + playerDetailNumber(stats.stumpings) > 0) addStrength(fieldingArea, "Wicketkeeping impact", coachingEvidence("keeper dismissals", playerDetailNumber(stats.caughtBehind) + playerDetailNumber(stats.stumpings)));
        } else {
          addFocus(fieldingArea, "Watch", isWicketkeeper ? "Build a keeping sample" : "Make fielding measurable", fieldingSnapshot, isWicketkeeper ? "The feed does not yet have enough keeping matches for a stable rate." : "The feed does not yet have enough fielding matches for a stable rate.", isWicketkeeper ? "Record takes, byes, stumpings, catches and release speed in every match." : "Record chances, successful pickups, catches and throws in every match, including chances not converted.", isWicketkeeper ? "Build a keeping baseline across 8+ matches" : "Build a fielding baseline across 8+ matches", "Low");
        }

        if (playerDetailNumber(stats.captainMatches) >= 3) {
          if (captainWinPercentage < 50) addFocus("Captaincy", "Medium", "Sharpen game-state decisions", coachingEvidence("captain win rate", `${captainWinPercentage.toFixed(2)}%`), "The public captaincy record leaves room to improve decision outcomes.", "Review toss choice, bowling changes and field settings after every match; write one decision to repeat and one to change.", "Move captain win rate toward 50%+.");
          else addStrength("Captaincy", "Positive leadership record", coachingEvidence("captain win rate", `${captainWinPercentage.toFixed(2)}%`));
        }

        if (form.length >= 3) {
          if (formRuns / form.length >= 30) addStrength("Recent form", "Recent scoring pulse", coachingEvidence("runs across sampled matches", formRuns));
          else if (formRuns > 0) addFocus("Recent form", "Medium", "Carry recent starts deeper", coachingEvidence("runs across sampled matches", formRuns), "Recent scorecard-linked form shows involvement but not yet a sustained scoring run.", "Set a match-to-match process goal instead of chasing a single big score: one partnership, one rotation phase, one boundary phase.", "Raise sampled-match scoring output next sync.", "Medium");
          if (formWickets >= 5) addStrength("Recent form", "Current wicket threat", coachingEvidence("sampled-match wickets", formWickets));
          if (formCatches + formStumpings >= 3) addStrength("Recent form", "Current fielding impact", coachingEvidence("sampled-match dismissals", formCatches + formStumpings));
        }

        const sourceCoverage = player.stats?.publicFieldCount || Object.values(stats.sections || {}).reduce((sum, items) => sum + items.length, 0);
        const coverage = sourceCoverage ? `Based on ${sourceCoverage} public CricHeroes fields${form.length ? ` and ${form.length} scorecard-linked recent performances` : ""}.` : "Waiting for public CricHeroes fields before making a strong recommendation.";
        const priorityRank = { High: 0, Medium: 1, Watch: 2 };
        const byPriority = [...report].sort((a, b) => (priorityRank[a.priority] ?? 3) - (priorityRank[b.priority] ?? 3));
        const areaOrder = ["Batting", "Bowling", fieldingArea];
        const areaFirst = areaOrder.map((area) => byPriority.find((item) => item.area === area)).filter(Boolean);
        const remaining = byPriority.filter((item) => !areaFirst.includes(item));
        const ordered = [...areaFirst, ...remaining].slice(0, 6);
        return { coverage, roleLabel, focus: ordered, strengths: strengths.slice(0, 4), formSample: form.length };
      }

      function PlayerImprovementPanel({ player, stats }) {
        const report = createImprovementReport(player, stats);
        const level = player.level || playerLevel(player);
        const neon = playerNeonTheme(player.impact || 0, level);
        const ranking = player.ranking || playerRankingSnapshot(player);
        const [coachView, setCoachView] = useState("overview");
        const coachTabs = [
          ["overview", "Overview"],
          ["Batting", "Batting"],
          ["Bowling", "Bowling"],
          ["Fielding", "Fielding / keeping"],
        ];
        const visibleFocus = coachView === "overview" ? report.focus : report.focus.filter((item) => item.area.toLowerCase().startsWith(coachView.toLowerCase()));
        return (
          <article className="player-neon-card rounded-[8px] border bg-[linear-gradient(135deg,rgba(35,213,232,0.09),rgba(255,255,255,0.025))] p-4 sm:p-5" style={{ "--player-neon-color": neon.color, "--player-neon-glow": neon.glow }}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-cyan"><Icon.Sparkles size={15} /> AI performance coach</p>
                <h3 className="mt-2 font-display text-3xl font-black uppercase text-white">Stats-tailored coaching plan</h3>
                <p className="mt-2 max-w-2xl text-xs leading-5 text-white/46">{report.coverage} Built for {report.roleLabel}; recommendations update as the player’s public stats and recent form change.</p>
              </div>
              <span className="rounded-full border border-cyan/25 bg-cyan/10 px-3 py-2 text-[0.62rem] font-black uppercase tracking-[0.12em] text-cyan">Daily stat lens</span>
            </div>

            <PlayerRankingInfographic player={{ ...player, ranking }} />

            <div className="mt-5 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="AI coach focus">
              {coachTabs.map(([key, label]) => (
                <button key={key} type="button" role="tab" aria-selected={coachView === key} onClick={() => setCoachView(key)} className={`min-h-10 shrink-0 rounded-full border px-3 text-[0.6rem] font-black uppercase tracking-[0.1em] transition ${coachView === key ? "border-cyan/60 bg-cyan/15 text-cyan" : "border-white/12 bg-white/[0.04] text-white/55 hover:border-white/25 hover:text-white"}`}>
                  {label}
                </button>
              ))}
            </div>

            {report.strengths.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {report.strengths.map((strength) => <span key={`${strength.area}-${strength.title}`} className="rounded-full border border-gold/25 bg-gold/10 px-3 py-2 text-xs font-bold text-gold">{strength.title}: {strength.value}</span>)}
              </div>
            )}

            <div className="mt-5 grid gap-3">
              {visibleFocus.length ? visibleFocus.map((item, index) => (
                <div key={`${item.area}-${item.title}`} className="rounded-[7px] border border-white/10 bg-night/55 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 gap-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-cyan/30 bg-cyan/10 font-display font-black text-cyan">{String(index + 1).padStart(2, "0")}</span>
                      <div>
                        <div className="flex flex-wrap items-center gap-2"><p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-cyan">{item.area}</p><span className={`rounded-full px-2 py-1 text-[0.55rem] font-black uppercase tracking-[0.1em] ${item.priority === "High" ? "bg-crimson/15 text-crimson" : item.priority === "Medium" ? "bg-gold/15 text-gold" : "bg-white/10 text-white/48"}`}>{item.priority} priority</span></div>
                        <h4 className="mt-1 text-lg font-black text-white">{item.title}</h4>
                      </div>
                    </div>
                    <span className="text-[0.58rem] font-black uppercase tracking-[0.12em] text-white/35">{item.confidence} signal</span>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm leading-6 sm:grid-cols-3">
                    <p className="text-white/62"><span className="block text-[0.58rem] font-black uppercase tracking-[0.12em] text-white/35">Observed</span>{item.observed}</p>
                    <p className="text-white/62"><span className="block text-[0.58rem] font-black uppercase tracking-[0.12em] text-white/35">Why it matters</span>{item.why}</p>
                    <p className="text-white/62"><span className="block text-[0.58rem] font-black uppercase tracking-[0.12em] text-white/35">Next target</span>{item.target}</p>
                  </div>
                  <p className="mt-3 border-t border-white/8 pt-3 text-sm leading-6 text-cyan/80"><span className="font-black uppercase tracking-[0.1em]">Practice cue: </span>{item.action}</p>
                </div>
              )) : <div className="rounded-[7px] border border-emerald-300/20 bg-emerald-300/[0.06] p-4 text-sm leading-6 text-emerald-100">No high-priority {coachView.toLowerCase()} issue is visible in the current public CricHeroes sample. Keep the strength, log the next match and let the coach update after sync.</div>}
            </div>
          </article>
        );
      }

      function PlayerSkillMap({ type, player, stats }) {
        const runs = playerDetailNumber(stats.runs);
        const wickets = playerDetailNumber(stats.wickets);
        const fours = playerDetailNumber(stats.fours);
        const sixes = playerDetailNumber(stats.sixes);
        const catches = playerDetailNumber(stats.catches);
        const stumpings = playerDetailNumber(stats.stumpings);
        const map = type === "batting"
          ? {
              title: "Batting shots",
              kicker: "Visual shot map",
              note: "Inferred from public scoring patterns and role signals",
              markers: [
                { label: "Cover drive", value: Math.min(96, 38 + fours % 42), left: 28, top: 30 },
                { label: "Straight", value: Math.min(94, 32 + runs % 51), left: 50, top: 22 },
                { label: "Pull / hook", value: Math.min(93, 36 + sixes % 44), left: 74, top: 37 },
                { label: "Rotation", value: Math.min(92, 34 + (runs + fours) % 49), left: 52, top: 70 },
              ],
              metrics: [["Runs", runs], ["Best", stats.bestScore || 0], ["4s / 6s", `${fours} / ${sixes}`]],
            }
          : type === "bowling"
            ? {
                title: "Bowling zones",
                kicker: "Visual bowling map",
                note: "Inferred from wickets, economy and bowling role signals",
                markers: [
                  { label: "Top of off", value: Math.min(96, 42 + wickets * 4), left: 50, top: 27 },
                  { label: "Yorker", value: Math.min(94, 34 + wickets * 5), left: 36, top: 67 },
                  { label: "Variation", value: Math.min(91, 31 + (player.bowlerCategory || "").length * 2), left: 72, top: 53 },
                ],
                metrics: [["Wickets", wickets], ["Best", stats.bestBowling || stats.bestWickets || 0], ["Economy", stats.economy || "-"]],
              }
            : {
                title: "Fielding zones",
                kicker: "Visual fielding map",
                note: "Official totals shown; placement is a coaching view",
                markers: [
                  { label: "Catches", value: Math.min(98, 28 + catches % 68), left: 24, top: 34 },
                  { label: "Keeper", value: Math.min(94, 28 + stumpings * 8), left: 50, top: 76 },
                  { label: "Ring / throws", value: Math.min(92, 34 + playerDetailNumber(stats.runOuts) * 4), left: 77, top: 42 },
                ],
                metrics: [["Catches", catches], ["Stumpings", stumpings], ["Run outs", stats.runOuts || 0]],
              };

        return (
          <article className="overflow-hidden rounded-[8px] border border-white/12 bg-night/60">
            <div className="relative min-h-64 overflow-hidden bg-cover bg-center" style={{ backgroundImage: `url(${assetUrl("/assets/stadium-vip-warriors.png")})` }}>
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,7,11,0.25),rgba(5,7,11,0.86))]" />
              <div className="absolute left-1/2 top-1/2 h-28 w-16 -translate-x-1/2 -translate-y-1/2 rotate-90 rounded-[42%] border border-white/40 bg-[#c79a66]/55 shadow-[0_0_30px_rgba(255,255,255,0.18)]" />
              <div className="absolute left-1/2 top-1/2 h-40 w-[2px] -translate-x-1/2 -translate-y-1/2 bg-white/35" />
              <div className="absolute inset-x-5 top-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-gold">{kickerLabel(map.kicker)}</p>
                  <h3 className="mt-1 font-display text-3xl font-black uppercase text-white">{map.title}</h3>
                </div>
                <span className="rounded-full border border-white/20 bg-night/55 px-2 py-1 text-[0.55rem] font-black uppercase tracking-[0.12em] text-white/60">CricKuru view</span>
              </div>
              {map.markers.map((marker) => (
                <span key={marker.label} className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold/50 bg-night/85 px-2 py-1 text-center shadow-[0_0_16px_rgba(244,185,66,0.3)]" style={{ left: `${marker.left}%`, top: `${marker.top}%` }}>
                  <span className="block max-w-[86px] whitespace-normal text-[0.58rem] font-black uppercase leading-tight tracking-[0.1em] text-white">{marker.label}</span>
                  <span className="block text-xs font-black text-gold">{marker.value}/100</span>
                </span>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2 p-3">
              {map.metrics.map(([label, value]) => <LiveTinyStat key={label} label={label} value={value} />)}
            </div>
            <p className="px-3 pb-4 text-[0.62rem] font-semibold leading-5 text-white/38">{map.note}</p>
          </article>
        );
      }

      function kickerLabel(value) {
        return value || "Skill map";
      }

      function PlayerStatsMatrix({ stats, sourceLabel = "Overall CricHeroes career" }) {
        const fallbackGroups = [
          {
            title: "Batting",
            items: [
              ["Matches", stats.matches], ["Innings", stats.battingInnings], ["Not out", stats.notOut], ["Runs", stats.runs],
              ["Highest runs", stats.bestScore], ["Average", stats.average], ["Strike rate", stats.strikeRate], ["30s", stats.thirties],
              ["50s", stats.fifties], ["100s", stats.hundreds], ["4s", stats.fours], ["6s", stats.sixes], ["Ducks", stats.ducks], ["Won", stats.wins], ["Loss", stats.losses],
            ],
          },
          {
            title: "Bowling",
            items: [
              ["Matches", stats.matches], ["Innings", stats.bowlingInnings], ["Overs", stats.overs], ["Maidens", stats.maidens], ["Wickets", stats.wickets],
              ["Runs conceded", stats.runsConceded], ["Best bowling", stats.bestBowling], ["3 wickets", stats.threeWicketHauls], ["5 wickets", stats.fiveWicketHauls],
              ["Economy", stats.economy], ["Strike rate", stats.bowlingStrikeRate], ["Average", stats.bowlingAverage], ["Wides", stats.wides], ["No-balls", stats.noBalls], ["Dot balls", stats.dotBalls],
            ],
          },
          {
            title: "Fielding and captaincy",
            items: [
              ["Fielding matches", stats.fieldingMatches], ["Catches", stats.catches], ["Caught behind", stats.caughtBehind], ["Run outs", stats.runOuts],
              ["Stumpings", stats.stumpings], ["Assisted run outs", stats.assistedRunOuts], ["Bye runs (WK)", stats.byeRunsWicketkeeper], ["Captain matches", stats.captainMatches],
              ["Toss won", stats.tossesWon], ["Captain win %", stats.captainWinPercentage],
            ],
          },
        ];
        const sectionLabels = { batting: "Batting", bowling: "Bowling", fielding: "Fielding", captain: "Captaincy" };
        const groups = Object.entries(stats.sections || {}).length
          ? Object.entries(stats.sections).map(([key, items]) => ({ title: sectionLabels[key] || key, items: items.map((item) => [item.title, item.value]) }))
          : fallbackGroups;
        return (
          <section>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan">{sourceLabel}</p>
                <h3 className="mt-2 font-display text-3xl font-black uppercase text-white">Available stat sheet</h3>
              </div>
              <span className="hidden text-xs font-semibold text-white/35 sm:block">{stats.publicFieldCount || groups.reduce((sum, group) => sum + group.items.length, 0)} public fields</span>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              {groups.map((group) => (
                <article key={group.title} className="rounded-[8px] border border-white/12 bg-white/[0.035] p-4">
                  <h4 className="text-xs font-black uppercase tracking-[0.18em] text-gold">{group.title}</h4>
                  <div className="mt-3 grid gap-2">
                    {group.items.map(([label, value]) => <div key={label} className="flex min-w-0 items-start justify-between gap-3 border-b border-white/7 pb-2 text-sm"><span className="min-w-0 break-words text-white/48">{label}</span><span className="shrink-0 text-right font-bold text-white/82">{value === 0 || value ? value : "-"}</span></div>)}
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      }

      function playerNeonTheme(impact = 0, level = PLAYER_LEVELS.amateur) {
        return { ...level, impact };
      }

      function PlayerDetailModal({ player, onClose }) {
        const stats = playerOverallStats(player);
        const statsSource = playerStatsSource(player, stats);
        const warriorsStats = player.warriorsStats || {};
        const recentMatches = playerRecentForm(player, 5);
        const matchHistory = asArray(player.matchHistory).length ? asArray(player.matchHistory) : recentMatches;
        const level = player.level || playerLevel(player);
        const neon = playerNeonTheme(player.impact || 0, level);
        const closeButtonRef = useRef(null);

        useEffect(() => {
          trackEvent("player_profile_view", {
            player_id: player?.id,
            player_level: level.label,
            player_role: player?.role || "unknown",
          });
        }, [player?.id, level.label, player?.role]);

        useEffect(() => {
          const onKeyDown = (event) => { if (event.key === "Escape") onClose(); };
          document.addEventListener("keydown", onKeyDown);
          const previousOverflow = document.body.style.overflow;
          const previousActiveElement = document.activeElement;
          document.body.style.overflow = "hidden";
          document.body.classList.add("modal-open");
          closeButtonRef.current?.focus({ preventScroll: true });
          return () => {
            document.removeEventListener("keydown", onKeyDown);
            document.body.style.overflow = previousOverflow;
            document.body.classList.remove("modal-open");
            if (previousActiveElement instanceof HTMLElement) previousActiveElement.focus({ preventScroll: true });
          };
        }, [onClose]);

        return createPortal(
          <div className="player-profile-overlay fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto overscroll-contain bg-black/80 p-0 sm:items-center sm:p-4 lg:p-6" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
            <section style={{ borderColor: neon.color, boxShadow: `0 0 0 1px ${neon.color}, 0 0 24px ${neon.glow}, 0 25px 100px rgba(0,0,0,0.7)`, "--player-neon-color": neon.color, "--player-neon-glow": neon.glow }} className="player-profile-panel player-neon-shell flex h-[100dvh] max-h-[100dvh] w-full max-w-5xl min-h-0 flex-col overflow-hidden rounded-none border bg-[#090d14] text-white sm:h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-2rem)] sm:rounded-[10px] lg:h-[calc(100dvh-3rem)] lg:max-h-[calc(100dvh-3rem)]" role="dialog" aria-modal="true" aria-label={`${player.name} full player profile`}>
              <header className="relative min-h-48 shrink-0 overflow-hidden bg-cover bg-center sm:min-h-56" style={{ backgroundImage: `url(${assetUrl("/assets/stadium-vip-warriors.png")})`, boxShadow: `inset 0 -3px 0 ${neon.color}, inset 0 -12px 28px ${neon.soft}` }}>
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,7,11,0.96),rgba(5,7,11,0.58),rgba(5,7,11,0.8))]" />
                <button ref={closeButtonRef} type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); onClose(); }} aria-label="Close player profile" title="Close player profile" className="absolute right-3 top-3 z-20 grid h-11 w-11 touch-manipulation place-items-center rounded-full border border-white/20 bg-night/70 text-white transition hover:border-gold hover:text-gold sm:right-4 sm:top-4"><Icon.X size={20} /></button>
                <div className="relative flex min-h-48 items-end gap-3 p-4 sm:min-h-56 sm:gap-4 sm:p-8">
                  <span className="rounded-full p-1" style={{ boxShadow: `0 0 0 2px ${neon.color}, 0 0 22px ${neon.glow}` }}><LiveAvatar src={player.photo} name={player.name} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.62rem] font-black uppercase tracking-[0.18em]" style={{ color: neon.color }}>Full player profile • {level.label} • {level.descriptor}</p>
                    <h2 className="mt-2 break-words pr-10 font-display text-3xl font-black uppercase leading-none text-white sm:truncate sm:pr-0 sm:text-6xl">{player.name}</h2>
                    <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-white/60 sm:text-sm sm:tracking-[0.14em]">{player.role || playerRoleLabel(player)} • {player.impact || 0}/100 performance charge</p>
                    <PlayerLevelBadge level={level} />
                    <button type="button" className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-full border border-cyan/35 bg-cyan/10 px-3 text-[0.58rem] font-black uppercase tracking-[0.14em] text-cyan transition hover:border-cyan hover:bg-cyan/15" onClick={() => document.getElementById("player-ai-coach")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                      <Icon.Sparkles size={13} /> Jump to AI coach
                    </button>
                  </div>
                </div>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 [scrollbar-gutter:stable] sm:p-8" style={{ WebkitOverflowScrolling: "touch" }}>
                <div className="grid gap-5 sm:gap-6">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <LiveStat label={statsSource === "Overall CricHeroes career" ? "Career matches" : "Tracked matches"} value={stats.matches || "-"} />
                  <LiveStat label={statsSource === "Overall CricHeroes career" ? "Career runs" : "Tracked runs"} value={stats.runs || "-"} />
                  <LiveStat label={statsSource === "Overall CricHeroes career" ? "Career wickets" : "Tracked wickets"} value={stats.wickets || "-"} />
                  <LiveStat label="Performance" value={`${player.impact || 0}/100`} />
                </div>

                <div id="player-ai-coach" className="scroll-mt-4"><PlayerImprovementPanel player={player} stats={stats} /></div>

                {Object.keys(stats).length ? <PlayerStatsMatrix stats={stats} sourceLabel={statsSource} /> : <DataEmpty title="Career totals syncing" description="Overall CricHeroes statistics will appear after the next successful public profile refresh." />}

                <div className="grid gap-4 md:grid-cols-3">
                  <PlayerSkillMap type="batting" player={player} stats={stats} />
                  <PlayerSkillMap type="bowling" player={player} stats={stats} />
                  <PlayerSkillMap type="fielding" player={player} stats={stats} />
                </div>

                <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                  <article className="rounded-[8px] border border-white/12 bg-white/[0.035] p-5">
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan">Recent matches</p>
                        <h3 className="mt-2 font-display text-3xl font-black uppercase text-white">Across all teams</h3>
                      </div>
                      {player.matchesUrl && <a href={player.matchesUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-cyan hover:text-white">Open CricHeroes <Icon.ExternalLink size={14} /></a>}
                    </div>
                    {recentMatches.length ? (
                      <div className="mt-4 grid gap-2">
                        {recentMatches.map((match) => <a key={match.id} href={match.performance?.scorecardUrl || match.scorecardUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 rounded-[6px] border border-white/8 bg-night/55 px-3 py-3 transition hover:border-gold/35"><span className="min-w-0"><span className="block truncate font-semibold text-white/80">{match.performance?.highlight || `${match.teamA} vs ${match.teamB}`}</span><span className="block truncate text-xs text-white/40">{match.performance?.teamName || "Cross-team match"} • {formatFeedDate(match.date)}</span></span><Icon.ExternalLink className="shrink-0 text-white/35" size={14} /></a>)}
                      </div>
                    ) : <p className="mt-5 text-sm leading-6 text-white/50">Recent all-team match form will appear after the next public profile sync.</p>}
                    <details className="mt-5 rounded-[6px] border border-white/8 bg-night/45 p-3">
                      <summary className="cursor-pointer text-xs font-black uppercase tracking-[0.14em] text-gold">Show synced match history ({matchHistory.length})</summary>
                      <p className="mt-2 text-xs leading-5 text-white/38">{player.historyComplete === false ? "More public CricHeroes history is queued for the next near-live sync." : "All public history pages currently available to the sync are loaded."}</p>
                      <div className="mt-3 max-h-72 overflow-y-auto pr-1">
                        <div className="grid gap-2">
                          {matchHistory.map((match) => <a key={`history-${match.id}`} href={match.performance?.scorecardUrl || match.scorecardUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 border-b border-white/7 py-2 text-sm"><span className="min-w-0"><span className="block truncate font-semibold text-white/72">{match.teamA} vs {match.teamB}</span><span className="block truncate text-xs text-white/38">{match.performance?.highlight || match.resultText || match.status} • {formatFeedDate(match.date)}</span></span><Icon.ExternalLink className="shrink-0 text-white/30" size={13} /></a>)}
                        </div>
                      </div>
                    </details>
                  </article>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
                  <p className="text-xs font-semibold text-white/40">Warriors context: {warriorsStats.matchesTracked || 0} tracked matches, {warriorsStats.runs || 0} runs, {warriorsStats.wickets || 0} wickets.</p>
                  <div className="flex flex-wrap gap-2">
                    {player.statsUrl && <a href={player.statsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-cyan/30 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-cyan hover:border-cyan">Overall stats <Icon.ExternalLink size={14} /></a>}
                    {player.profileUrl && <a href={player.profileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white/65 hover:border-gold/50 hover:text-gold">CricHeroes profile <Icon.ExternalLink size={14} /></a>}
                  </div>
                </div>
                </div>
              </div>
            </section>
          </div>,
          document.body,
        );
      }

      function playerRoleLabel(player) {
        const batting = cleanMatchText(player.batterCategory);
        const bowling = cleanMatchText(player.bowlerCategory);
        if (batting && bowling) return `${batting} / ${bowling}`;
        if (batting) return batting;
        if (bowling) return bowling;
        if (player.skill) return player.skill;
        if (player.isCaptain) return "Captain";
        return "Warriors squad";
      }

      function playerMatchesFilter(player, filter) {
        if (filter === "awards") return (player.performance?.awards || 0) > 0;
        if (filter === "batters") return Boolean(player.batterCategory || player.performance?.bestBatter);
        if (filter === "bowlers") return Boolean(player.bowlerCategory || player.performance?.bestBowler);
        if (filter === "verified") return Boolean(player.isVerified);
        if (filter === "career") return playerOverallStats(player)?.source === CRICHEROES_STATS_SOURCE;
        return true;
      }

      function LiveAvatar({ src, name, className = "" }) {
        const [failed, setFailed] = useState(false);
        const safeSrc = safeImageUrl(src);
        const showImage = safeSrc && !failed && !safeSrc.includes("default/user_profile.png");

        return (
          <span className={`grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full border border-gold/30 bg-gold/10 font-display text-xl font-black text-gold ${className}`}>
            {showImage ? (
              <img src={safeSrc} alt="" className="h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
            ) : (
              initialsFromName(name)
            )}
          </span>
        );
      }

      const indiaStatusTabs = [
        { id: "live", label: "Live", icon: Icon.Radio },
        { id: "upcoming", label: "Future", icon: Icon.CalendarDays },
        { id: "recent", label: "Past", icon: Icon.History },
      ];

      const indiaLevelTabs = [
        { id: "all", label: "All Levels" },
        { id: "international", label: "International" },
        { id: "league", label: "League / IPL" },
        { id: "women", label: "Women" },
        { id: "domestic", label: "State Level" },
      ];

      function IndiaMatchesPage() {
        const { loading, error, data } = useIndiaMatches();
        const [statusTab, setStatusTab] = useState("live");
        const [levelTab, setLevelTab] = useState("all");
        const [selectedMonth, setSelectedMonth] = useState("");
        const matchesForStatus = asArray(data[statusTab]);
        const filteredMatches = matchesForStatus.filter((match) => levelTab === "all" || match.level === levelTab);
        const featureMatch = asArray(data.live)[0] || asArray(data.upcoming)[0] || asArray(data.recent)[0];
        const rankings = normalizedIndiaRankings(data);
        const importantMatches = asArray(data.importantMatches).filter((match) => isRadarWindowMatch(match)).slice(0, 10);
        const importantTournaments = asArray(data.importantTournaments)
          .map((tournament) => {
            const matches = asArray(tournament.matches).filter((match) => isRadarWindowMatch(match));
            if (!matches.length) return null;
            return {
              ...tournament,
              total: matches.length,
              live: matches.filter((match) => match.status === "live").length,
              upcoming: matches.filter((match) => match.status === "upcoming").length,
              recent: matches.filter((match) => match.status === "recent").length,
              startTime: matches.map((match) => match.startTime).sort()[0] || tournament.startTime,
              endTime: matches.map((match) => match.startTime).sort().at(-1) || tournament.endTime,
              matches,
            };
          })
          .filter(Boolean);
        const [selectedTournamentId, setSelectedTournamentId] = useState("");
        const [radarLevel, setRadarLevel] = useState("all");
        const [tournamentView, setTournamentView] = useState("radar");
        const radarTournaments = radarLevel === "all"
          ? importantTournaments
          : importantTournaments.filter((tournament) => tournament.level === radarLevel);
        const activeTournament = importantTournaments.find((tournament) => tournament.id === selectedTournamentId) || importantTournaments[0];
        const monthlyResults = asArray(data.importantResultsByMonth)
          .map((month) => ({ ...month, matches: asArray(month.matches).filter((match) => isRadarWindowMatch(match)) }))
          .filter((month) => month.matches.length);
        const activeMonth = monthlyResults.find((month) => month.month === selectedMonth) || monthlyResults[0];

        return (
          <main className="route-bg page-grain min-h-screen px-5 pb-16 pt-36 sm:px-8">
            <section className="mx-auto max-w-7xl">
              <div className="grid gap-8 lg:grid-cols-[0.88fr_1.12fr] lg:items-end">
                <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }}>
                  <p className="text-xs font-black uppercase tracking-[0.32em] text-cyan">India Cricket Feed</p>
                  <h1 className="mt-4 font-display text-6xl font-black uppercase leading-none text-white sm:text-8xl">
                    India Match Room
                  </h1>
                  <p className="mt-6 max-w-2xl text-lg leading-8 text-white/68">
                    Track India-linked live scores, completed results and upcoming fixtures across international, league, women and domestic/state cricket.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3 text-xs font-black uppercase tracking-[0.16em]">
                    <span className="rounded-full border border-gold/30 bg-gold/10 px-4 py-2 text-gold">
                      {loading ? "Syncing now" : `Checked ${formatFeedDate(data.lastCheckedAt || data.syncedAt)}`}
                    </span>
                    <span className="rounded-full border border-white/12 bg-white/7 px-4 py-2 text-white/58">
                      {error ? "Using saved feed" : data.sourceStatus || "ready"}
                    </span>
                  </div>
                </motion.div>

                <div className="glass rounded-[8px] p-5">
                  <div className="grid gap-3 sm:grid-cols-4">
                    <LiveStat label="Live" value={data.summary?.live ?? asArray(data.live).length} />
                    <LiveStat label="Future" value={data.summary?.upcoming ?? asArray(data.upcoming).length} />
                    <LiveStat label="Past" value={data.summary?.recent ?? asArray(data.recent).length} />
                    <LiveStat label="Levels" value={rankings.length} />
                  </div>
                </div>
              </div>

              <div className="flex flex-col">
              <section className="order-1 mt-6 glass rounded-[8px] p-5" aria-labelledby="match-filter-title">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-gold">Match filter</p>
                    <h2 id="match-filter-title" className="mt-2 font-display text-4xl font-black uppercase text-white">Choose your match room</h2>
                  </div>
                  <p className="max-w-md text-sm leading-6 text-white/52">Set the status and match type first. The selected results appear below the radar and tournament details.</p>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-white/42">Status</span>
                    <select
                      aria-label="India match status"
                      value={statusTab}
                      onChange={(event) => setStatusTab(event.target.value)}
                      className="min-h-11 w-full appearance-none rounded-[8px] border border-gold/35 bg-night px-4 text-xs font-black uppercase tracking-[0.14em] text-gold outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
                    >
                      {indiaStatusTabs.map((item) => <option key={item.id} value={item.id} className="bg-night text-white">{item.label}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-2">
                    <span className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-white/42">Match type</span>
                    <select
                      aria-label="India match level"
                      value={levelTab}
                      onChange={(event) => setLevelTab(event.target.value)}
                      className="min-h-11 w-full appearance-none rounded-[8px] border border-cyan/35 bg-night px-4 text-xs font-black uppercase tracking-[0.14em] text-cyan outline-none transition focus:border-cyan focus:ring-2 focus:ring-cyan/20"
                    >
                      {indiaLevelTabs.map((item) => <option key={item.id} value={item.id} className="bg-night text-white">{item.label}</option>)}
                    </select>
                  </label>
                </div>
              </section>

              <section className="order-4 mt-10 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]" aria-labelledby="important-results-title">
                <div className="glass rounded-[8px] p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.24em] text-gold">Big match radar</p>
                      <h2 id="important-results-title" className="mt-2 font-display text-4xl font-black uppercase text-white">Important matches</h2>
                    </div>
                    <span className="text-xs font-black uppercase tracking-[0.16em] text-white/38">Finals • Semis • Major tournaments</span>
                  </div>
                  <div className="mt-4 divide-y divide-white/10">
                    {importantMatches.length ? importantMatches.map((match) => <IndiaImportantMatchRow key={match.id} match={match} />) : (
                      <p className="py-5 text-sm leading-7 text-white/58">Important matches will appear here when the public schedule lists a knockout or major-tournament fixture.</p>
                    )}
                  </div>
                </div>

                <div className="glass rounded-[8px] p-5">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan">Monthly results</p>
                      <h2 className="mt-2 font-display text-4xl font-black uppercase text-white">Biggest outcomes</h2>
                    </div>
                    <span className="font-display text-3xl font-black text-cyan">{activeMonth?.matches?.length || 0}</span>
                  </div>
                  {monthlyResults.length ? (
                    <label className="mt-5 grid gap-2">
                      <span className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-white/42">Results month</span>
                      <select
                        aria-label="Important match results month"
                        value={activeMonth?.month || ""}
                        onChange={(event) => setSelectedMonth(event.target.value)}
                        className="min-h-11 w-full appearance-none rounded-[8px] border border-cyan/35 bg-night px-4 text-xs font-black uppercase tracking-[0.14em] text-cyan outline-none transition focus:border-cyan focus:ring-2 focus:ring-cyan/20"
                      >
                        {monthlyResults.map((month) => <option key={month.month} value={month.month} className="bg-night text-white">{month.label}</option>)}
                      </select>
                    </label>
                  ) : null}
                  <div className="mt-4 divide-y divide-white/10">
                    {activeMonth?.matches?.length ? activeMonth.matches.map((match) => <IndiaImportantMatchRow key={match.id} match={match} compact />) : (
                      <p className="py-5 text-sm leading-7 text-white/58">No completed important result is available in the saved feed yet.</p>
                    )}
                  </div>
                </div>
              </section>

              <section className="order-3 mt-5 glass rounded-[8px] p-5" aria-labelledby="tournament-tracker-title">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-gold">Long-run coverage</p>
                    <h2 id="tournament-tracker-title" className="mt-2 font-display text-4xl font-black uppercase text-white">Tournament trackers</h2>
                  </div>
                  <p className="max-w-xl text-sm leading-6 text-white/52">A tournament stays together here across every month of its schedule, from first fixture to final result.</p>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {importantTournaments.length ? (
                    <label className="grid gap-2">
                      <span className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-white/42">Follow tournament</span>
                      <select
                        aria-label="Follow important tournament"
                        value={activeTournament?.id || ""}
                        onChange={(event) => setSelectedTournamentId(event.target.value)}
                        className="min-h-11 w-full appearance-none rounded-[8px] border border-gold/35 bg-night px-4 text-xs font-black uppercase tracking-[0.14em] text-gold outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
                      >
                        {importantTournaments.map((tournament) => <option key={tournament.id} value={tournament.id} className="bg-night text-white">{tournament.series}</option>)}
                      </select>
                    </label>
                  ) : null}
                  <label className="grid gap-2">
                    <span className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-white/42">Radar type</span>
                    <select
                      aria-label="Tournament radar type"
                      value={radarLevel}
                      onChange={(event) => setRadarLevel(event.target.value)}
                      className="min-h-11 w-full appearance-none rounded-[8px] border border-cyan/35 bg-night px-4 text-xs font-black uppercase tracking-[0.14em] text-cyan outline-none transition focus:border-cyan focus:ring-2 focus:ring-cyan/20"
                    >
                      {indiaLevelTabs.map((item) => <option key={item.id} value={item.id} className="bg-night text-white">{item.label}</option>)}
                    </select>
                  </label>
                </div>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-white/38">Select a node to open its match timeline • Showing {radarTournaments.length} of {importantTournaments.length} tournament groups</p>
                  <div className="inline-flex rounded-full border border-white/12 bg-night/55 p-1" role="group" aria-label="Tournament display mode">
                    <button type="button" onClick={() => setTournamentView("radar")} aria-pressed={tournamentView === "radar"} className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-xs font-black uppercase tracking-[0.14em] transition ${tournamentView === "radar" ? "bg-gold text-night" : "text-white/55 hover:text-white"}`}>
                      <Icon.Radio size={15} /> Radar
                    </button>
                    <button type="button" onClick={() => setTournamentView("list")} aria-pressed={tournamentView === "list"} className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-xs font-black uppercase tracking-[0.14em] transition ${tournamentView === "list" ? "bg-cyan text-night" : "text-white/55 hover:text-white"}`}>
                      <Icon.History size={15} /> List
                    </button>
                  </div>
                </div>
                {tournamentView === "radar" ? (
                  <IndiaTournamentRadar tournaments={radarTournaments} activeId={activeTournament?.id} onSelect={setSelectedTournamentId} />
                ) : (
                  <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {importantTournaments.length ? importantTournaments.map((tournament) => <IndiaTournamentTracker key={tournament.id} tournament={tournament} active={tournament.id === activeTournament?.id} onSelect={() => setSelectedTournamentId(tournament.id)} />) : (
                      <p className="text-sm leading-7 text-white/58">Tournament tracking will appear when the public feed exposes a major tournament fixture.</p>
                    )}
                  </div>
                )}
                {activeTournament ? (
                  <div className="mt-5 rounded-[8px] border border-white/10 bg-night/38 p-4">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan">Selected timeline</p>
                        <h3 className="mt-1 font-display text-3xl font-black uppercase text-white">{activeTournament.series}</h3>
                      </div>
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-white/38">{activeTournament.matches.length} fixtures across the full tournament</p>
                    </div>
                    <div className="mt-4 max-h-[34rem] overflow-y-auto divide-y divide-white/10 pr-2">
                      {activeTournament.matches.map((match) => <IndiaImportantMatchRow key={match.id} match={match} compact />)}
                    </div>
                  </div>
                ) : null}
              </section>

              <div className="order-2 mt-10 grid gap-5 xl:grid-cols-[1.05fr_1.05fr]">
                <div className="grid gap-5">
                  {featureMatch ? (
                    <IndiaFeatureMatch match={featureMatch} syncedAt={data.lastCheckedAt || data.syncedAt} />
                  ) : (
                    <div className="glass rounded-[8px] p-6">
                      <p className="font-display text-4xl font-black uppercase text-white">No India match listed right now</p>
                      <p className="mt-3 leading-7 text-white/62">
                        The automated feed is ready. When a live, recent or upcoming India-linked match is available, it will appear here and in the top panel.
                      </p>
                    </div>
                  )}

                  <div className="glass rounded-[8px] p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.24em] text-gold">Filtered matches</p>
                        <h2 className="mt-2 font-display text-4xl font-black uppercase text-white">Live, Past and Future</h2>
                      </div>
                      <span className="rounded-full border border-white/12 bg-night/55 px-3 py-2 text-[0.62rem] font-black uppercase tracking-[0.14em] text-white/50">{indiaStatusTabs.find((item) => item.id === statusTab)?.label} • {indiaLevelTabs.find((item) => item.id === levelTab)?.label}</span>
                    </div>

                    <div className="mt-6 grid gap-3">
                      {filteredMatches.length ? (
                        filteredMatches.map((match) => <IndiaMatchCard key={match.id} match={match} syncedAt={data.lastCheckedAt || data.syncedAt} />)
                      ) : (
                        <div className="rounded-[8px] border border-white/10 bg-night/52 p-5">
                          <p className="font-display text-3xl font-black uppercase text-white">Nothing in this view</p>
                          <p className="mt-2 text-sm leading-6 text-white/58">
                            Try another status or level. The feed refreshes automatically when GitHub Pages rebuilds.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid gap-5">
                  <IndiaLevelRankings rankings={rankings} />
                  <div className="hidden glass rounded-[8px] p-5">
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan">Update rhythm</p>
                    <h2 className="mt-2 font-display text-4xl font-black uppercase text-white">Near-Live Scoreboard</h2>
                    <p className="mt-4 leading-8 text-white/66">
                      The browser checks the saved site feed every minute normally and every 15 seconds while a match is live. GitHub Actions refreshes the India match feed every 5 minutes across senior, women’s, A-team and U19 pathways when the public source exposes a change.
                    </p>
                    <p className="mt-4 rounded-[8px] border border-white/10 bg-white/[0.045] p-4 text-sm leading-7 text-white/56">
                      Source: {data.source || "public cricket feed"}. Coverage: {asArray(data.coverage?.pathways).length || 0} India pathways plus domestic/state schedule pages and India-linked live-score pages. For ball-by-ball guaranteed data, connect an official paid cricket data API later.
                    </p>
                  </div>
                </div>
              </div>
              </div>
            </section>
          </main>
        );
      }

      function normalizedIndiaRankings(data) {
        const existing = asArray(data.rankings);
        return indiaLevelTabs
          .filter((level) => level.id !== "all")
          .map((level, index) => {
            const found = existing.find((item) => item.id === level.id) || {};
            return {
              id: level.id,
              label: found.label || level.label,
              order: found.order || index + 1,
              live: found.live || 0,
              recent: found.recent || 0,
              upcoming: found.upcoming || 0,
              total: found.total || 0,
            };
          })
          .sort((a, b) => a.order - b.order);
      }

      function CaptainBallFormatCard({ format }) {
        const accent = format.key === "LEATHER" ? "#F4B942" : "#23d5e8";
        const glow = format.key === "LEATHER" ? "rgba(244,185,66,0.42)" : "rgba(35,213,232,0.42)";
        const hasPlayerLines = format.scorecardsWithPlayerLine > 0;
        return (
          <article className="rounded-[8px] border border-white/12 bg-white/[0.045] p-5" style={{ borderColor: `${accent}55`, boxShadow: `0 0 24px ${glow}` }}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em]" style={{ color: accent }}>{format.label}</p>
                <h2 className="mt-2 font-display text-3xl font-black uppercase text-white">Format snapshot</h2>
              </div>
              <span className="rounded-full border px-3 py-1 text-[0.62rem] font-black uppercase tracking-[0.14em]" style={{ borderColor: `${accent}66`, color: accent }}>{format.matches} tracked</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <LiveStat label="Matches" value={format.matches || "-"} />
              <LiveStat label="Player lines" value={format.scorecardsWithPlayerLine || "-"} />
              <LiveStat label="Recent runs" value={hasPlayerLines ? format.runs : "-"} />
              <LiveStat label="Recent wkts" value={hasPlayerLines ? format.wickets : "-"} />
            </div>
            <p className="mt-4 text-xs leading-5 text-white/52">{hasPlayerLines ? "Runs and wickets are summed from verified public scorecard player lines currently available to CricKuru." : "The public match record identifies the format, but no verified player line is available in the saved scorecard snapshot yet. Overall career totals above remain sourced from CricHeroes."}</p>
            <p className="mt-2 text-[0.62rem] font-black uppercase tracking-[0.12em] text-white/35">Latest record: {format.latestDate}</p>
          </article>
        );
      }

      function CaptainProfilePage() {
        const { loading, data } = useLiveCricketFeed();
        const team = data.team || liveFeedFallback.team;
        const player = asArray(data.players).find((item) => Number(item.id) === 29139731 || item.name?.toLowerCase() === "ankit kulshreshtha");
        const stats = visiblePlayerOverallStats(player);
        const level = playerLevel(player);
        const formatStats = playerBallTypeStats(player);
        const profileUrl = player?.profileUrl || "https://cricheroes.com/player-profile/29139731/ankit-kulshreshtha/profile";
        const statsUrl = player?.statsUrl || "https://cricheroes.com/player-profile/29139731/ankit-kulshreshtha/stats";
        const updatedAt = data.lastSuccessfulSyncAt || data.playerStatsUpdatedAt || data.syncedAt;

        return (
          <main className="route-bg page-grain min-h-screen px-5 pb-16 pt-36 sm:px-8">
            <section className="mx-auto max-w-5xl">
              <div className="glass rounded-[8px] p-6 sm:p-10">
                <p className="text-xs font-black uppercase tracking-[0.32em] text-cyan">Kurukshetra Warriors captain</p>
                <h1 className="mt-4 font-display text-6xl font-black uppercase leading-none text-white sm:text-8xl">Ankit Kulshreshtha</h1>
                <p className="mt-5 max-w-3xl text-lg leading-8 text-white/68">
                  Ankit Kulshreshtha is the captain of Kurukshetra Warriors, the Greater Noida cricket team followed by CricKuru. This public profile connects the captain, team and official CricHeroes record.
                </p>
                <div className="mt-6 flex flex-wrap gap-3 text-xs font-black uppercase tracking-[0.15em]">
                  <span className="rounded-full border border-gold/35 bg-gold/10 px-4 py-2 text-gold">Captain</span>
                  <PlayerLevelBadge level={level} compact />
                  <span className="rounded-full border border-cyan/35 bg-cyan/10 px-4 py-2 text-cyan">Kurukshetra Warriors</span>
                  <span className="rounded-full border border-white/12 bg-white/7 px-4 py-2 text-white/55">{loading ? "Syncing CricHeroes" : `Updated ${formatFeedDate(updatedAt)}`}</span>
                </div>
                <div className="mt-8 grid gap-3 sm:grid-cols-4">
                  <LiveStat label="Career matches" value={stats.matches || "-"} />
                  <LiveStat label="Runs" value={stats.runs || "-"} />
                  <LiveStat label="Wickets" value={stats.wickets || "-"} />
                  <LiveStat label="Captain matches" value={stats.captainMatches || "-"} />
                </div>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-gold px-6 text-sm font-black uppercase tracking-[0.16em] text-night">Official CricHeroes profile <Icon.ExternalLink size={15} /></a>
                  <a href={statsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/7 px-6 text-sm font-black uppercase tracking-[0.16em] text-white hover:border-cyan hover:text-cyan">View career stats <Icon.ExternalLink size={15} /></a>
                </div>
                <div className="mt-8 grid gap-4 lg:grid-cols-2">
                  {formatStats.map((format) => <CaptainBallFormatCard key={format.key} format={format} />)}
                </div>
                <p className="mt-4 rounded-[6px] border border-white/10 bg-night/55 p-3 text-xs leading-5 text-white/48">
                  {player?.publicStatsLocked
                    ? "CricHeroes currently displays Ankit's career totals as unavailable on the public stats page and gates detailed tables behind PRO. CricKuru leaves those headline fields blank and shows only independently verified public match-history data below."
                    : "Overall career totals above come from the public CricHeroes profile snapshot. Format cards below use ball-type tags and player lines from the public match history."}
                </p>
              </div>
              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <div className="rounded-[8px] border border-white/12 bg-white/[0.045] p-6">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-gold">Team connection</p>
                  <h2 className="mt-2 font-display text-4xl font-black uppercase text-white">Leading the Warriors</h2>
                  <p className="mt-3 leading-7 text-white/60">The live CricHeroes team snapshot identifies Ankit Kulshreshtha as captain and links his public player profile to Kurukshetra Warriors.</p>
                  <a href={team.cricHeroesUrl || CricLinks.profile} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-cyan hover:text-white">Open team profile <Icon.ExternalLink size={15} /></a>
                </div>
                <div className="rounded-[8px] border border-white/12 bg-white/[0.045] p-6">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan">CricKuru coverage</p>
                  <h2 className="mt-2 font-display text-4xl font-black uppercase text-white">Captain profile signals</h2>
                  <div className="mt-4 grid gap-3 text-sm font-semibold text-white/65">
                    <p className="rounded-[6px] bg-night/55 p-3">Role: Captain and team administrator</p>
                    <p className="rounded-[6px] bg-night/55 p-3">Team: Kurukshetra Warriors</p>
                    <p className="rounded-[6px] bg-night/55 p-3">Location: {team.city || "Greater Noida"}</p>
                  </div>
                </div>
              </div>
            </section>
          </main>
        );
      }

      function IndiaImportantMatchRow({ match, compact = false }) {
        return (
          <article className={`${compact ? "py-3" : "py-4"} first:pt-0 last:pb-0`}>
            <div className="flex flex-wrap items-center gap-2 text-[0.62rem] font-black uppercase tracking-[0.15em]">
              <span className="rounded-full border border-gold/35 bg-gold/10 px-2.5 py-1 text-gold">{match.importance || "Important"}</span>
              <span className={match.status === "live" ? "text-crimson" : match.status === "upcoming" ? "text-cyan" : "text-white/40"}>{match.statusLabel || match.status}</span>
              <span className="text-white/35">{compactFeedDate(match.startTime)}</span>
            </div>
            <h3 className={`${compact ? "text-xl" : "text-2xl"} mt-2 font-display font-black uppercase leading-tight text-white`}>{matchTitle(match)}</h3>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.1em] text-white/40">{match.series || "Major cricket fixture"}</p>
            {asArray(match.starPerformers).length ? (
              <div className="mt-3 rounded-[6px] border border-gold/20 bg-gold/8 px-3 py-2">
                <p className="text-[0.58rem] font-black uppercase tracking-[0.14em] text-gold">Star performer</p>
                {match.starPerformers.map((performer) => <p key={`${performer.name}-${performer.performance}`} className="mt-1 text-sm font-bold text-white/80">{performer.name}{performer.performance ? ` - ${performer.performance}` : ""}</p>)}
              </div>
            ) : match.status === "recent" ? <p className="mt-3 text-xs font-semibold text-white/38">Star performer: scorecard detail pending</p> : null}
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {asArray(match.teams).map((team, index) => (
                <p key={`${team.name}-${index}`} className="rounded-[6px] bg-night/55 px-3 py-2 text-sm font-bold text-white/76">{matchTeamLabel(team) || "Score pending"}</p>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-bold text-gold">{match.overview || "Result pending"}</p>
              {match.sourceUrl && <a href={match.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[0.65rem] font-black uppercase tracking-[0.15em] text-cyan hover:text-white">Scorecard <Icon.ExternalLink size={13} /></a>}
            </div>
          </article>
        );
      }

      function IndiaTournamentTracker({ tournament, active: selected = false, onSelect }) {
        const active = tournament.live > 0 || tournament.upcoming > 0;
        return (
          <article className={`rounded-[8px] border bg-night/52 p-4 transition ${selected ? "border-gold/60 shadow-[0_0_24px_rgba(244,185,66,0.14)]" : "border-white/10"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-display text-2xl font-black uppercase leading-tight text-white">{tournament.series}</p>
                <p className="mt-1 text-[0.62rem] font-black uppercase tracking-[0.15em] text-white/38">{tournament.levelLabel}</p>
              </div>
              <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[0.6rem] font-black uppercase tracking-[0.14em] ${active ? "border-cyan/40 bg-cyan/10 text-cyan" : "border-white/15 bg-white/7 text-white/45"}`}>
                {tournament.live ? "Live" : tournament.upcoming ? "In progress" : "Completed"}
              </span>
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.1em] text-white/45">
              {compactFeedDate(tournament.startTime)} - {compactFeedDate(tournament.endTime)}
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[0.62rem] font-black uppercase tracking-[0.1em]">
              <span className="rounded-[6px] bg-crimson/10 px-2 py-2 text-crimson">Live {tournament.live}</span>
              <span className="rounded-[6px] bg-gold/10 px-2 py-2 text-gold">Future {tournament.upcoming}</span>
              <span className="rounded-[6px] bg-white/7 px-2 py-2 text-white/48">Past {tournament.recent}</span>
            </div>
            <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-white/38">{tournament.total} important fixtures tracked</p>
            {onSelect ? <button type="button" onClick={onSelect} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full border border-cyan/35 px-4 text-[0.65rem] font-black uppercase tracking-[0.14em] text-cyan hover:border-cyan hover:text-white">Open timeline <Icon.ArrowRight size={14} /></button> : null}
          </article>
        );
      }

      function IndiaTournamentRadar({ tournaments, activeId, onSelect }) {
        const ringOrder = ["international", "women", "league", "domestic"];
        const ringConfig = {
          international: {
            label: "International / orange rim",
            className: "border-orange-300/45 bg-orange-300/10 text-orange-200",
            cardClass: "border-orange-200/30 bg-orange-200/10 text-orange-50 hover:border-orange-200/70",
            selectedClass: "border-orange-100 bg-orange-200 text-night shadow-[0_0_26px_rgba(251,146,60,0.32)]",
          },
          women: {
            label: "Women / blue rim",
            className: "border-blue-300/45 bg-blue-300/10 text-blue-200",
            cardClass: "border-blue-200/30 bg-blue-200/10 text-blue-50 hover:border-blue-200/70",
            selectedClass: "border-blue-100 bg-blue-200 text-night shadow-[0_0_26px_rgba(96,165,250,0.32)]",
          },
          league: {
            label: "League / violet rim",
            className: "border-violet-300/45 bg-violet-300/10 text-violet-200",
            cardClass: "border-violet-200/30 bg-violet-200/10 text-violet-50 hover:border-violet-200/70",
            selectedClass: "border-violet-100 bg-violet-200 text-night shadow-[0_0_26px_rgba(167,139,250,0.32)]",
          },
          domestic: {
            label: "State / green outer rim",
            className: "border-emerald-300/45 bg-emerald-300/10 text-emerald-200",
            cardClass: "border-emerald-200/30 bg-emerald-200/10 text-emerald-50 hover:border-emerald-200/70",
            selectedClass: "border-emerald-100 bg-emerald-200 text-night shadow-[0_0_26px_rgba(110,231,183,0.32)]",
          },
        };
        const grouped = ringOrder.reduce((groups, level) => {
          groups[level] = tournaments.filter((tournament) => tournament.level === level);
          return groups;
        }, {});
        const renderRing = (level) => {
          const group = grouped[level];
          const ring = ringConfig[level];
          if (!group.length) return null;
          return (
            <section className={`rounded-[8px] border p-2.5 shadow-[inset_0_0_28px_rgba(255,255,255,0.025)] ${ring.className}`} aria-label={`${ring.label} tournaments`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[0.58rem] font-black uppercase tracking-[0.14em]">{ring.label}</p>
                <span className="text-[0.54rem] font-bold uppercase tracking-[0.1em] opacity-65">{group.length} tracked</span>
              </div>
              <div className="mt-2 flex min-w-0 flex-wrap justify-center gap-1.5">
                {group.map((tournament) => {
                  const selected = tournament.id === activeId;
                  return (
                    <button key={tournament.id} type="button" onClick={() => onSelect(tournament.id)} aria-pressed={selected} title={`Open ${tournament.series}`} className={`min-h-11 w-[7.2rem] max-w-full min-w-0 overflow-hidden rounded-full border px-3 py-1.5 text-center transition sm:w-[8rem] ${selected ? ring.selectedClass : ring.cardClass}`}>
                      <span className="block truncate text-[0.55rem] font-black uppercase tracking-[0.06em]">{tournament.series}</span>
                      <span className="mt-0.5 block truncate text-[0.48rem] font-bold uppercase tracking-[0.08em] opacity-65">{tournament.total} fixtures</span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        };
        return (
          <div className="relative mx-auto mt-5 overflow-hidden rounded-[8px] border border-cyan/18 bg-[radial-gradient(ellipse_at_50%_50%,rgba(34,211,238,0.15),transparent_18%),radial-gradient(ellipse_at_50%_50%,rgba(244,185,66,0.08),transparent_58%),#05070B] p-3 sm:min-h-[34rem] sm:p-5" aria-label="Important tournament radar">
            <div className="pointer-events-none absolute inset-x-[3%] top-[10%] bottom-[8%] rounded-[50%] border border-cyan/30 shadow-[0_0_42px_rgba(34,211,238,0.08)]" />
            <div className="pointer-events-none absolute inset-x-[8%] top-[20%] bottom-[18%] rounded-[50%] border border-cyan/16" />
            <div className="pointer-events-none absolute inset-x-[16%] top-[31%] bottom-[30%] rounded-[50%] border border-cyan/12" />
            <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-2 text-[0.55rem] font-black uppercase tracking-[0.12em] sm:left-5 sm:top-5">
              {ringOrder.map((level) => <span key={level} className={`rounded-full border px-2 py-1 ${ringConfig[level].className}`}>{ringConfig[level].label}</span>)}
            </div>
            <div className="pointer-events-none absolute left-1/2 top-[17%] h-[66%] w-px -translate-x-1/2 bg-cyan/15" />
            <div className="pointer-events-none absolute left-[7%] top-1/2 h-px w-[86%] -translate-y-1/2 bg-cyan/15" />
            <div className="relative z-20 grid gap-2 pt-20 sm:grid-cols-[minmax(0,1fr)_7rem_minmax(0,1fr)] sm:grid-rows-[auto_minmax(11rem,1fr)_auto] sm:gap-3 sm:pt-24">
              <div className="sm:col-span-3 sm:row-start-1">{renderRing("international")}</div>
              <div className="sm:col-start-1 sm:row-start-2 sm:self-center">{renderRing("women")}</div>
              <div className="flex items-center justify-center sm:col-start-2 sm:row-start-2">
                <div className="grid h-20 w-20 place-items-center rounded-full border border-gold/55 bg-night/90 text-center shadow-[0_0_38px_rgba(244,185,66,0.2)] sm:h-24 sm:w-24">
                  <div><Icon.Radio className="mx-auto text-gold" size={22} /><p className="mt-1 text-[0.54rem] font-black uppercase tracking-[0.14em] text-gold">Match radar</p></div>
                </div>
              </div>
              <div className="sm:col-start-3 sm:row-start-2 sm:self-center">{renderRing("league")}</div>
              <div className="sm:col-span-3 sm:row-start-3">{renderRing("domestic")}</div>
              {!tournaments.length ? <p className="rounded-[8px] border border-white/10 bg-night/70 p-6 text-center text-sm leading-7 text-white/58 sm:col-span-3">No tournaments match this radar type yet.</p> : null}
            </div>
          </div>
        );
      }

      function IndiaFeatureMatch({ match, syncedAt }) {
        return (
          <article className="relative overflow-hidden rounded-[8px] border border-gold/24 bg-[radial-gradient(circle_at_88%_12%,rgba(244,185,66,0.2),transparent_34%),rgba(255,255,255,0.05)] p-6">
            <div className="absolute right-[-56px] top-[-60px] h-44 w-44 rounded-full bg-gold/10 blur-3xl" aria-hidden="true" />
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-gold">{match.statusLabel || match.status || "India match"}</p>
                  {match.status === "live" && <span className="inline-flex items-center gap-2 rounded-full border border-crimson/50 bg-crimson/15 px-3 py-1 text-[0.62rem] font-black uppercase tracking-[0.16em] text-crimson"><span className="h-2 w-2 animate-pulse rounded-full bg-crimson" /> Live now</span>}
                </div>
                <h2 className="mt-2 font-display text-5xl font-black uppercase leading-none text-white">{matchTitle(match)}</h2>
                <p className="mt-3 text-sm font-semibold text-white/52">{matchTimeLine(match)}</p>
              </div>
              <span className={levelBadgeClass(match.level)}>
                {match.levelLabel || match.level || "cricket"}
              </span>
            </div>
            <div className="relative mt-6 grid gap-3 sm:grid-cols-2">
              {asArray(match.teams).length ? (
                asArray(match.teams).map((team, index) => <IndiaTeamScore key={`${team.name}-${index}`} team={team} />)
              ) : (
                <p className="rounded-[8px] border border-white/10 bg-night/55 p-4 font-display text-3xl font-black uppercase text-white">
                  Scorecard pending
                </p>
              )}
            </div>
            <p className="relative mt-5 rounded-[8px] border border-white/10 bg-night/55 p-4 text-base font-bold leading-7 text-white/78">
              {match.overview || "Match details will update when the public feed posts the next score state."}
            </p>
            <p className="relative mt-3 text-xs font-black uppercase tracking-[0.16em] text-white/38" aria-live="polite">
              Score checked {formatFeedDate(syncedAt)}
            </p>
          </article>
        );
      }

      function IndiaTeamScore({ team }) {
        return (
          <div className="rounded-[8px] border border-white/10 bg-night/55 p-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-white/44">{cleanMatchText(team.name || team.team, "Team")}</p>
            <p className="mt-2 font-display text-4xl font-black uppercase text-white">{cleanMatchText(team.score || team.run, "Yet to bat")}</p>
          </div>
        );
      }

      function IndiaMatchCard({ match, syncedAt }) {
        return (
          <article className="rounded-[8px] border border-white/10 bg-white/[0.04] p-4 transition hover:border-gold/35 hover:bg-white/[0.06]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-white/12 bg-night/70 px-3 py-1 text-[0.62rem] font-black uppercase tracking-[0.16em] text-white/55">
                    {match.statusLabel || match.status}
                  </span>
                  {match.status === "live" && <span className="inline-flex items-center gap-2 rounded-full border border-crimson/50 bg-crimson/15 px-3 py-1 text-[0.62rem] font-black uppercase tracking-[0.16em] text-crimson"><span className="h-2 w-2 animate-pulse rounded-full bg-crimson" /> Live now</span>}
                  <span className={levelBadgeClass(match.level)}>{match.levelLabel || match.level}</span>
                </div>
                <h3 className="mt-3 font-display text-3xl font-black uppercase leading-none text-white">{matchTitle(match)}</h3>
                <p className="mt-2 text-sm font-semibold text-white/50">{matchTimeLine(match)}</p>
              </div>
              {match.sourceUrl && (
                <a
                  href={match.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-white/12 px-4 text-xs font-black uppercase tracking-[0.14em] text-white/62 transition hover:border-gold/45 hover:text-gold"
                >
                  Source <Icon.ExternalLink size={14} />
                </a>
              )}
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {asArray(match.teams).map((team, index) => (
                <div key={`${team.name}-${index}`} className="rounded-[8px] bg-night/52 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/40">{cleanMatchText(team.name || team.team, `Team ${index + 1}`)}</p>
                  <p className="mt-1 font-display text-2xl font-black uppercase text-white">{cleanMatchText(team.score || team.run, "Score pending")}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm font-semibold leading-6 text-white/62">{match.overview || match.series || "Match update pending."}</p>
            <p className="mt-3 text-[0.65rem] font-black uppercase tracking-[0.16em] text-white/35">Score checked {formatFeedDate(syncedAt)}</p>
          </article>
        );
      }

      function IndiaLevelRankings({ rankings }) {
        return (
          <div className="glass rounded-[8px] p-5">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-gold">Level ranking</p>
            <h2 className="mt-2 font-display text-4xl font-black uppercase text-white">International to State</h2>
            <div className="mt-5 grid gap-3">
              {rankings.map((level) => (
                <div key={level.id} className="rounded-[8px] border border-white/10 bg-night/52 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-[8px] border border-gold/24 bg-gold/10 font-display text-xl font-black text-gold">
                        {level.order}
                      </span>
                      <div>
                        <p className="font-display text-2xl font-black uppercase leading-none text-white">{level.label}</p>
                        <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-white/38">{level.total} matches tracked</p>
                      </div>
                    </div>
                    <span className="font-display text-3xl font-black text-cyan">{level.live}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-black uppercase tracking-[0.12em]">
                    <span className="rounded-full bg-crimson/10 px-2 py-1 text-crimson">Live {level.live}</span>
                    <span className="rounded-full bg-gold/10 px-2 py-1 text-gold">Future {level.upcoming}</span>
                    <span className="rounded-full bg-white/7 px-2 py-1 text-white/48">Past {level.recent}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      function levelBadgeClass(level) {
        const tone = {
          international: "border-gold/40 bg-gold/10 text-gold",
          league: "border-cyan/40 bg-cyan/10 text-cyan",
          women: "border-crimson/45 bg-crimson/10 text-crimson",
          domestic: "border-white/20 bg-white/8 text-white/68",
        }[level] || "border-white/20 bg-white/8 text-white/68";
        return `inline-flex items-center rounded-full border px-3 py-1 text-[0.62rem] font-black uppercase tracking-[0.16em] ${tone}`;
      }

      function CoinPage() {
        return (
          <main className="route-bg page-grain min-h-screen overflow-hidden px-5 pb-16 pt-36 sm:px-8">
            <section className="relative mx-auto max-w-7xl">
              <div className="absolute left-1/2 top-10 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gold/12 blur-3xl" aria-hidden="true" />
              <motion.div className="relative grid gap-8 lg:grid-cols-[1fr_0.85fr] lg:items-center" initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }}>
                <div className="glass rounded-[8px] p-6 sm:p-8">
                  <p className="text-xs font-black uppercase tracking-[0.32em] text-cyan">Launching Soon</p>
                  <h1 className="mt-4 font-display text-6xl font-black uppercase leading-none text-white sm:text-8xl">
                    Kurukshetra Meme Coin
                  </h1>
                  <p className="mt-5 max-w-2xl text-lg leading-8 text-white/68">
                    A community-first meme coin concept inspired by Kurukshetra Warriors cricket energy. Built for fans, memes and match-day culture.
                  </p>
                  <div className="mt-8 grid gap-4 sm:grid-cols-3">
                    <MiniStat label="Team" value="Warriors" />
                    <MiniStat label="Ticker" value="$KURU" />
                    <MiniStat label="Status" value="Soon" />
                  </div>
                  <div className="mt-8 rounded-[8px] border border-gold/24 bg-gold/8 p-4">
                    <p className="text-sm leading-7 text-white/70">
                      No token sale is live yet. This page is only a launch teaser for the Kurukshetra Warriors community.
                    </p>
                  </div>
                </div>
                <div className="relative mx-auto grid aspect-square w-full max-w-md place-items-center rounded-full border border-gold/35 bg-[radial-gradient(circle,#F4B942_0_22%,#B71932_23%_38%,#080D16_39%_100%)] shadow-[0_0_100px_rgba(244,185,66,.22)]">
                  <div className="grid h-[72%] w-[72%] place-items-center rounded-full border-4 border-night bg-gold text-center text-night shadow-2xl">
                    <div>
                      <p className="font-display text-7xl font-black uppercase leading-none">$KURU</p>
                      <p className="mt-2 text-xs font-black uppercase tracking-[0.25em]">Kurukshetra Warriors</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </section>
          </main>
        );
      }

      function GTGamingPage() {
        const features = [
          ["Frog mechanism", "Independent seat and backrest movement helps you adjust your working angle and stay in control through long sessions."],
          ["180° recline", "Move from focused play to a full recline for breaks, recovery or a quick reset between matches."],
          ["Memory foam support", "Memory foam head and lumbar cushions pair with a high-density seat core designed to retain its shape."],
          ["Heavy-duty build", "A steel frame and wear-resistant PU leather are built for repeated daily use, with black-and-gold diamond stitching."],
        ];

        return (
          <main className="route-bg page-grain min-h-screen overflow-hidden px-5 pb-16 pt-36 sm:px-8">
            <section className="mx-auto max-w-7xl">
              <motion.div
                className="grid items-center gap-10 lg:grid-cols-[1.02fr_0.98fr]"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.75, ease }}
              >
                <div>
                  <div className="flex flex-wrap items-center gap-3 text-xs font-black uppercase tracking-[0.25em]">
                    <span className="rounded-full border border-gold/35 bg-gold/10 px-3 py-1.5 text-gold">Official sponsor</span>
                    <span className="text-white/45">GT Gaming</span>
                  </div>
                  <h1 className="mt-6 max-w-3xl font-display text-6xl font-black uppercase leading-[0.9] text-white sm:text-8xl">The GT Throne</h1>
                  <p className="mt-6 max-w-2xl text-lg leading-8 text-white/70">
                    GT Gaming makes premium gaming chairs for players, streamers, creators and anyone who spends serious time at a desk. The GT Throne combines adjustability, cushioning and a durable build in a black-and-gold finish.
                  </p>
                  <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                    <a href="https://www.gtgaming.shop/" target="_blank" rel="sponsored noopener noreferrer" onClick={() => trackSponsorClick("gt_gaming_page_primary")} className="shine-button inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-gold px-6 text-sm font-black uppercase tracking-[0.16em] text-night">
                      Visit GT Gaming <Icon.ExternalLink size={16} />
                    </a>
                    <Link to="/warriors" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/7 px-6 text-sm font-black uppercase tracking-[0.16em] text-white/78 transition hover:border-gold/55 hover:text-gold">
                      Back to Warriors <Icon.ArrowRight size={16} />
                    </Link>
                  </div>
                  <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[["180°", "full recline"], ["2X", "memory foam"], ["Steel", "heavy-duty frame"], ["8+ hrs", "marathon comfort"]].map(([value, label]) => (
                      <div key={label} className="border-l border-gold/35 pl-3">
                        <p className="font-display text-2xl font-black text-gold">{value}</p>
                        <p className="mt-1 text-[0.62rem] font-black uppercase tracking-[0.14em] text-white/45">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="relative mx-auto w-full max-w-xl">
                  <div className="absolute -inset-6 rounded-[14px] bg-gold/10 blur-3xl" aria-hidden="true" />
                  <figure className="relative overflow-hidden rounded-[8px] border border-gold/30 bg-[#11100d] shadow-[0_18px_70px_rgba(0,0,0,0.4)]">
                    <img src={GT_GAMING_CHAIR_IMAGE} alt="GT Throne gaming chair by GT Gaming" className="aspect-[4/3] w-full object-contain" loading="eager" referrerPolicy="no-referrer" />
                    <figcaption className="flex items-center justify-between border-t border-gold/15 px-5 py-4 text-xs font-black uppercase tracking-[0.16em]">
                      <span className="text-white/55">GT Throne</span>
                      <span className="text-gold">Engineered in India</span>
                    </figcaption>
                  </figure>
                </div>
              </motion.div>

              <section className="mt-20 border-t border-white/10 pt-10" aria-labelledby="gt-features-heading">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-cyan">Why it is built this way</p>
                    <h2 id="gt-features-heading" className="mt-3 font-display text-4xl font-black uppercase text-white sm:text-6xl">Comfort meets control</h2>
                  </div>
                  <p className="max-w-md text-sm leading-7 text-white/55">A practical read of the product features published by GT Gaming, without pretending a chair can replace movement or a good desk setup.</p>
                </div>
                <div className="mt-8 grid gap-x-8 gap-y-8 md:grid-cols-2">
                  {features.map(([title, text], index) => (
                    <article key={title} className="border-t border-white/12 pt-5">
                      <div className="flex items-start gap-4">
                        <span className="font-display text-2xl font-black text-gold">0{index + 1}</span>
                        <div>
                          <h3 className="text-xl font-black text-white">{title}</h3>
                          <p className="mt-2 max-w-xl text-sm leading-7 text-white/62">{text}</p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="mt-16 grid gap-8 border-t border-white/10 pt-10 lg:grid-cols-[0.75fr_1.25fr]" aria-labelledby="gt-efficiency-heading">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-crimson">The efficiency check</p>
                  <h2 id="gt-efficiency-heading" className="mt-3 font-display text-4xl font-black uppercase text-white sm:text-5xl">What it helps you do</h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    ["Adjust faster", "Recline and tune your sitting angle as the session changes."],
                    ["Stay supported", "Cushions and a high-density seat core are aimed at steadier comfort."],
                    ["Keep going", "The steel frame and PU leather focus on everyday durability."],
                  ].map(([title, text]) => (
                    <div key={title} className="rounded-[8px] border border-white/12 bg-white/[0.035] p-5">
                      <h3 className="font-black text-gold">{title}</h3>
                      <p className="mt-2 text-sm leading-7 text-white/58">{text}</p>
                    </div>
                  ))}
                </div>
              </section>

              <div className="mt-16 flex flex-col items-start justify-between gap-5 border-t border-gold/20 pt-7 sm:flex-row sm:items-center">
                <p className="max-w-xl text-sm leading-7 text-white/55">For current availability, dimensions, pricing and delivery details, use the official GT Gaming store.</p>
                <a href="https://www.gtgaming.shop/" target="_blank" rel="sponsored noopener noreferrer" onClick={() => trackSponsorClick("gt_gaming_page_footer")} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-gold/35 px-5 text-sm font-black uppercase tracking-[0.14em] text-gold transition hover:border-gold hover:bg-gold/10">Explore the range <Icon.ExternalLink size={15} /></a>
              </div>
            </section>
          </main>
        );
      }

      function CricketGearShopPage() {
        const [selectedCategory, setSelectedCategory] = useState(AMAZON_COLLECTIONS[0]?.id || "all");
        const visibleCollections = selectedCategory === "all"
          ? AMAZON_COLLECTIONS
          : AMAZON_COLLECTIONS.filter((collection) => collection.id === selectedCategory);

        return (
          <main className="route-bg page-grain min-h-screen overflow-hidden px-5 pb-16 pt-36 sm:px-8">
            <section className="mx-auto max-w-7xl">
              <motion.div
                className="grid items-end gap-8 border-b border-white/10 pb-12 lg:grid-cols-[1.15fr_0.85fr]"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.75, ease }}
              >
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.32em] text-cyan">CricKuru gear desk</p>
                  <h1 className="mt-5 max-w-5xl font-display text-6xl font-black uppercase leading-[0.88] text-white sm:text-8xl">Build your match kit.</h1>
                  <p className="mt-6 max-w-2xl text-lg leading-8 text-white/68">
                    Curated Amazon India picks for every CricKuru session: bats, balls, protection, bags, wickets and training tools for society cricket, academy nets and match prep. Compare the checked snapshot price, then open the live Amazon listing for current availability.
                  </p>
                </div>
                <div className="glass rounded-[8px] border border-gold/20 p-5 sm:p-6">
                  <div className="flex items-start gap-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-gold/35 bg-gold/10 text-gold"><Icon.ShoppingBag size={20} /></span>
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-gold">Buying note</p>
                      <p className="mt-2 text-sm leading-7 text-white/62">Prices, sizes, stock and delivery are shown on the live Amazon listing. Check the product page before buying.</p>
                      <p className="mt-2 text-xs leading-5 text-white/42">As an Amazon Associate, CricKuru earns from qualifying purchases.</p>
                    </div>
                  </div>
                </div>
              </motion.div>

              <div className="mt-8 border-y border-white/10 py-4" aria-label="Shop categories">
                <div className="flex items-center gap-3">
                  <p className="shrink-0 text-[0.62rem] font-black uppercase tracking-[0.2em] text-white/42">Shop by category</p>
                  <div className="h-px flex-1 bg-white/10" />
                </div>
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Amazon cricket gear categories">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={selectedCategory === "all"}
                    onClick={() => setSelectedCategory("all")}
                    className={`shrink-0 rounded-full border px-3 py-2 text-[0.62rem] font-black uppercase tracking-[0.1em] transition ${selectedCategory === "all" ? "border-gold/60 bg-gold/12 text-gold" : "border-white/12 bg-white/[0.045] text-white/58 hover:border-white/25 hover:text-white"}`}
                  >
                    All products
                  </button>
                  {AMAZON_COLLECTIONS.map((collection) => {
                    const active = selectedCategory === collection.id;
                    const cyan = collection.accent === "cyan";
                    return (
                      <button
                        key={collection.id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setSelectedCategory(collection.id)}
                        className={`shrink-0 rounded-full border px-3 py-2 text-[0.62rem] font-black uppercase tracking-[0.1em] transition ${active ? (cyan ? "border-cyan/60 bg-cyan/12 text-cyan" : "border-gold/60 bg-gold/12 text-gold") : "border-white/12 bg-white/[0.045] text-white/58 hover:border-white/25 hover:text-white"}`}
                      >
                        {collection.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-8 space-y-12">
                {visibleCollections.map((collection) => {
                  const cyan = collection.accent === "cyan";
                  return (
                    <section key={collection.id} aria-labelledby={`${collection.id}-heading`}>
                      <div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <p className={`text-xs font-black uppercase tracking-[0.28em] ${cyan ? "text-cyan" : "text-gold"}`}>{collection.eyebrow}</p>
                          <h2 id={`${collection.id}-heading`} className="mt-2 font-display text-3xl font-black uppercase text-white sm:text-5xl">{collection.title}</h2>
                          <p className="mt-2 max-w-2xl text-xs leading-6 text-white/58 sm:text-sm">{collection.description}</p>
                        </div>
                        <a
                          href={`https://www.amazon.in/s?k=${encodeURIComponent(collection.search || collection.label)}`}
                          target="_blank"
                          rel="sponsored nofollow noopener noreferrer"
                          onClick={() => trackAmazonClick({ category: collection.id, placement: "shop_category", linkType: "category" })}
                          className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border px-5 text-xs font-black uppercase tracking-[0.14em] transition ${cyan ? "border-cyan/35 text-cyan hover:border-cyan hover:bg-cyan/10" : "border-gold/35 text-gold hover:border-gold hover:bg-gold/10"}`}
                        >
                          Browse all on Amazon <Icon.ExternalLink size={15} />
                        </a>
                      </div>
                      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
                        {collection.products.map((product, index) => (
                          <article key={product.asin} className={`interactive-card shop-neon-card flex min-w-0 flex-col overflow-hidden rounded-[8px] border border-white/12 bg-white/[0.045] ${cyan ? "" : "shop-neon-gold"}`}>
                            <a href={amazonProductUrl(product.asin)} target="_blank" rel="sponsored nofollow noopener noreferrer" onClick={() => trackAmazonClick({ asin: product.asin, category: collection.id, placement: "shop_product_image" })} className="group block">
                              <div className="relative grid aspect-square place-items-center overflow-hidden bg-white p-2 sm:p-5">
                                <ShopProductImage product={product} eager={index < 3} />
                                <span className={`absolute left-2 top-2 max-w-[calc(100%-1rem)] truncate rounded-full px-2 py-1 text-[0.46rem] font-black uppercase tracking-[0.1em] ${cyan ? "bg-cyan/90 text-night" : "bg-gold text-night"}`}>{collection.label}</span>
                              </div>
                            </a>
                            <div className="flex flex-1 flex-col p-3 sm:p-5">
                              <p className="text-[0.5rem] font-black uppercase tracking-[0.12em] text-white/38 sm:text-[0.62rem] sm:tracking-[0.18em]">Amazon India listing</p>
                              <h3 className="mt-2 line-clamp-2 text-sm font-black leading-5 text-white sm:mt-3 sm:text-lg sm:leading-6">{product.title}</h3>
                              <p className="mt-2 line-clamp-2 flex-1 text-[0.68rem] leading-5 text-white/58 sm:mt-3 sm:text-sm sm:leading-6">{product.fit}</p>
                              <div className="mt-3 flex flex-col items-start gap-2 sm:mt-5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                                <p className={`text-sm font-black uppercase tracking-[0.08em] sm:text-base ${cyan ? "text-cyan" : "text-gold"}`}>
                                  Check live price
                                  <span className="ml-1 align-middle text-[0.46rem] font-bold tracking-[0.1em] text-white/35 sm:ml-2 sm:text-[0.58rem]">on Amazon</span>
                                </p>
                                <a href={amazonProductUrl(product.asin)} target="_blank" rel="sponsored nofollow noopener noreferrer" onClick={() => trackAmazonClick({ asin: product.asin, category: collection.id, placement: "shop_product_button" })} title={`View ${product.title} on Amazon`} className={`inline-flex min-h-9 w-full items-center justify-center gap-1 rounded-full border px-2 text-[0.58rem] font-black uppercase tracking-[0.08em] transition sm:min-h-11 sm:w-auto sm:gap-2 sm:px-4 sm:text-xs sm:tracking-[0.12em] ${cyan ? "border-cyan/30 text-cyan hover:border-cyan hover:bg-cyan/10" : "border-gold/30 text-gold hover:border-gold hover:bg-gold/10"}`}>
                                  View <span className="hidden sm:inline">on Amazon</span> <Icon.ExternalLink size={12} />
                                </a>
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>

            </section>
          </main>
        );
      }

      function ShopProductImage({ product, eager = false }) {
        const fallback = assetUrl("/assets/cricket-gear-fallback.svg");
        const [failed, setFailed] = useState(false);

        useEffect(() => {
          setFailed(false);
        }, [product.image]);

        return (
          <div className="relative h-full w-full">
            <img src={fallback} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
            {!failed && (
              <img
                src={product.image}
                alt={product.title}
                loading={eager ? "eager" : "lazy"}
                decoding="async"
                referrerPolicy="no-referrer"
                onError={() => setFailed(true)}
                className="relative h-full w-full object-contain transition duration-500 group-hover:scale-105"
              />
            )}
          </div>
        );
      }

      function PlaceholderPage({ title, kicker, description, icon: PageIcon }) {
        return (
          <main className="route-bg page-grain px-5 pb-16 pt-36 sm:px-8">
            <section className="mx-auto max-w-7xl">
              <motion.div
                className="grid min-h-[68vh] items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]"
                initial={{ opacity: 0, y: 26 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.75, ease }}
              >
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.32em] text-gold">{kicker}</p>
                  <h1 className="mt-5 font-display text-6xl font-black uppercase leading-none text-white sm:text-8xl">{title}</h1>
                  <div className="gold-divider my-7" />
                  <p className="max-w-2xl text-lg leading-8 text-white/68">{description}</p>
                  <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                    <Link
                      to="/"
                      className="shine-button inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-gold px-6 text-sm font-black uppercase tracking-[0.16em] text-night"
                    >
                      Back Home <Icon.ArrowRight size={16} />
                    </Link>
                    <a
                      href={CricLinks.matches}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/7 px-6 text-sm font-black uppercase tracking-[0.16em] text-white transition hover:border-gold/55 hover:text-gold"
                    >
                      CricHeroes <Icon.ExternalLink size={16} />
                    </a>
                  </div>
                </div>
                <div className="glass rounded-[8px] p-8">
                  <div className="grid h-24 w-24 place-items-center rounded-[8px] border border-gold/30 bg-gold/10 text-gold">
                    <PageIcon size={46} />
                  </div>
                  <div className="mt-10 grid gap-4">
                    {["Premium dark UI", "Route ready", "CricKuru visual system"].map((item) => (
                      <div key={item} className="flex items-center justify-between rounded-[8px] border border-white/10 bg-white/[0.045] p-4">
                        <span className="font-bold text-white/78">{item}</span>
                        <span className="h-2 w-2 rounded-full bg-gold shadow-[0_0_18px_rgba(244,185,66,0.8)]" />
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </section>
          </main>
        );
      }

      function Footer() {
        return (
          <footer className="border-t border-white/10 bg-[#030407] px-5 py-10 sm:px-8">
            <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <Logo />
              <div className="flex flex-wrap gap-3">
                <a
                  href={CricLinks.matches}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/12 px-4 text-sm font-bold text-white/70 transition hover:border-gold/50 hover:text-gold"
                >
                  Matches <Icon.ExternalLink size={15} />
                </a>
                <a
                  href={CricLinks.members}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/12 px-4 text-sm font-bold text-white/70 transition hover:border-gold/50 hover:text-gold"
                >
                  Members <Icon.ExternalLink size={15} />
                </a>
                <a
                  href="https://www.gtgaming.shop/"
                  target="_blank"
                  rel="sponsored noopener noreferrer"
                  onClick={() => trackSponsorClick("site_footer_sponsor")}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-gold/30 bg-gold/8 px-4 text-sm font-bold text-gold transition hover:border-gold hover:bg-gold/15"
                >
                  GT Gaming sponsor <Icon.ExternalLink size={15} />
                </a>
                <Link
                  to="/gt-gaming"
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/12 px-4 text-sm font-bold text-white/70 transition hover:border-gold/50 hover:text-gold"
                >
                  Chair guide <Icon.ArrowRight size={15} />
                </Link>
                <Link
                  to="/shop"
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-cyan/25 px-4 text-sm font-bold text-cyan transition hover:border-cyan hover:bg-cyan/10"
                >
                  Cricket gear <Icon.ArrowRight size={15} />
                </Link>
              </div>
              <p className="text-sm text-white/45">&copy; 2026 CricKuru. Built for crickuru.com.</p>
            </div>
          </footer>
        );
      }

      class AppErrorBoundary extends React.Component {
        state = { error: null };

        static getDerivedStateFromError(error) {
          return { error };
        }

        componentDidCatch(error) {
          console.error("CricKuru UI error", error);
        }

        render() {
          if (!this.state.error) return this.props.children;
          return (
            <main className="route-bg grid min-h-screen place-items-center px-5 py-20 text-center text-white sm:px-8">
              <section className="glass w-full max-w-xl rounded-[10px] p-6 sm:p-10">
                <p className="text-xs font-black uppercase tracking-[0.28em] text-crimson">CricKuru recovery mode</p>
                <h1 className="mt-4 font-display text-5xl font-black uppercase leading-none">This panel hit a snag</h1>
                <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-white/65">Your site is still available. Reload this view or return home to continue browsing the Warriors hub.</p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <button type="button" onClick={() => window.location.reload()} className="min-h-12 rounded-full bg-gold px-6 text-sm font-black uppercase tracking-[0.14em] text-night">Reload page</button>
                  <a href="/" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/15 px-6 text-sm font-black uppercase tracking-[0.14em] text-white/75">Go home</a>
                </div>
              </section>
            </main>
          );
        }
      }

      function OnlinePlayersBar() {
        const players = useOnlinePlayers();
        return (
          <section className="border-t border-white/10 bg-night/85 px-5 py-5 sm:px-8" aria-label="Players online">
            <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="relative grid h-10 w-10 place-items-center rounded-full border border-cyan/35 bg-cyan/10 text-cyan">
                  <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-cyan shadow-[0_0_14px_rgba(34,211,238,0.8)]" />
                  <Icon.Users size={18} />
                </span>
                <div>
                  <p className="text-[0.62rem] font-black uppercase tracking-[0.22em] text-cyan">Players online</p>
                  <p className="mt-1 text-sm font-bold text-white/72">{players.length} live now</p>
                </div>
              </div>
              <div className="flex min-w-0 flex-wrap items-center gap-2" aria-live="polite">
                {players.slice(0, 10).map((player) => (
                  <div key={player.id} title={player.name} className="flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.045] px-2 py-1.5">
                    <LiveAvatar src={player.avatar} name={player.name} />
                    <span className="max-w-[8rem] truncate text-xs font-bold text-white/72">{player.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      }

      function PlayerChat() {
        const guestId = useRef(`guest-${Date.now()}-${Math.random().toString(36).slice(2)}`).current;
        const [open, setOpen] = useState(false);
        const [draft, setDraft] = useState("");
        const [messages, setMessages] = useState(readPlayerChatMessages);
        const messagesRef = useRef(null);

        useEffect(() => {
          const syncMessages = () => setMessages(readPlayerChatMessages());
          window.addEventListener("storage", syncMessages);
          return () => window.removeEventListener("storage", syncMessages);
        }, []);

        useEffect(() => {
          if (open && messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
        }, [open, messages]);

        function sendMessage(event) {
          event.preventDefault();
          const text = draft.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, 280);
          if (!text) return;
          const profile = readQuizProfileForPresence();
          const message = {
            id: `message-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            senderId: String(profile?.id || guestId),
            senderName: String(profile?.name || "Guest Warrior"),
            avatar: String(profile?.avatar || ""),
            text,
            createdAt: new Date().toISOString(),
          };
          const nextMessages = [...readPlayerChatMessages(), message].slice(-playerChatLimit);
          try {
            window.localStorage.setItem(playerChatStorageKey, JSON.stringify(nextMessages));
          } catch {
            // Keep the message in the current window if storage is unavailable.
          }
          setMessages(nextMessages);
          setDraft("");
        }

        return (
          <aside className={`fixed bottom-24 right-4 z-[65] w-[min(23rem,calc(100vw-2rem))] sm:right-6 ${open ? "" : "w-auto"}`} aria-label="Warrior player chat">
            {open ? (
              <div className="overflow-hidden rounded-[10px] border border-cyan/30 bg-night/95 shadow-[0_18px_70px_rgba(0,0,0,0.42)] backdrop-blur-xl">
                <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="grid h-9 w-9 place-items-center rounded-full border border-cyan/35 bg-cyan/10 text-cyan"><Icon.MessageCircle size={17} /></span>
                    <div>
                      <p className="text-[0.62rem] font-black uppercase tracking-[0.2em] text-cyan">Warrior chat</p>
                      <p className="text-xs font-bold text-white/48">Players talking live</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setOpen(false)} title="Close chat" aria-label="Close chat" className="grid h-9 w-9 place-items-center rounded-full border border-white/12 text-white/60 transition hover:border-cyan/50 hover:text-cyan"><Icon.X size={16} /></button>
                </div>
                <div ref={messagesRef} className="max-h-[min(24rem,52vh)] min-h-40 space-y-3 overflow-y-auto p-3" aria-live="polite">
                  {messages.length ? messages.map((message) => (
                    <article key={message.id} className="flex items-start gap-2">
                      <LiveAvatar src={message.avatar} name={message.senderName} />
                      <div className="min-w-0 rounded-[8px] border border-white/10 bg-white/[0.05] px-3 py-2">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <p className="max-w-[11rem] truncate text-xs font-black text-white/82">{message.senderName}</p>
                          <time className="text-[0.55rem] font-bold uppercase tracking-[0.08em] text-white/35" dateTime={message.createdAt}>{compactFeedDate(message.createdAt)}</time>
                        </div>
                        <p className="mt-1 break-words text-sm leading-5 text-white/72">{message.text}</p>
                      </div>
                    </article>
                  )) : (
                    <div className="grid min-h-32 place-items-center rounded-[8px] border border-dashed border-white/12 px-5 text-center">
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/45">Start the conversation</p>
                    </div>
                  )}
                </div>
                <form onSubmit={sendMessage} className="flex items-center gap-2 border-t border-white/10 p-3">
                  <input value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={280} aria-label="Chat message" placeholder="Say something to the players" className="min-h-11 min-w-0 flex-1 rounded-full border border-white/12 bg-white/[0.06] px-4 text-sm text-white outline-none placeholder:text-white/35 focus:border-cyan/60" />
                  <button type="submit" title="Send message" aria-label="Send message" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-cyan text-night transition hover:bg-white"><Icon.Send size={17} /></button>
                </form>
              </div>
            ) : (
              <button type="button" onClick={() => setOpen(true)} title="Open player chat" aria-label="Open player chat" className="relative grid h-14 w-14 place-items-center rounded-full border border-cyan/45 bg-night/95 text-cyan shadow-[0_8px_36px_rgba(0,0,0,0.35),0_0_24px_rgba(34,211,238,0.2)] transition hover:scale-105 hover:border-cyan hover:text-white"><Icon.MessageCircle size={23} /><span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-cyan shadow-[0_0_14px_rgba(34,211,238,0.85)]" /></button>
            )}
          </aside>
        );
      }

      function SponsorBanner() {
        return (
          <section className="relative z-[80] mt-[8.5rem] border-b border-gold/15 bg-[#11100d] px-4 py-3 text-white shadow-[0_10px_32px_rgba(0,0,0,0.22)] sm:px-6" aria-label="CricKuru sponsor">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
              <a href="https://www.gtgaming.shop/" target="_blank" rel="sponsored noopener noreferrer" onClick={() => trackSponsorClick("site_sponsor_banner")} className="flex min-w-0 items-center gap-3 transition hover:opacity-85">
                <span className="grid h-9 w-14 shrink-0 place-items-center overflow-hidden rounded-[6px] border border-gold/25 bg-white/5">
                  <img src={GT_GAMING_CHAIR_IMAGE} alt="GT Throne gaming chair" loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-contain" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[0.58rem] font-black uppercase tracking-[0.2em] text-gold">Official sponsor</span>
                  <span className="block truncate text-xs font-bold text-white/75 sm:text-sm">GT Gaming • The GT Throne</span>
                </span>
              </a>
              <a href="https://www.gtgaming.shop/" target="_blank" rel="sponsored noopener noreferrer" onClick={() => trackSponsorClick("site_sponsor_banner_button")} className="shrink-0 rounded-full border border-gold/30 px-3 py-1.5 text-[0.58rem] font-black uppercase tracking-[0.14em] text-gold transition hover:border-gold hover:bg-gold/10" title="Visit GT Gaming">View sponsor</a>
            </div>
          </section>
        );
      }

      function CricKuruBot() {
        const [open, setOpen] = useState(false);
        const [draft, setDraft] = useState("");
        const [busy, setBusy] = useState(false);
        const [messages, setMessages] = useState([
          { id: "welcome", from: "bot", text: "Ask me about a Warriors player, career totals, recent cross-team form, or the latest team matches." },
        ]);
        const messagesRef = useRef(null);

        useEffect(() => {
          if (open && messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
        }, [open, messages, busy]);

        async function sendMessage(event) {
          event.preventDefault();
          const text = draft.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, 500);
          if (!text || busy) return;
          setMessages((current) => [...current, { id: `user-${Date.now()}`, from: "user", text }]);
          setDraft("");
          setBusy(true);
          try {
            if (!BOT_API_URL) throw new Error("The assistant API is not connected yet. Set VITE_BOT_API_URL and rebuild the site.");
            const response = await fetch(`${BOT_API_URL}/api/chat`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ message: text }),
            });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.error || "The assistant is temporarily unavailable.");
            setMessages((current) => [...current, { id: `bot-${Date.now()}`, from: "bot", text: payload.answer || "No answer available." }]);
          } catch (error) {
            setMessages((current) => [...current, { id: `error-${Date.now()}`, from: "bot", text: error.message }]);
          } finally {
            setBusy(false);
          }
        }

        return (
          <aside className={`fixed bottom-24 right-20 z-[64] w-[min(23rem,calc(100vw-5.5rem))] sm:right-24 ${open ? "sm:w-[min(23rem,calc(100vw-7rem))]" : "w-auto"}`} aria-label="CricKuru assistant">
            {open ? (
              <div className="overflow-hidden rounded-[10px] border border-gold/30 bg-night/95 shadow-[0_18px_70px_rgba(0,0,0,0.42)] backdrop-blur-xl">
                <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="grid h-9 w-9 place-items-center rounded-full border border-gold/35 bg-gold/10 text-gold"><Icon.Bot size={17} /></span>
                    <div>
                      <p className="text-[0.62rem] font-black uppercase tracking-[0.2em] text-gold">CricKuru assistant</p>
                      <p className="text-xs font-bold text-white/48">CricHeroes snapshot guide</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setOpen(false)} title="Close assistant" aria-label="Close assistant" className="grid h-9 w-9 place-items-center rounded-full border border-white/12 text-white/60 transition hover:border-gold/50 hover:text-gold"><Icon.X size={16} /></button>
                </div>
                <div ref={messagesRef} className="max-h-[min(24rem,52vh)] min-h-40 space-y-3 overflow-y-auto p-3" aria-live="polite">
                  {messages.map((message) => (
                    <div key={message.id} className={`flex ${message.from === "user" ? "justify-end" : "justify-start"}`}>
                      <p className={`max-w-[90%] break-words rounded-[8px] border px-3 py-2 text-sm leading-5 ${message.from === "user" ? "border-cyan/25 bg-cyan/10 text-white/82" : "border-white/10 bg-white/[0.05] text-white/70"}`}>{message.text}</p>
                    </div>
                  ))}
                  {busy && <p className="text-xs font-bold uppercase tracking-[0.12em] text-gold/70">Checking synced data...</p>}
                </div>
                <form onSubmit={sendMessage} className="flex items-center gap-2 border-t border-white/10 p-3">
                  <input value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={500} aria-label="Ask CricKuru assistant" placeholder="Ask about a player or match" className="min-h-11 min-w-0 flex-1 rounded-full border border-white/12 bg-white/[0.06] px-4 text-sm text-white outline-none placeholder:text-white/35 focus:border-gold/60" />
                  <button type="submit" disabled={busy} title="Ask assistant" aria-label="Ask assistant" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gold text-night transition hover:bg-white disabled:cursor-wait disabled:opacity-50"><Icon.Send size={17} /></button>
                </form>
              </div>
            ) : (
              <button type="button" onClick={() => setOpen(true)} title="Open CricKuru assistant" aria-label="Open CricKuru assistant" className="relative grid h-14 w-14 place-items-center rounded-full border border-gold/45 bg-night/95 text-gold shadow-[0_8px_36px_rgba(0,0,0,0.35),0_0_24px_rgba(244,185,66,0.2)] transition hover:scale-105 hover:border-gold hover:text-white"><Icon.Bot size={23} /><span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-gold shadow-[0_0_14px_rgba(244,185,66,0.85)]" /></button>
            )}
          </aside>
        );
      }

      function App() {
        const routerBasename = window.location.hostname.endsWith("github.io") ? "/crickuru" : "/";

        return (
          <ThemeProvider>
            <BrowserRouter basename={routerBasename}>
              <IndiaMatchesProvider>
                <ScrollToTop />
                <MetaManager />
                <IndiaLiveStrip />
                <Navbar />
                <SponsorBanner />
                <PlayerChat />
                <CricKuruBot />
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route
                    path="/warriors"
                    element={<WarriorsDataPage />}
                  />
                  <Route
                    path="/captain"
                    element={<CaptainProfilePage />}
                  />
                  <Route
                    path="/india-matches"
                    element={<IndiaMatchesPage />}
                  />
                  <Route
                    path="/players"
                    element={<PlayersPage />}
                  />
                  <Route
                    path="/quiz"
                    element={<QuizPage />}
                  />
                  <Route
                    path="/coin"
                    element={<CoinPage />}
                  />
                  <Route
                    path="/kurukshetra-coin"
                    element={<CoinPage />}
                  />
                  <Route
                    path="/gt-gaming"
                    element={<GTGamingPage />}
                  />
                  <Route
                    path="/shop"
                    element={<CricketGearShopPage />}
                  />
                  <Route
                    path="*"
                    element={
                      <PlaceholderPage
                        title="Page Not Found"
                        kicker="CricKuru"
                        description="This page is not available yet. Use the navigation to return to the CricKuru experience."
                        icon={Icon.Sparkles}
                      />
                    }
                  />
                </Routes>
                <OnlinePlayersBar />
              </IndiaMatchesProvider>
            </BrowserRouter>
          </ThemeProvider>
        );
      }
createRoot(document.getElementById("root")).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>,
);
