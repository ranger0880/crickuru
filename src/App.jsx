import React, { useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { applyRouteMetadata } from "./metadata.js";
import QuizPage from "./QuizPage.jsx";
import "./styles.css";

const RouterContext = React.createContext(null);
      const localRouteFiles = {
        "/": "index.html",
        "/warriors": "warriors/index.html",
        "/arena": "arena/index.html",
        "/players": "players/index.html",
        "/quiz": "quiz/index.html",
        "/memes": "memes/index.html",
        "/meme": "meme/index.html",
        "/coin": "coin/index.html",
        "/kurukshetra-coin": "kurukshetra-coin/index.html",
        "/india-matches": "india-matches/index.html",
      };

      function isLocalFilePreview() {
        return window.location.protocol === "file:";
      }

      function localPreviewPrefix() {
        const path = decodeURIComponent(window.location.pathname).replace(/\\/g, "/");
        return /\/(arena|coin|kurukshetra-coin|india-matches|meme|memes|players|quiz|warriors)\/index\.html$/i.test(path) ? "../" : "";
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
        const routeMatch = path.match(/\/(arena|coin|kurukshetra-coin|india-matches|meme|memes|players|quiz|warriors)\/index\.html$/);
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
        syncedAt: "",
        team: {
          name: "Kurukshetra Warriors",
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
        summary: { live: 0, recent: 0, upcoming: 0, total: 0 },
        all: [],
        live: [],
        recent: [],
        upcoming: [],
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
          const interval = window.setInterval(loadFeed, 60 * 1000);
          return () => {
            cancelled = true;
            window.clearInterval(interval);
          };
        }, []);

        return state;
      }

      function useIndiaMatchesFeed() {
        const [state, setState] = useState({ loading: true, error: "", data: indiaMatchesFallback });

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
          const interval = window.setInterval(loadFeed, 60 * 1000);
          return () => {
            cancelled = true;
            window.clearInterval(interval);
          };
        }, []);

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
        CalendarDays: (props) => <SvgIcon {...props}><path d="M8 2v4" /><path d="M16 2v4" /><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 10h18" /><path d="M8 14h.01" /><path d="M12 14h.01" /><path d="M16 14h.01" /><path d="M8 18h.01" /><path d="M12 18h.01" /></SvgIcon>,
        ChevronDown: (props) => <SvgIcon {...props}><path d="m6 9 6 6 6-6" /></SvgIcon>,
        CircleUserRound: (props) => <SvgIcon {...props}><path d="M18 20a6 6 0 0 0-12 0" /><circle cx="12" cy="10" r="4" /><circle cx="12" cy="12" r="10" /></SvgIcon>,
        ExternalLink: (props) => <SvgIcon {...props}><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></SvgIcon>,
        LogIn: (props) => <SvgIcon {...props}><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /></SvgIcon>,
        History: (props) => <SvgIcon {...props}><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 3v6h6" /><path d="M12 7v5l3 2" /></SvgIcon>,
        Menu: (props) => <SvgIcon {...props}><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" /></SvgIcon>,
        Moon: (props) => <SvgIcon {...props}><path d="M12 3a6 6 0 0 0 8.8 6.9A9 9 0 1 1 12 3Z" /></SvgIcon>,
        Mouse: (props) => <SvgIcon {...props}><rect x="5" y="2" width="14" height="20" rx="7" /><path d="M12 6v4" /></SvgIcon>,
        Play: (props) => <SvgIcon {...props}><polygon points="6 3 20 12 6 21 6 3" /></SvgIcon>,
        Radio: (props) => <SvgIcon {...props}><path d="M4.9 19.1a10 10 0 0 1 0-14.2" /><path d="M7.8 16.2a6 6 0 0 1 0-8.5" /><circle cx="12" cy="12" r="2" /><path d="M16.2 7.8a6 6 0 0 1 0 8.5" /><path d="M19.1 4.9a10 10 0 0 1 0 14.2" /></SvgIcon>,
        Shield: (props) => <SvgIcon {...props}><path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3v8Z" /></SvgIcon>,
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
        { label: "Arena", path: "/arena" },
        { label: "Memes", path: "/memes" },
        { label: "Kuru Coin", path: "/coin" },
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
              className={`fixed left-0 right-0 top-9 z-50 transition-all duration-500 ${
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
                        `rounded-full px-4 py-2 text-sm font-semibold uppercase tracking-[0.16em] transition ${
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
        const statusLabel = liveMatches.length ? `${liveMatches.length} live` : upcomingMatches.length ? `${upcomingMatches.length} upcoming` : "India feed";

        return (
          <aside className="fixed left-0 right-0 top-0 z-[70] h-9 border-b border-gold/20 bg-night/95 text-white shadow-xl shadow-black/30 backdrop-blur-xl" aria-label="India live cricket score panel">
            <div className="mx-auto flex h-full max-w-7xl items-center gap-3 px-3 sm:px-8">
              <Link
                to="/india-matches"
                className="inline-flex h-6 shrink-0 items-center gap-2 rounded-full border border-gold/35 bg-gold/12 px-3 text-[0.64rem] font-black uppercase tracking-[0.16em] text-gold"
              >
                <span className={`h-2 w-2 rounded-full ${liveMatches.length ? "bg-crimson shadow-[0_0_12px_rgba(183,25,50,0.9)]" : "bg-gold"}`} />
                India {loading ? "sync" : statusLabel}
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
            <span className="rounded-full border border-white/12 bg-white/7 px-2 py-0.5 text-[0.58rem] font-black uppercase tracking-[0.14em] text-cyan">
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
            <LiveMatchIntelSection />
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
        const location = useLocation();

        const scrollToLiveIntel = () => {
          const scroll = () =>
            document.getElementById("live-intel")?.scrollIntoView({ behavior: "smooth", block: "start" });
          if (location.pathname !== "/") {
            navigate("/");
            window.setTimeout(scroll, 120);
          } else {
            scroll();
          }
        };

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
                Follow Kurukshetra Warriors match info, open the official CricHeroes team pages and play the CricKuru Arena.
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
                  onClick={() => navigate("/arena")}
                  className="shine-button inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-gold px-7 text-sm font-black uppercase tracking-[0.18em] text-night shadow-[0_0_46px_rgba(244,185,66,0.32)] transition hover:scale-[1.03]"
                  aria-label="Enter the CricKuru Arena"
                >
                  Enter the Arena <Icon.ArrowRight size={19} />
                </button>
                <button
                  type="button"
                  onClick={scrollToLiveIntel}
                  className="inline-flex min-h-14 items-center justify-center gap-3 rounded-full border border-gold/35 bg-white/8 px-7 text-sm font-black uppercase tracking-[0.18em] text-white backdrop-blur-xl transition hover:border-gold hover:bg-gold/10 hover:text-gold"
                  aria-label="View live Kurukshetra Warriors match updates"
                >
                  Live Updates <Icon.ChevronDown size={19} />
                </button>
              </div>
            </Reveal>
            <Reveal>
              <p className="mt-5 text-sm font-semibold uppercase tracking-[0.2em] text-white/54">
                Home of the founding team - Kurukshetra Warriors
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
        const topPlayer = data.players?.find((player) => player.performance?.awards > 0) || data.players?.[0];
        const topRival = data.opponents?.[0];

        return (
          <motion.aside
            className="glass relative mx-auto mt-6 w-full max-w-sm rounded-[8px] p-5 lg:ml-auto lg:mt-48"
            initial={{ opacity: 0, y: 36, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: [0, -10, 0], filter: "blur(0px)" }}
            transition={{ opacity: { duration: 0.8, delay: 1.2 }, y: { duration: 7, repeat: Infinity, ease: "easeInOut" } }}
            aria-label="Live CricHeroes match and player preview"
          >
            <div className="mb-5 flex items-center justify-between">
              <p className="text-[0.68rem] font-black uppercase tracking-[0.24em] text-gold">
                Top Live Dashboard
              </p>
              <span className="flex items-center gap-2 rounded-full border border-gold/45 bg-gold/12 px-3 py-1 text-[0.62rem] font-black uppercase tracking-[0.16em] text-gold">
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

      function HeroLiveTile({ label, title, detail }) {
        return (
          <div className="rounded-[8px] border border-white/10 bg-night/55 p-3">
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
        const [tab, setTab] = useState("matches");
        const tabs = [
          { id: "matches", label: "Matches", icon: Icon.CalendarDays },
          { id: "members", label: "Members", icon: Icon.Users },
        ];

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
                  {tab === "matches" && <MatchesPanel key="matches" />}
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

      function MatchesPanel() {
        const matches = [
          {
            tag: "Featured",
            title: "Kurukshetra Warriors vs Divino Strikers",
            score: "233/7 - 221/9",
            result: "Warriors won by 12 runs",
            tone: "Gold finish",
          },
          {
            tag: "CricHeroes",
            title: "Official Match Feed",
            score: "All scorecards",
            result: "View complete match history on CricHeroes",
            tone: "Verified source",
          },
          {
            tag: "Arena",
            title: "Community Rivalries",
            score: "Tabs ready",
            result: "Use this panel for upcoming, recent and tournament match groups",
            tone: "Funky tabs",
          },
        ];

        return (
          <PanelShell>
            <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="grid gap-5 md:grid-cols-3 lg:grid-cols-1">
                {matches.map((match) => (
                  <article key={match.title} className="score-tile rounded-[8px] border border-white/12 p-5">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <span className="rounded-full bg-gold/12 px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.18em] text-gold">
                        {match.tag}
                      </span>
                      <span className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-white/42">{match.tone}</span>
                    </div>
                    <h3 className="font-display text-3xl font-black uppercase leading-none text-white">{match.title}</h3>
                    <p className="mt-4 font-display text-4xl font-black text-gold">{match.score}</p>
                    <p className="mt-2 text-sm font-semibold text-white/68">{match.result}</p>
                  </article>
                ))}
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
        const matches = asArray(data.matches);
        const recentMatches = asArray(data.recentMatches).length ? asArray(data.recentMatches) : matches;
        const players = asArray(data.players);
        const opponents = asArray(data.opponents);
        const awards = asArray(data.awardLedger);
        const records = asArray(data.recordLedger);
        const rosterChanges = asArray(data.rosterChangeLog);
        const sourcePages = asArray(inventory.sourcePages);
        const syncText = loading ? "Syncing CricHeroes" : `Updated ${formatFeedDate(data.syncedAt)}`;

        return (
          <main className="route-bg page-grain min-h-screen px-5 pb-16 pt-36 sm:px-8">
            <section className="mx-auto max-w-7xl">
              <div className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-end">
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
                    <a
                      href={assetUrl("/data/crickuru-live.json")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.045] px-4 py-2 text-white/64 transition hover:border-gold/40 hover:text-gold"
                    >
                      Raw JSON <Icon.ExternalLink size={14} />
                    </a>
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
                    <LiveStat label="Matches" value={inventory.matches || matches.length || "-"} />
                    <LiveStat label="Players" value={inventory.players || players.length || "-"} />
                    <LiveStat label="Opponents" value={inventory.opponents || opponents.length || "-"} />
                    <LiveStat label="Awards" value={inventory.awards || awards.length || "-"} />
                  </div>
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
        const uniqueSourcePages = [
          ...new Set([team.cricHeroesUrl || CricLinks.profile, ...sourcePages, assetUrl("/data/crickuru-live.json")].filter(Boolean)),
        ];

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
                <p className="mt-2 text-sm leading-6 text-white/50">Open the live team pages directly, or inspect the saved snapshot used by CricKuru.</p>
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
          <article className="rounded-[8px] border border-white/12 bg-white/[0.045] p-5">
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

        const displayPlayers = players
          .map((player) => ({ ...player, impact: playerImpactScore(player), role: playerRoleLabel(player) }))
          .sort((a, b) => Number(b.isCaptain) - Number(a.isCaptain) || b.impact - a.impact || a.name.localeCompare(b.name));

        return (
          <div className="grid gap-5">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <LiveStat label="Total" value={memberSummary?.total || players.length} />
              <LiveStat label="Verified" value={memberSummary?.verified || 0} />
              <LiveStat label="Pro" value={memberSummary?.pro || 0} />
              <LiveStat label="Admins" value={memberSummary?.admins || 0} />
            </div>
            {rosterChanges.length > 0 && <RosterChangePanel changes={rosterChanges} />}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {displayPlayers.map((player, index) => <WarriorsRosterDataCard key={player.id || player.name} player={player} rank={index + 1} onSelect={() => onSelectPlayer?.(player)} />)}
            </div>
          </div>
        );
      }

      function WarriorsRosterDataCard({ player, rank, onSelect }) {
        const stats = player.warriorsStats || player.stats || {};
        return (
          <article
            className="cursor-pointer rounded-[8px] border border-white/12 bg-white/[0.045] p-4 transition hover:-translate-y-1 hover:border-gold/45 hover:bg-gold/[0.05] focus:outline-none focus:ring-2 focus:ring-gold/60"
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
                </div>
              </div>
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-white/10 bg-night/60 font-display text-xl font-black text-white">{player.impact}</span>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2 text-center">
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
              <p className="text-xs font-black uppercase tracking-[0.14em] text-white/38">Checked daily from CricHeroes</p>
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
          <article className="rounded-[8px] border border-white/12 bg-white/[0.045] p-4">
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
      ];

      function PlayersPage() {
        const { loading, error, data } = useLiveCricketFeed();
        const [filter, setFilter] = useState("all");
        const [selectedPlayer, setSelectedPlayer] = useState(null);
        const rosterChanges = asArray(data.rosterChangeLog);
        const players = useMemo(() => {
          return asArray(data.players)
            .map((player) => ({ ...player, impact: playerImpactScore(player), role: playerRoleLabel(player) }))
            .sort((a, b) => b.impact - a.impact || (b.performance?.awards || 0) - (a.performance?.awards || 0) || a.name.localeCompare(b.name));
        }, [data.players]);
        const filteredPlayers = players.filter((player) => playerMatchesFilter(player, filter));
        const leaders = {
          impact: players[0],
          batting: [...players].sort((a, b) => (b.stats?.runs || 0) - (a.stats?.runs || 0) || b.impact - a.impact)[0],
          bowling: [...players].sort((a, b) => (b.stats?.wickets || 0) - (a.stats?.wickets || 0) || b.impact - a.impact)[0],
          fielding: [...players].sort((a, b) => ((b.stats?.catches || 0) + (b.stats?.stumpings || 0)) - ((a.stats?.catches || 0) + (a.stats?.stumpings || 0)) || b.impact - a.impact)[0],
        };
        const totalAwards = players.reduce((sum, player) => sum + (player.performance?.awards || 0), 0);
        const verifiedCount = players.filter((player) => player.isVerified).length;

        return (
          <main className="route-bg page-grain min-h-screen px-5 pb-16 pt-36 sm:px-8">
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
                      Stats updated {formatFeedDate(data.playerStatsUpdatedAt || data.syncedAt)}
                    </span>
                    <span className="rounded-full border border-cyan/20 bg-cyan/6 px-4 py-2 text-cyan/75">
                      Roster checked {formatFeedDate(data.syncedAt)}
                    </span>
                    {error && <span className="rounded-full border border-crimson/35 bg-crimson/10 px-4 py-2 text-crimson">Using saved roster</span>}
                  </div>
                </motion.div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <LiveStat label="Players" value={players.length || "-"} />
                  <LiveStat label="Awards" value={totalAwards || "-"} />
                  <LiveStat label="Verified" value={verifiedCount || "-"} />
                </div>
              </div>

              <div className="mt-10 grid gap-5 lg:grid-cols-4">
                <PlayerLeaderCard label="Impact Leader" player={leaders.impact} metric={`${leaders.impact?.impact || 0}/100`} />
                <PlayerLeaderCard label="Batting Edge" player={leaders.batting} metric={`${leaders.batting?.stats?.runs || 0} RUNS`} />
                <PlayerLeaderCard label="Strike Bowler" player={leaders.bowling} metric={`${leaders.bowling?.stats?.wickets || 0} WKTS`} />
                <PlayerLeaderCard label="Field Watch" player={leaders.fielding} metric={`${(leaders.fielding?.stats?.catches || 0) + (leaders.fielding?.stats?.stumpings || 0)} FIELD`} />
              </div>

              {rosterChanges.length > 0 && <RosterChangePanel changes={rosterChanges} />}

              <div className="mt-10 flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Player filters">
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
                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredPlayers.map((player, index) => <PlayerProfileCard key={player.id || player.name} player={player} rank={index + 1} onSelect={() => setSelectedPlayer(player)} />)}
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
                  Performance charge is a 1-100 display score built from overall CricHeroes totals, cross-team recent highlights, rare records, Warriors awards, role signals and recent form. Profile data refreshes daily.
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

      function PlayerProfileCard({ player, rank, onSelect }) {
        const awards = player.performance?.awards || 0;
        const activity = asArray(player.performance?.recentAwards).slice(0, 3);
        const recentMatches = asArray(player.recentMatches).slice(0, 3);
        const stats = player.stats || {};
        const hasOverallStats = stats.source === "CricHeroes public player stats";
        const impact = player.impact || 0;

        return (
          <article
            className="relative cursor-pointer overflow-hidden rounded-[8px] border border-white/12 bg-[radial-gradient(circle_at_85%_8%,rgba(244,185,66,0.14),transparent_28%),rgba(255,255,255,0.045)] p-5 transition hover:-translate-y-1 hover:border-gold/45 focus:outline-none focus:ring-2 focus:ring-gold/60"
            onClick={(event) => { if (!event.target.closest("a")) onSelect?.(); }}
            onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect?.(); } }}
            role="button"
            tabIndex={0}
            aria-label={`Open full profile for ${player.name}`}
          >
            <div className="absolute right-[-56px] top-[-56px] h-40 w-40 rounded-full bg-cyan/8 blur-3xl" aria-hidden="true" />
            <div className="relative flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <LiveAvatar src={player.photo} name={player.name} />
                <div className="min-w-0">
                  <p className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-gold">Rank {rank}</p>
                  <h2 className="truncate font-display text-3xl font-black uppercase leading-none text-white">{player.name}</h2>
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-white/44">{player.role}</p>
                </div>
              </div>
              <div
                className="grid h-16 w-16 shrink-0 place-items-center rounded-full border border-white/12 text-center"
                style={{ background: `conic-gradient(#F4B942 ${impact * 3.6}deg, rgba(255,255,255,0.08) 0deg)` }}
                aria-label={`Impact score ${impact} out of 100`}
              >
                <span className="grid h-12 w-12 place-items-center rounded-full bg-night font-display text-2xl font-black text-white">{impact}</span>
              </div>
            </div>

            <div className="relative mt-5">
              <p className="mb-2 text-[0.62rem] font-black uppercase tracking-[0.16em] text-cyan">{hasOverallStats ? "Overall CricHeroes career" : "Overall profile refresh scheduled"}</p>
              <div className="grid grid-cols-4 gap-2 text-center">
                <LiveTinyStat label="Runs" value={hasOverallStats ? stats.runs || 0 : "-"} />
                <LiveTinyStat label="Wkts" value={hasOverallStats ? stats.wickets || 0 : "-"} />
                <LiveTinyStat label="Best" value={hasOverallStats ? stats.bestScore || 0 : "-"} />
                <LiveTinyStat label="Field" value={hasOverallStats ? (stats.catches || 0) + (stats.stumpings || 0) : "-"} />
              </div>
              <p className="mt-3 text-center text-[0.62rem] font-black uppercase tracking-[0.12em] text-white/38">{hasOverallStats ? `${stats.matches || 0} matches | Avg ${stats.average || "-"} | SR ${stats.strikeRate || "-"}` : "Profile totals will appear after the next public sync"}</p>
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
          </article>
        );
      }

      function playerImpactScore(player) {
        const performance = player.performance || {};
        const stats = player.stats?.source === "CricHeroes public player stats" ? player.stats : {};
        const raw =
          Math.min(25, (stats.runs || 0) / 4) +
          Math.min(20, (stats.wickets || 0) * 5) +
          Math.min(12, (stats.bestScore || 0) / 8) +
          Math.min(10, (stats.fifties || 0) * 3) +
          Math.min(12, (stats.hundreds || 0) * 6) +
          Math.min(12, (stats.hatTricks || 0) * 12) +
          Math.min(10, ((stats.catches || 0) + (stats.stumpings || 0)) * 2) +
          (performance.awards || 0) * 5 +
          (performance.playerOfMatch || 0) * 6 +
          (performance.bestBatter || 0) * 4 +
          (performance.bestBowler || 0) * 4 +
          (performance.fielderOfMatch || 0) * 3 +
          (player.isCaptain ? 10 : 0) +
          (player.isPro ? 6 : 0) +
          (player.isVerified ? 4 : 0) +
          asArray(player.badges).length;
        return Math.min(100, Math.max(1, Math.round(raw)));
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

      function playerMatchForm(player) {
        return asArray(player.matchHistory || player.recentMatches)
          .slice(0, 8)
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
          addFocus("Batting", "Watch", "Build a larger batting sample", "Public batting sample is limited", "The feed has too few recorded batting innings for a reliable technical conclusion.", "Log the first 20 balls of every innings: contact quality, dot balls, singles and dismissals.", "Collect 8+ innings before changing technique", "Low");
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
          addFocus("Bowling", "Watch", "Build a repeatable bowling sample", "Public bowling sample is limited", "There are not enough recorded bowling innings to separate control, threat and role effects.", "Track line, length, pace, extras and wickets after every over for the next eight innings.", "Collect 8+ bowling innings before changing the action", "Low");
        }

        const fieldingEvents = playerDetailNumber(stats.catches) + playerDetailNumber(stats.stumpings) + playerDetailNumber(stats.runOuts);
        if (fieldingMatches >= 8) {
          const fieldingRate = fieldingEvents / fieldingMatches;
          if (fieldingRate < 0.2) addFocus("Fielding", "Medium", "Create more direct fielding impact", coachingEvidence("dismissal contributions per match", fieldingRate.toFixed(2)), "The public fielding totals show limited catches, stumpings or run outs per fielding match.", "Use three stations each week: reaction catches, one-hand pickups and throw-to-target under fatigue.", "Build toward 0.20+ direct contributions per match.");
          else addStrength("Fielding", "Reliable involvement", coachingEvidence("direct contributions", fieldingEvents));
          if (playerDetailNumber(stats.caughtBehind) + playerDetailNumber(stats.stumpings) > 0) addStrength("Fielding", "Wicketkeeping impact", coachingEvidence("keeper dismissals", playerDetailNumber(stats.caughtBehind) + playerDetailNumber(stats.stumpings)));
        } else {
          addFocus("Fielding", "Watch", "Make fielding measurable", "Public fielding sample is limited", "The feed does not yet have enough fielding matches for a stable rate.", "Record chances, successful pickups, catches and throws in every match, including chances not converted.", "Build a fielding baseline across 8+ matches", "Low");
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
        const ordered = report.sort((a, b) => ({ High: 0, Medium: 1, Watch: 2 }[a.priority] - ({ High: 0, Medium: 1, Watch: 2 }[b.priority]))).slice(0, 6);
        return { coverage, focus: ordered, strengths: strengths.slice(0, 4), formSample: form.length };
      }

      function PlayerImprovementPanel({ player, stats }) {
        const report = createImprovementReport(player, stats);
        return (
          <article className="rounded-[8px] border border-cyan/25 bg-[linear-gradient(135deg,rgba(35,213,232,0.09),rgba(255,255,255,0.025))] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-cyan"><Icon.Sparkles size={15} /> AI performance coach</p>
                <h3 className="mt-2 font-display text-3xl font-black uppercase text-white">Areas to improve</h3>
                <p className="mt-2 max-w-2xl text-xs leading-5 text-white/46">{report.coverage} Recommendations are coaching prompts, not a replacement for an in-person coach.</p>
              </div>
              <span className="rounded-full border border-cyan/25 bg-cyan/10 px-3 py-2 text-[0.62rem] font-black uppercase tracking-[0.12em] text-cyan">Daily stat lens</span>
            </div>

            {report.strengths.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {report.strengths.map((strength) => <span key={`${strength.area}-${strength.title}`} className="rounded-full border border-gold/25 bg-gold/10 px-3 py-2 text-xs font-bold text-gold">{strength.title}: {strength.value}</span>)}
              </div>
            )}

            <div className="mt-5 grid gap-3">
              {report.focus.map((item, index) => (
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
              ))}
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
                  <span className="block whitespace-nowrap text-[0.58rem] font-black uppercase tracking-[0.1em] text-white">{marker.label}</span>
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

      function PlayerStatsMatrix({ stats }) {
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
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan">Public CricHeroes totals</p>
                <h3 className="mt-2 font-display text-3xl font-black uppercase text-white">Complete stat sheet</h3>
              </div>
              <span className="hidden text-xs font-semibold text-white/35 sm:block">{stats.publicFieldCount || groups.reduce((sum, group) => sum + group.items.length, 0)} public fields</span>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              {groups.map((group) => (
                <article key={group.title} className="rounded-[8px] border border-white/12 bg-white/[0.035] p-4">
                  <h4 className="text-xs font-black uppercase tracking-[0.18em] text-gold">{group.title}</h4>
                  <div className="mt-3 grid gap-2">
                    {group.items.map(([label, value]) => <div key={label} className="flex items-center justify-between gap-3 border-b border-white/7 pb-2 text-sm"><span className="text-white/48">{label}</span><span className="font-bold text-white/82">{value === 0 || value ? value : "-"}</span></div>)}
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      }

      function playerNeonTheme(impact = 0) {
        if (impact >= 85) return { label: "Elite form", color: "#ff315a", glow: "rgba(255,49,90,0.72)", soft: "rgba(255,49,90,0.16)" };
        if (impact >= 70) return { label: "Match ready", color: "#F4B942", glow: "rgba(244,185,66,0.72)", soft: "rgba(244,185,66,0.16)" };
        if (impact >= 50) return { label: "Building form", color: "#23d5e8", glow: "rgba(35,213,232,0.68)", soft: "rgba(35,213,232,0.14)" };
        return { label: "Rising form", color: "#6f8cff", glow: "rgba(111,140,255,0.62)", soft: "rgba(111,140,255,0.14)" };
      }

      function PlayerDetailModal({ player, onClose }) {
        const stats = player.stats?.source === "CricHeroes public player stats" ? player.stats : {};
        const warriorsStats = player.warriorsStats || {};
        const recentMatches = asArray(player.recentMatches).slice(0, 5);
        const matchHistory = asArray(player.matchHistory).length ? asArray(player.matchHistory) : recentMatches;
        const neon = playerNeonTheme(player.impact || 0);

        useEffect(() => {
          const onKeyDown = (event) => { if (event.key === "Escape") onClose(); };
          document.addEventListener("keydown", onKeyDown);
          const previousOverflow = document.body.style.overflow;
          document.body.style.overflow = "hidden";
          return () => {
            document.removeEventListener("keydown", onKeyDown);
            document.body.style.overflow = previousOverflow;
          };
        }, [onClose]);

        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 z-[90] overflow-y-auto overscroll-contain bg-night/85 p-2 backdrop-blur-md sm:p-4 lg:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
            <motion.section initial={{ opacity: 0, scale: 0.94, y: 22 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 280, damping: 25 }} style={{ borderColor: neon.color, boxShadow: `0 0 0 1px ${neon.color}, 0 0 24px ${neon.glow}, 0 25px 100px rgba(0,0,0,0.7)` }} className="mx-auto w-full max-h-[calc(100dvh-1rem)] min-h-0 overflow-y-auto rounded-[10px] border bg-[#090d14] sm:max-h-[calc(100dvh-2rem)] lg:max-h-[calc(100dvh-3rem)]" role="dialog" aria-modal="true" aria-label={`${player.name} full player profile`}>
              <header className="relative min-h-48 overflow-hidden bg-cover bg-center sm:min-h-56" style={{ backgroundImage: `url(${assetUrl("/assets/stadium-vip-warriors.png")})`, boxShadow: `inset 0 -3px 0 ${neon.color}, inset 0 -12px 28px ${neon.soft}` }}>
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,7,11,0.96),rgba(5,7,11,0.58),rgba(5,7,11,0.8))]" />
                <button type="button" onClick={onClose} aria-label="Close player profile" title="Close player profile" className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-night/70 text-white transition hover:border-gold hover:text-gold sm:right-4 sm:top-4"><Icon.X size={20} /></button>
                <div className="relative flex min-h-48 items-end gap-3 p-4 sm:min-h-56 sm:gap-4 sm:p-8">
                  <span className="rounded-full p-1" style={{ boxShadow: `0 0 0 2px ${neon.color}, 0 0 22px ${neon.glow}` }}><LiveAvatar src={player.photo} name={player.name} /></span>
                  <div className="min-w-0">
                    <p className="text-[0.62rem] font-black uppercase tracking-[0.18em]" style={{ color: neon.color }}>Full player profile • {neon.label}</p>
                    <h2 className="mt-2 truncate font-display text-3xl font-black uppercase text-white sm:text-6xl">{player.name}</h2>
                    <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-white/60 sm:text-sm sm:tracking-[0.14em]">{player.role || playerRoleLabel(player)} • {player.impact || 0}/100 performance charge</p>
                  </div>
                </div>
              </header>

              <div className="grid gap-5 p-4 sm:gap-6 sm:p-8">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <LiveStat label="Career matches" value={stats.matches || "-"} />
                  <LiveStat label="Career runs" value={stats.runs || "-"} />
                  <LiveStat label="Career wickets" value={stats.wickets || "-"} />
                  <LiveStat label="Performance" value={`${player.impact || 0}/100`} />
                </div>

                {Object.keys(stats).length ? <PlayerStatsMatrix stats={stats} /> : <DataEmpty title="Career totals syncing" description="Overall CricHeroes statistics will appear after the next successful public profile refresh." />}

                <div className="grid gap-4 md:grid-cols-3">
                  <PlayerSkillMap type="batting" player={player} stats={stats} />
                  <PlayerSkillMap type="bowling" player={player} stats={stats} />
                  <PlayerSkillMap type="fielding" player={player} stats={stats} />
                </div>

                <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                  <PlayerImprovementPanel player={player} stats={stats} />

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
                      <p className="mt-2 text-xs leading-5 text-white/38">{player.historyComplete === false ? "More public CricHeroes history is queued for the next daily sync." : "All public history pages currently available to the sync are loaded."}</p>
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
            </motion.section>
          </motion.div>
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
        return true;
      }

      function LiveAvatar({ src, name }) {
        const [failed, setFailed] = useState(false);
        const safeSrc = safeImageUrl(src);
        const showImage = safeSrc && !failed && !safeSrc.includes("default/user_profile.png");

        return (
          <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full border border-gold/30 bg-gold/10 font-display text-xl font-black text-gold">
            {showImage ? (
              <img src={safeSrc} alt="" className="h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
            ) : (
              initialsFromName(name)
            )}
          </span>
        );
      }

      const ARENA_MODES = {
        super: { label: "Super Over", overs: 1, balls: 6 },
        quick: { label: "Quick Match", overs: 2, balls: 12 },
        five: { label: "Five-Over Clash", overs: 5, balls: 30 },
      };

      const ARENA_DIFFICULTIES = {
        rookie: { label: "Rookie", aiSkill: 58, aiMemory: 2, mistake: 0.22, timing: -12, aggression: -0.05 },
        pro: { label: "Professional", aiSkill: 72, aiMemory: 4, mistake: 0.12, timing: 0, aggression: 0.04 },
        legend: { label: "Legend", aiSkill: 84, aiMemory: 6, mistake: 0.06, timing: 10, aggression: 0.1 },
      };

      const PITCHES = {
        balanced: { label: "Balanced pitch", bounce: 1, pace: 1, swing: 1, spin: 1, timing: 0, boundary: 0 },
        batting: { label: "Batting pitch", bounce: 0.92, pace: 1.04, swing: 0.82, spin: 0.86, timing: 7, boundary: 0.08 },
        green: { label: "Green pitch", bounce: 1.08, pace: 1.08, swing: 1.22, spin: 0.78, timing: -6, boundary: -0.05 },
        dry: { label: "Dry turning pitch", bounce: 0.95, pace: 0.9, swing: 0.8, spin: 1.24, timing: -4, boundary: -0.03 },
        slow: { label: "Slow pitch", bounce: 0.84, pace: 0.84, swing: 0.9, spin: 1.08, timing: -7, boundary: -0.07 },
      };

      const FIELD_PRESETS = {
        attacking: { label: "Attacking", catch: 0.09, boundary: 0.03, singles: -0.04, zone: "Close catchers" },
        balanced: { label: "Balanced", catch: 0.03, boundary: 0, singles: 0, zone: "Classic ring" },
        defensive: { label: "Defensive", catch: -0.04, boundary: -0.08, singles: 0.08, zone: "Deep sweepers" },
        offTrap: { label: "Off-side trap", catch: 0.06, boundary: -0.03, singles: -0.01, zone: "Extra cover packed" },
        legTrap: { label: "Leg-side trap", catch: 0.06, boundary: -0.03, singles: -0.01, zone: "Midwicket loaded" },
        boundary: { label: "Boundary protection", catch: -0.02, boundary: -0.12, singles: 0.1, zone: "Riders back" },
      };

      const LINE_OPTIONS = ["Wide outside off", "Outside off", "Off stump", "Middle stump", "Leg stump", "Down leg side"];
      const LENGTH_OPTIONS = ["Yorker", "Full", "Good length", "Back of a length", "Short", "Bouncer"];
      const PACE_OPTIONS = ["Slower", "Normal", "Fast", "Maximum effort"];
      const FLIGHT_OPTIONS = ["Flat", "Normal", "Flighted", "Very slow"];
      const SHOT_DIRECTIONS = ["Off side", "Straight", "Leg side", "Behind square", "Defensive"];
      const SHOT_TYPES = ["Block", "Drive", "Cut", "Pull", "Sweep", "Lofted drive", "Slog", "Leave"];
      const FOOTWORK_OPTIONS = ["Front foot", "Back foot", "Advance down the pitch"];
      const AGGRESSION_OPTIONS = ["Defensive", "Balanced", "Aggressive"];

      const BOWLER_TYPES = {
        fast: {
          label: "Fast bowler",
          variations: ["Straight delivery", "Outswing", "Inswing", "Bouncer", "Yorker", "Cross-seam", "Slower ball"],
          paceOptions: PACE_OPTIONS,
        },
        swing: {
          label: "Swing bowler",
          variations: ["Outswing", "Inswing", "Off cutter", "Leg cutter", "Slower ball", "Yorker", "Straight delivery"],
          paceOptions: PACE_OPTIONS,
        },
        medium: {
          label: "Medium pacer",
          variations: ["Straight delivery", "Off cutter", "Leg cutter", "Slower ball", "Cross-seam", "Yorker", "Bouncer"],
          paceOptions: PACE_OPTIONS,
        },
        offspin: {
          label: "Off spinner",
          variations: ["Off break", "Arm ball", "Top spinner", "Carrom ball", "Flighted off break", "Quicker one", "Flipper"],
          paceOptions: FLIGHT_OPTIONS,
        },
        legspin: {
          label: "Leg spinner",
          variations: ["Leg break", "Googly", "Top spinner", "Flipper", "Flighted leg break", "Slider", "Very slow leg break"],
          paceOptions: FLIGHT_OPTIONS,
        },
      };

      const COMPACT_MODE_OPTIONS = ["super", "quick"];
      const COMPACT_DIFFICULTY_OPTIONS = ["rookie", "pro"];
      const COMPACT_PITCH_OPTIONS = ["balanced", "batting", "green"];
      const COMPACT_BAT_DIRECTIONS = ["Straight", "Off side", "Leg side", "Defensive"];
      const COMPACT_SHOT_TYPES = ["Block", "Drive", "Pull", "Slog"];
      const COMPACT_FOOTWORK = ["Front foot", "Back foot"];
      const COMPACT_AGGRESSION = ["Balanced", "Aggressive"];
      const COMPACT_LINES = ["Outside off", "Off stump", "Middle stump", "Leg stump"];
      const COMPACT_LENGTHS = ["Yorker", "Full", "Good length", "Short"];
      const COMPACT_FIELDS = ["attacking", "balanced", "defensive", "boundary"];

      const ARENA_CONFIG = {
        maxWickets: 5,
        timingCycleMs: 1540,
        accuracyCycleMs: 1320,
        aiMemoryLength: 6,
        xp: { win: 80, boundary: 12, six: 20, wicket: 24, dot: 7, perfect: 10, complete: 30 },
      };

      const DOT_BALL = "\u2022";

      const ARENA_PLAYERS = [
        { id: "arjun", name: "Arjun Rana", role: "Batsman", type: "batter", power: 78, timing: 82, technique: 80, footwork: 76, defence: 71, paceHandling: 79, spinHandling: 74, composure: 77 },
        { id: "veer", name: "Veer Pratap", role: "Opener", type: "batter", power: 72, timing: 86, technique: 83, footwork: 81, defence: 76, paceHandling: 82, spinHandling: 72, composure: 80 },
        { id: "kabir", name: "Kabir Sethi", role: "Power hitter", type: "batter", power: 90, timing: 73, technique: 70, footwork: 68, defence: 58, paceHandling: 76, spinHandling: 69, composure: 71 },
        { id: "ishaan", name: "Ishaan Mehra", role: "Anchor", type: "batter", power: 66, timing: 84, technique: 87, footwork: 82, defence: 84, paceHandling: 75, spinHandling: 82, composure: 86 },
        { id: "dev", name: "Dev Malik", role: "All-rounder", type: "allrounder", power: 75, timing: 76, technique: 74, footwork: 72, defence: 70, paceHandling: 72, spinHandling: 78, composure: 75, pace: 78, accuracy: 73, swing: 69, spin: 42, variation: 74, control: 72, stamina: 82 },
        { id: "samar", name: "Samar Gill", role: "All-rounder", type: "allrounder", power: 70, timing: 74, technique: 75, footwork: 76, defence: 73, paceHandling: 70, spinHandling: 81, composure: 78, pace: 56, accuracy: 76, swing: 45, spin: 78, variation: 80, control: 78, stamina: 80 },
        { id: "ranvijay", name: "Ranvijay Chauhan", role: "Fast bowler", type: "bowler", pace: 90, accuracy: 72, swing: 66, spin: 20, variation: 70, control: 72, stamina: 84, composure: 76 },
        { id: "daksh", name: "Daksh Oberoi", role: "Swing bowler", type: "bowler", pace: 82, accuracy: 80, swing: 86, spin: 25, variation: 73, control: 79, stamina: 80, composure: 78 },
        { id: "naman", name: "Naman Kohli", role: "Medium pacer", type: "bowler", pace: 74, accuracy: 84, swing: 72, spin: 35, variation: 78, control: 83, stamina: 82, composure: 81 },
        { id: "rudra", name: "Rudra Vyas", role: "Off spinner", type: "bowler", pace: 48, accuracy: 81, swing: 20, spin: 88, variation: 82, control: 84, stamina: 76, composure: 80 },
        { id: "yash", name: "Yash Bedi", role: "Leg spinner", type: "bowler", pace: 44, accuracy: 74, swing: 18, spin: 92, variation: 89, control: 75, stamina: 74, composure: 77 },
        { id: "omkar", name: "Omkar Singh", role: "Wicketkeeper-batsman", type: "keeper", power: 74, timing: 80, technique: 79, footwork: 78, defence: 75, paceHandling: 77, spinHandling: 80, composure: 82 },
      ];

      const AI_BATTERS = [
        { id: "anchor", name: "CricKuru Anchor", style: "Anchor", power: 70, timing: 78, technique: 82, footwork: 78, defence: 84, paceHandling: 76, spinHandling: 78, composure: 86 },
        { id: "aggressor", name: "CricKuru Aggressor", style: "Aggressor", power: 88, timing: 75, technique: 72, footwork: 70, defence: 60, paceHandling: 79, spinHandling: 73, composure: 72 },
        { id: "finisher", name: "CricKuru Finisher", style: "Finisher", power: 84, timing: 81, technique: 77, footwork: 76, defence: 68, paceHandling: 80, spinHandling: 80, composure: 88 },
      ];

      const AI_BOWLER = { id: "ai-bowler", name: "CricKuru AI Bowler", pace: 80, accuracy: 78, swing: 74, spin: 76, variation: 82, control: 80, stamina: 82, composure: 78 };

      function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
      }

      function weightedPick(weightMap) {
        const entries = Object.entries(weightMap).filter(([, value]) => value > 0);
        const total = entries.reduce((sum, [, value]) => sum + value, 0);
        let cursor = Math.random() * total;
        for (const [key, value] of entries) {
          cursor -= value;
          if (cursor <= 0) return key;
        }
        return entries[0]?.[0] || "dot";
      }

      function formatOvers(legalBalls) {
        return `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`;
      }

      function runRate(runs, legalBalls) {
        return legalBalls ? ((runs / legalBalls) * 6).toFixed(2) : "0.00";
      }

      function getMeterValue(start, cycleMs) {
        if (!start) return 0;
        const elapsed = (performance.now() - start) % cycleMs;
        const half = cycleMs / 2;
        return elapsed <= half ? (elapsed / half) * 100 : 100 - ((elapsed - half) / half) * 100;
      }

      function timingFromValue(value) {
        const diff = Math.abs(value - 50);
        if (diff <= 6) return { label: "Perfect", score: 1, tone: "text-gold" };
        if (diff <= 14) return { label: "Good", score: 0.78, tone: "text-cyan" };
        if (value < 50 && diff <= 26) return { label: "Early", score: 0.48, tone: "text-white/70" };
        if (value > 50 && diff <= 26) return { label: "Late", score: 0.48, tone: "text-white/70" };
        return { label: value < 50 ? "Very Early" : "Very Late", score: 0.18, tone: "text-crimson" };
      }

      function accuracyFromValue(value) {
        const diff = Math.abs(value - 52);
        if (diff <= 7) return { label: "Perfect", score: 1, tone: "text-gold" };
        if (diff <= 16) return { label: "Good", score: 0.78, tone: "text-cyan" };
        if (diff <= 28) return { label: "Slight error", score: 0.52, tone: "text-white/70" };
        if (diff <= 40) return { label: "Poor", score: 0.28, tone: "text-crimson" };
        return { label: "Wild", score: 0.08, tone: "text-crimson" };
      }

      function describeDelivery(delivery) {
        return `${delivery.variation}, ${delivery.length.toLowerCase()}, ${delivery.line.toLowerCase()}, ${delivery.pace.toLowerCase()}`;
      }

      function deliveryIsSpin(delivery) {
        return /break|googly|spinner|flipper|arm|carrom|flighted|slider/i.test(delivery.variation);
      }

      function variationMovement(variation) {
        if (/out/i.test(variation)) return "away";
        if (/in/i.test(variation)) return "inward";
        if (/googly|leg break|off break|carrom|flipper|top spinner|arm/i.test(variation)) return "spin";
        if (/slower|cutter/i.test(variation)) return "variation";
        return "straight";
      }

      function calculateDeliveryQuality({ delivery, accuracy, bowler, pitch, context }) {
        const isSpin = deliveryIsSpin(delivery);
        const paceBoost = /Fast|Maximum/.test(delivery.pace) ? 5 : /Slower|Very slow|Flighted/.test(delivery.pace) ? -1 : 2;
        const movementSkill = isSpin ? bowler.spin || 50 : Math.max(bowler.swing || 50, bowler.variation || 50);
        const base = ((bowler.accuracy || 70) * 0.32 + (bowler.control || 70) * 0.26 + movementSkill * 0.23 + (bowler.composure || 70) * 0.12 + (bowler.stamina || 72) * 0.07) / 100;
        const pitchHelp = isSpin ? pitch.spin : pitch.swing;
        const setupBonus = context?.previousSimilar ? -0.04 : context?.sequenceTrap ? 0.06 : 0;
        return clamp(base * accuracy.score * pitchHelp + paceBoost / 100 + setupBonus, 0.05, 1.25);
      }

      function calculateShotQuality({ shot, timing, batter, pitch, context }) {
        const powerShots = ["Slog", "Lofted drive", "Pull"];
        const skillBase = ((batter.timing || 74) * 0.25 + (batter.technique || 74) * 0.22 + (batter.footwork || 74) * 0.18 + (batter.composure || 74) * 0.16 + (powerShots.includes(shot.shotType) ? batter.power || 74 : batter.defence || 72) * 0.19) / 100;
        const aggressionBoost = shot.aggression === "Aggressive" ? 0.08 : shot.aggression === "Defensive" ? -0.03 : 0.02;
        const confidence = context?.confidence || 0;
        return clamp(skillBase * timing.score + aggressionBoost + pitch.timing / 100 + confidence, 0.03, 1.28);
      }

      function calculateTacticalMatchup({ delivery, shot }) {
        let score = 0.5;
        const line = delivery.line;
        const length = delivery.length;
        const type = shot.shotType;
        const footwork = shot.footwork;
        const direction = shot.direction;
        const movement = variationMovement(delivery.variation);
        const spin = deliveryIsSpin(delivery);

        if (length === "Full" && ["Drive", "Lofted drive", "Block"].includes(type)) score += 0.22;
        if (line.includes("Outside off") && ["Drive", "Cut", "Leave"].includes(type)) score += 0.14;
        if (length === "Good length" && ["Block", "Drive"].includes(type)) score += 0.1;
        if (["Short", "Bouncer", "Back of a length"].includes(length) && ["Pull", "Cut"].includes(type)) score += 0.24;
        if (length === "Yorker" && ["Block", "Drive"].includes(type)) score += 0.14;
        if (spin && ["Sweep", "Cut", "Lofted drive"].includes(type)) score += 0.18;
        if (footwork === "Front foot" && ["Full", "Yorker", "Good length"].includes(length)) score += 0.12;
        if (footwork === "Back foot" && ["Short", "Bouncer", "Back of a length"].includes(length)) score += 0.14;
        if (footwork === "Advance down the pitch" && spin) score += 0.14;
        if (direction === "Straight" && ["Off stump", "Middle stump"].includes(line)) score += 0.08;

        if (["Short", "Bouncer"].includes(length) && ["Drive", "Sweep"].includes(type)) score -= 0.25;
        if (length === "Yorker" && ["Slog", "Cut", "Pull"].includes(type)) score -= 0.28;
        if (length === "Full" && type === "Pull") score -= 0.24;
        if (line === "Wide outside off" && direction === "Leg side") score -= 0.22;
        if (line === "Down leg side" && direction === "Off side") score -= 0.16;
        if (movement === "away" && ["Slog", "Drive"].includes(type) && direction !== "Straight") score -= 0.12;
        if (movement === "inward" && type === "Slog") score -= 0.14;
        if (type === "Leave" && ["Off stump", "Middle stump", "Leg stump"].includes(line)) score -= 0.45;
        if (type === "Leave" && ["Wide outside off", "Down leg side"].includes(line)) score += 0.26;
        return clamp(score, 0.05, 1.05);
      }

      function calculatePressureModifier({ innings, target, maxBalls, difficulty }) {
        if (!target) return 0;
        const ballsLeft = Math.max(1, maxBalls - innings.legalBalls);
        const runsRequired = Math.max(0, target - innings.runs);
        const requiredRate = (runsRequired / ballsLeft) * 6;
        const pressure = requiredRate > 12 ? 0.12 : requiredRate > 9 ? 0.07 : requiredRate > 6 ? 0.03 : -0.02;
        return pressure + ARENA_DIFFICULTIES[difficulty].aggression;
      }

      function resolveBallOutcome({ delivery, shot, timing, accuracy, batter, bowler, pitch, field, innings, target, maxBalls, difficulty, isAiBatting }) {
        const fieldMod = FIELD_PRESETS[field] || FIELD_PRESETS.balanced;
        const deliveryQuality = calculateDeliveryQuality({ delivery, accuracy, bowler, pitch, context: delivery.context });
        const shotQuality = calculateShotQuality({ shot, timing, batter, pitch, context: { confidence: innings.confidence || 0 } });
        const tacticalMatchup = calculateTacticalMatchup({ delivery, shot });
        const pressureModifier = calculatePressureModifier({ innings, target, maxBalls, difficulty });
        const poorAccuracy = accuracy.score < 0.32;
        const lineExtra = delivery.line === "Wide outside off" || delivery.line === "Down leg side";

        if (poorAccuracy && Math.random() < (lineExtra ? 0.55 : 0.22)) {
          const noBall = /Bouncer|Maximum effort|Full toss/i.test(delivery.length + delivery.pace) && Math.random() < 0.32;
          return buildOutcome({
            code: noBall ? "Nb" : "Wd",
            runs: 1,
            legal: false,
            wicket: false,
            title: noBall ? "NO-BALL! The bowler oversteps." : "WIDE! The radar slips.",
            detail: noBall ? "Poor accuracy created an illegal delivery." : "Line drifted outside the playable corridor.",
            delivery, shot, timing, accuracy, deliveryQuality, shotQuality, tacticalMatchup, pressureModifier,
          });
        }

        const riskShot = ["Slog", "Lofted drive", "Pull", "Sweep"].includes(shot.shotType) ? 0.08 : 0;
        const defensive = shot.aggression === "Defensive" || shot.shotType === "Block";
        const wicketWeight = clamp(0.08 + (deliveryQuality - shotQuality) * 0.3 + (0.55 - tacticalMatchup) * 0.32 + pressureModifier * 0.22 + riskShot + fieldMod.catch - (defensive ? 0.06 : 0), 0.012, 0.56);
        const boundaryWeight = clamp(0.08 + (shotQuality - deliveryQuality) * 0.34 + (tacticalMatchup - 0.52) * 0.28 + pitch.boundary + fieldMod.boundary + (shot.aggression === "Aggressive" ? 0.1 : 0), 0.015, 0.62);
        const singleWeight = clamp(0.24 + fieldMod.singles + (shot.aggression === "Defensive" ? 0.05 : 0), 0.08, 0.48);
        const dotWeight = clamp(0.28 + (deliveryQuality - shotQuality) * 0.18 - fieldMod.singles, 0.05, 0.62);
        const twoWeight = clamp(0.14 + (tacticalMatchup - 0.5) * 0.12, 0.04, 0.28);
        const threeWeight = clamp(0.03 + (shot.direction === "Behind square" ? 0.03 : 0), 0.01, 0.09);
        const sixWeight = clamp(boundaryWeight * (["Slog", "Lofted drive", "Pull"].includes(shot.shotType) ? 0.45 : 0.12), 0.005, 0.3);

        const pick = weightedPick({
          wicket: wicketWeight,
          dot: dotWeight,
          one: singleWeight,
          two: twoWeight,
          three: threeWeight,
          four: boundaryWeight,
          six: sixWeight,
        });

        if (pick === "wicket") {
          const wicketType = chooseWicketType(delivery, shot, timing, tacticalMatchup);
          return buildOutcome({
            code: "W",
            runs: 0,
            legal: true,
            wicket: true,
            wicketType,
            title: `${wicketType.toUpperCase()}! ${wicketLine(wicketType)}`,
            detail: `Delivery quality ${Math.round(deliveryQuality * 100)} beat shot quality ${Math.round(shotQuality * 100)}.`,
            delivery, shot, timing, accuracy, deliveryQuality, shotQuality, tacticalMatchup, pressureModifier,
          });
        }

        const runs = { dot: 0, one: 1, two: 2, three: 3, four: 4, six: 6 }[pick] || 0;
        const code = runs === 0 ? DOT_BALL : String(runs);
        const title = runs === 0
          ? dotBallLine(delivery, shot)
          : runs === 4
            ? "FOUR! " + boundaryLine(delivery, shot, false)
            : runs === 6
              ? "SIX! " + boundaryLine(delivery, shot, true)
              : `${runs} run${runs > 1 ? "s" : ""}. Smart cricket under the lights.`;
        return buildOutcome({
          code, runs, legal: true, wicket: false, title,
          detail: `Matchup ${Math.round(tacticalMatchup * 100)} + ${timing.label.toLowerCase()} timing shaped the result.`,
          delivery, shot, timing, accuracy, deliveryQuality, shotQuality, tacticalMatchup, pressureModifier,
        });
      }

      function buildOutcome(payload) {
        const tactical = [
          `Delivery: ${describeDelivery(payload.delivery)}`,
          `Shot: ${payload.shot.footwork}, ${payload.shot.aggression.toLowerCase()} ${payload.shot.shotType.toLowerCase()} to ${payload.shot.direction.toLowerCase()}`,
          `Timing/accuracy: ${payload.timing.label} / ${payload.accuracy.label}`,
          `Matchup: ${Math.round(payload.tacticalMatchup * 100)} tactical score`,
          `Result: ${payload.code}`,
        ];
        return { ...payload, tactical };
      }

      function chooseWicketType(delivery, shot, timing, matchup) {
        if (shot.footwork === "Advance down the pitch" && deliveryIsSpin(delivery) && timing.score < 0.55) return "Stumped";
        if (variationMovement(delivery.variation) === "away" && shot.shotType !== "Block") return "Caught behind";
        if (variationMovement(delivery.variation) === "inward" && timing.score < 0.55) return "LBW";
        if (["Yorker", "Good length"].includes(delivery.length) && matchup < 0.42) return "Bowled";
        return weightedPick({ Caught: 0.44, Bowled: 0.24, LBW: 0.2, "Caught behind": 0.12 });
      }

      function wicketLine(type) {
        return {
          Bowled: "Straight through the gate.",
          LBW: "Pinned in front by a ruthless line.",
          Caught: "A skier hangs in the night and the fielder settles under it.",
          "Caught behind": "A thin edge carries to the keeper.",
          Stumped: "The batter advances and cannot get back.",
        }[type] || "The pressure tells.";
      }

      function dotBallLine(delivery, shot) {
        if (shot.shotType === "Leave") return "Left alone. No damage, no run.";
        if (delivery.length === "Yorker") return "Dug out at the toes for a dot.";
        if (variationMovement(delivery.variation) === "away") return "Beaten outside off by late movement.";
        return "Dot ball. The bowler wins that tactical exchange.";
      }

      function boundaryLine(delivery, shot, six) {
        if (shot.shotType === "Pull") return six ? "A dangerous short ball disappears over midwicket." : "Pulled hard behind square.";
        if (shot.shotType === "Cut") return "Carved through the off side with sharp hands.";
        if (shot.shotType === "Lofted drive") return "Lofted cleanly into the golden seats.";
        if (shot.shotType === "Slog") return "High-risk power pays off.";
        return "Driven with a clean face through the ring.";
      }

      function chooseAiDelivery(state) {
        const difficulty = ARENA_DIFFICULTIES[state.setup.difficulty];
        const recentShots = state.aiMemory.userShots.slice(-difficulty.aiMemory);
        const favoriteShot = mostCommon(recentShots.map((item) => item.shotType)) || "Drive";
        const favoriteDirection = mostCommon(recentShots.map((item) => item.direction)) || "Straight";
        const advances = recentShots.filter((item) => item.footwork === "Advance down the pitch").length;
        const attacks = recentShots.filter((item) => item.aggression === "Aggressive").length;
        const ballsLeft = state.maxBalls - currentInnings(state).legalBalls;
        const defendingHighRate = state.target && (state.target - currentInnings(state).runs) / Math.max(1, ballsLeft) > 1.6;
        let line = "Off stump";
        let length = "Good length";
        let variation = "Outswing";
        let pace = "Normal";

        if (favoriteShot === "Drive") {
          length = "Short";
          line = "Outside off";
          variation = "Off cutter";
        }
        if (favoriteShot === "Pull") {
          length = "Full";
          variation = "Slower ball";
        }
        if (favoriteShot === "Slog" || attacks >= 2) {
          length = Math.random() < 0.5 ? "Yorker" : "Bouncer";
          variation = Math.random() < 0.5 ? "Slower ball" : "Cross-seam";
          line = favoriteDirection === "Leg side" ? "Wide outside off" : "Middle stump";
        }
        if (advances >= 2) {
          length = "Yorker";
          line = "Wide outside off";
          variation = "Inswing";
        }
        if (defendingHighRate) {
          length = "Yorker";
          line = "Wide outside off";
          variation = "Slower ball";
        }
        if (Math.random() < difficulty.mistake) {
          length = LENGTH_OPTIONS[Math.floor(Math.random() * LENGTH_OPTIONS.length)];
          line = LINE_OPTIONS[Math.floor(Math.random() * LINE_OPTIONS.length)];
        }
        if (Math.random() < 0.18) {
          variation = ["Outswing", "Inswing", "Leg cutter", "Straight delivery", "Slower ball"][Math.floor(Math.random() * 5)];
        }

        return { variation, line, length, pace, field: defendingHighRate ? "boundary" : attacks >= 2 ? "defensive" : "balanced", bowlerType: "swing", context: { sequenceTrap: recentShots.length >= 2 && favoriteShot === mostCommon(recentShots.map((item) => item.shotType)) } };
      }

      function chooseAiShot(delivery, state) {
        const difficulty = ARENA_DIFFICULTIES[state.setup.difficulty];
        const personality = state.aiPersonality || AI_BATTERS[1];
        const innings = currentInnings(state);
        const pressure = calculatePressureModifier({ innings, target: state.target, maxBalls: state.maxBalls, difficulty: state.setup.difficulty });
        let shotType = "Drive";
        let direction = "Straight";
        let footwork = "Front foot";
        let aggression = personality.style === "Aggressor" ? "Aggressive" : personality.style === "Anchor" ? "Balanced" : "Balanced";

        if (["Short", "Bouncer", "Back of a length"].includes(delivery.length)) {
          shotType = delivery.line.includes("off") || delivery.line.includes("Outside") ? "Cut" : "Pull";
          footwork = "Back foot";
          direction = shotType === "Cut" ? "Off side" : "Leg side";
        } else if (delivery.length === "Yorker") {
          shotType = "Block";
          footwork = "Front foot";
          aggression = "Defensive";
        } else if (deliveryIsSpin(delivery)) {
          shotType = Math.random() < 0.55 ? "Sweep" : "Lofted drive";
          footwork = shotType === "Lofted drive" ? "Advance down the pitch" : "Front foot";
          direction = shotType === "Sweep" ? "Leg side" : "Straight";
        } else if (delivery.line === "Wide outside off") {
          shotType = Math.random() < 0.45 ? "Leave" : "Cut";
          direction = "Off side";
        }

        if (pressure > 0.08 || personality.style === "Finisher") aggression = "Aggressive";
        if (Math.random() < difficulty.mistake) {
          shotType = SHOT_TYPES[Math.floor(Math.random() * (SHOT_TYPES.length - 1))];
          direction = SHOT_DIRECTIONS[Math.floor(Math.random() * SHOT_DIRECTIONS.length)];
          footwork = FOOTWORK_OPTIONS[Math.floor(Math.random() * FOOTWORK_OPTIONS.length)];
        }

        const timingRoll = clamp(50 + (Math.random() * 32 - 16) + difficulty.timing, 0, 100);
        return { shotType, direction, footwork, aggression, timing: timingFromValue(timingRoll) };
      }

      function mostCommon(values) {
        const counts = values.filter(Boolean).reduce((acc, value) => ({ ...acc, [value]: (acc[value] || 0) + 1 }), {});
        return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
      }

      function currentInnings(state) {
        return state.innings[state.inningsIndex] || state.innings[0];
      }

      function createBlankInnings({ battingSide, team, striker, bowler }) {
        return {
          battingSide,
          team,
          runs: 0,
          wickets: 0,
          legalBalls: 0,
          recent: [],
          confidence: 0,
          batter: { name: striker.name, runs: 0, balls: 0, fours: 0, sixes: 0, out: false },
          bowler: { name: bowler.name, legalBalls: 0, runs: 0, wickets: 0, dots: 0, wides: 0, noBalls: 0 },
        };
      }

      function loadArenaProgress() {
        try {
          const stored = JSON.parse(localStorage.getItem("crickuruArenaProgress")) || {};
          const defaults = defaultArenaProgress();
          return {
            ...defaults,
            ...stored,
            batting: { ...defaults.batting, ...(stored.batting || {}), shots: { ...defaults.batting.shots, ...((stored.batting || {}).shots || {}) } },
            bowling: { ...defaults.bowling, ...(stored.bowling || {}), deliveries: { ...defaults.bowling.deliveries, ...((stored.bowling || {}).deliveries || {}) } },
            achievements: stored.achievements || defaults.achievements,
          };
        } catch {
          return defaultArenaProgress();
        }
      }

      function defaultArenaProgress() {
        return {
          matches: 0,
          wins: 0,
          losses: 0,
          ties: 0,
          xp: 0,
          level: 1,
          streak: 0,
          bestStreak: 0,
          batting: { runs: 0, balls: 0, fours: 0, sixes: 0, highest: 0, perfect: 0, shots: {} },
          bowling: { legalBalls: 0, runs: 0, wickets: 0, dots: 0, wides: 0, noBalls: 0, bestWickets: 0, deliveries: {} },
          achievements: [],
        };
      }

      function saveArenaProgress(progress) {
        localStorage.setItem("crickuruArenaProgress", JSON.stringify(progress));
      }

      function awardProgress(progress, outcome, userRole, matchResult) {
        const next = typeof structuredClone === "function" ? structuredClone(progress) : JSON.parse(JSON.stringify(progress));
        let xp = 2;
        if (outcome?.timing?.label === "Perfect") xp += ARENA_CONFIG.xp.perfect;
        if (outcome?.runs === 4) xp += ARENA_CONFIG.xp.boundary;
        if (outcome?.runs === 6) xp += ARENA_CONFIG.xp.six;
        if (outcome?.wicket && userRole === "bowl") xp += ARENA_CONFIG.xp.wicket;
        if (outcome?.code === DOT_BALL && userRole === "bowl") xp += ARENA_CONFIG.xp.dot;
        if (matchResult) {
          next.matches += 1;
          if (matchResult.type === "win") {
            next.wins += 1;
            next.streak += 1;
            xp += ARENA_CONFIG.xp.win;
          } else if (matchResult.type === "loss") {
            next.losses += 1;
            next.streak = 0;
          } else {
            next.ties += 1;
          }
          next.bestStreak = Math.max(next.bestStreak, next.streak);
        }
        if (userRole === "bat" && outcome) {
          next.batting.runs += outcome.runs || 0;
          if (outcome.legal) next.batting.balls += 1;
          if (outcome.runs === 4) next.batting.fours += 1;
          if (outcome.runs === 6) next.batting.sixes += 1;
          if (outcome.timing?.label === "Perfect") next.batting.perfect += 1;
          const shotName = outcome.shot?.shotType || "Unknown";
          next.batting.shots[shotName] = (next.batting.shots[shotName] || 0) + 1;
        }
        if (userRole === "bowl" && outcome) {
          if (outcome.legal) next.bowling.legalBalls += 1;
          next.bowling.runs += outcome.runs || 0;
          if (outcome.wicket) next.bowling.wickets += 1;
          if (outcome.code === DOT_BALL) next.bowling.dots += 1;
          if (outcome.code === "Wd") next.bowling.wides += 1;
          if (outcome.code === "Nb") next.bowling.noBalls += 1;
          const deliveryName = outcome.delivery?.variation || "Unknown";
          next.bowling.deliveries[deliveryName] = (next.bowling.deliveries[deliveryName] || 0) + 1;
        }
        next.xp += xp;
        next.level = Math.max(1, Math.floor(next.xp / 250) + 1);
        const earned = achievementList(next, outcome, matchResult);
        next.achievements = Array.from(new Set([...(next.achievements || []), ...earned]));
        saveArenaProgress(next);
        return next;
      }

      function achievementList(progress, outcome, matchResult) {
        const list = [];
        if ((outcome?.runs || 0) >= 4) list.push("First Boundary");
        if (outcome?.runs === 6) list.push("Six Machine");
        if (outcome?.delivery?.length === "Yorker" && outcome?.wicket) list.push("Yorker King");
        if (outcome?.wicket && outcome?.deliveryQuality > 0.9) list.push("Unplayable");
        if (matchResult?.lastBallWin) list.push("Last-Ball Hero");
        if (matchResult?.type === "win") list.push("Super Over Champion");
        return list;
      }

      const initialArenaSetup = {
        mode: "super",
        difficulty: "pro",
        userTeam: "Kurukshetra Warriors",
        opponent: "CricKuru XI",
        pitch: "balanced",
        bowlerType: "swing",
        batterId: "veer",
        bowlerId: "daksh",
      };

      function arenaInitialState() {
        return {
          phase: "menu",
          setup: initialArenaSetup,
          maxBalls: ARENA_MODES.super.balls,
          pitch: PITCHES.balanced,
          toss: null,
          tossChoice: null,
          inningsIndex: 0,
          innings: [],
          target: null,
          aiPersonality: AI_BATTERS[1],
          battingSelection: { direction: "Straight", shotType: "Drive", footwork: "Front foot", aggression: "Balanced" },
          bowlingSelection: { bowlerType: "swing", variation: "Outswing", line: "Off stump", length: "Good length", pace: "Normal", field: "balanced" },
          currentDelivery: null,
          currentShot: null,
          meterStart: null,
          lastOutcome: null,
          afterBallPhase: null,
          aiMemory: { userShots: [], userBalls: [], outcomes: [] },
          commentary: { title: "Welcome to CricKuru Arena.", detail: "Choose a match mode, win the toss and out-think the AI." },
          progress: loadArenaProgress(),
          settings: { sound: true, music: false, effects: 0.45, crowd: 0.35, slowMo: true, shake: true, reducedFx: false },
          result: null,
        };
      }

      function arenaReducer(state, action) {
        if (action.type === "MERGE") return { ...state, ...action.patch };
        if (action.type === "SETUP") return { ...state, setup: { ...state.setup, [action.key]: action.value } };
        if (action.type === "BATTING") return { ...state, battingSelection: { ...state.battingSelection, [action.key]: action.value } };
        if (action.type === "BOWLING") {
          if (action.key === "bowlerType") {
            const bowlerType = BOWLER_TYPES[action.value];
            return {
              ...state,
              bowlingSelection: {
                ...state.bowlingSelection,
                bowlerType: action.value,
                variation: bowlerType.variations[0],
                pace: bowlerType.paceOptions[1],
              },
            };
          }
          return { ...state, bowlingSelection: { ...state.bowlingSelection, [action.key]: action.value } };
        }
        if (action.type === "SETTINGS") return { ...state, settings: { ...state.settings, [action.key]: action.value } };
        if (action.type === "RESET") return arenaInitialState();
        return state;
      }

      function useArenaAudio(settings) {
        const contextRef = useRef(null);
        const play = (type) => {
          if (!settings.sound || settings.effects <= 0) return;
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          if (!AudioContext) return;
          const context = contextRef.current || new AudioContext();
          contextRef.current = context;
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          const tones = {
            release: [220, 0.04],
            hit: [420, 0.08],
            edge: [760, 0.06],
            wicket: [120, 0.18],
            four: [520, 0.12],
            six: [660, 0.16],
            win: [760, 0.24],
          };
          const [freq, duration] = tones[type] || [300, 0.06];
          oscillator.frequency.value = freq;
          oscillator.type = type === "wicket" ? "sawtooth" : "sine";
          gain.gain.value = settings.effects * 0.18;
          oscillator.connect(gain).connect(context.destination);
          oscillator.start();
          gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
          oscillator.stop(context.currentTime + duration + 0.02);
        };
        return play;
      }

      function useArenaMatch() {
        const [state, dispatch] = useReducer(arenaReducer, undefined, arenaInitialState);
        const playSound = useArenaAudio(state.settings);

        const selectedBatter = ARENA_PLAYERS.find((player) => player.id === state.setup.batterId) || ARENA_PLAYERS[0];
        const selectedBowler = ARENA_PLAYERS.find((player) => player.id === state.setup.bowlerId) || ARENA_PLAYERS[7];
        const mode = ARENA_MODES[state.setup.mode];

        const startToss = () => {
          const pitch = state.setup.pitch === "random"
            ? Object.values(PITCHES)[Math.floor(Math.random() * Object.values(PITCHES).length)]
            : PITCHES[state.setup.pitch] || PITCHES.balanced;
          const tossWinner = Math.random() < 0.5 ? "human" : "ai";
          const aiChoice = chooseAiTossChoice(pitch, state.setup.difficulty, state.setup.mode);
          dispatch({
            type: "MERGE",
            patch: {
              phase: "toss",
              pitch,
              maxBalls: mode.balls,
              toss: { winner: tossWinner, coin: Math.random() < 0.5 ? "Heads" : "Tails", aiChoice },
              commentary: { title: "Coin in the air.", detail: `${pitch.label}: swing ${pitch.swing.toFixed(2)}, spin ${pitch.spin.toFixed(2)}, timing ${pitch.timing >= 0 ? "+" : ""}${pitch.timing}.` },
            },
          });
        };

        const startMatch = (choice) => {
          const humanChoice = state.toss?.winner === "human" ? choice : null;
          const finalChoice = humanChoice || state.toss?.aiChoice || "bat";
          const firstBattingSide = state.toss?.winner === "human" ? (finalChoice === "bat" ? "human" : "ai") : (finalChoice === "bat" ? "ai" : "human");
          const innings = createBlankInnings({
            battingSide: firstBattingSide,
            team: firstBattingSide === "human" ? state.setup.userTeam : state.setup.opponent,
            striker: firstBattingSide === "human" ? selectedBatter : state.aiPersonality,
            bowler: firstBattingSide === "human" ? AI_BOWLER : selectedBowler,
          });
          dispatch({
            type: "MERGE",
            patch: {
              phase: "inningsIntro",
              tossChoice: finalChoice,
              inningsIndex: 0,
              innings: [innings],
              target: null,
              bowlingSelection: {
                ...state.bowlingSelection,
                bowlerType: state.setup.bowlerType,
                variation: BOWLER_TYPES[state.setup.bowlerType].variations[0],
                pace: BOWLER_TYPES[state.setup.bowlerType].paceOptions[1],
              },
              commentary: {
                title: `${innings.team} will bat first.`,
                detail: `${ARENA_MODES[state.setup.mode].label}: ${ARENA_MODES[state.setup.mode].overs} over${ARENA_MODES[state.setup.mode].overs > 1 ? "s" : ""} per side.`,
              },
            },
          });
        };

        const startBallSelection = () => {
          dispatch({ type: "MERGE", patch: { phase: "awaitingSelection", afterBallPhase: null, currentDelivery: null, currentShot: null } });
        };

        const startHumanBattingDelivery = () => {
          const delivery = chooseAiDelivery(state);
          playSound("release");
          dispatch({
            type: "MERGE",
            patch: {
              phase: "awaitingTiming",
              currentDelivery: delivery,
              meterStart: performance.now(),
              commentary: { title: "AI bowler is in.", detail: "Read the length and press Space or Play Shot in the timing window." },
            },
          });
        };

        const playHumanShot = () => {
          if (state.phase !== "awaitingTiming") return;
          const timing = timingFromValue(getMeterValue(state.meterStart, ARENA_CONFIG.timingCycleMs));
          const innings = currentInnings(state);
          const shot = { ...state.battingSelection };
          const outcome = resolveBallOutcome({
            delivery: state.currentDelivery,
            shot,
            timing,
            accuracy: { label: "AI release", score: clamp(ARENA_DIFFICULTIES[state.setup.difficulty].aiSkill / 92, 0.48, 0.94) },
            batter: selectedBatter,
            bowler: AI_BOWLER,
            pitch: state.pitch,
            field: state.currentDelivery.field,
            innings,
            target: state.target,
            maxBalls: state.maxBalls,
            difficulty: state.setup.difficulty,
            isAiBatting: false,
          });
          commitOutcome(outcome, "bat");
        };

        const startHumanBowlingDelivery = () => {
          const delivery = { ...state.bowlingSelection, context: {} };
          const aiShot = chooseAiShot(delivery, state);
          playSound("release");
          dispatch({
            type: "MERGE",
            patch: {
              phase: "deliveryRunning",
              currentDelivery: delivery,
              currentShot: aiShot,
              meterStart: performance.now(),
              commentary: { title: "Lock the release point.", detail: "Stop the meter in the gold zone for maximum control." },
            },
          });
        };

        const stopBowlingAccuracy = () => {
          if (state.phase !== "deliveryRunning") return;
          const accuracy = accuracyFromValue(getMeterValue(state.meterStart, ARENA_CONFIG.accuracyCycleMs));
          const innings = currentInnings(state);
          const outcome = resolveBallOutcome({
            delivery: state.currentDelivery,
            shot: { direction: state.currentShot.direction, shotType: state.currentShot.shotType, footwork: state.currentShot.footwork, aggression: state.currentShot.aggression },
            timing: state.currentShot.timing,
            accuracy,
            batter: state.aiPersonality,
            bowler: selectedBowler,
            pitch: state.pitch,
            field: state.currentDelivery.field,
            innings,
            target: state.target,
            maxBalls: state.maxBalls,
            difficulty: state.setup.difficulty,
            isAiBatting: true,
          });
          commitOutcome(outcome, "bowl");
        };

        const commitOutcome = (outcome, userRole) => {
          const next = applyOutcomeToState(state, outcome, userRole);
          playSound(outcome.wicket ? "wicket" : outcome.runs === 6 ? "six" : outcome.runs === 4 ? "four" : outcome.runs > 0 ? "hit" : "edge");
          dispatch({ type: "MERGE", patch: next });
        };

        const continueAfterBall = () => {
          if (state.afterBallPhase === "inningsComplete") {
            dispatch({ type: "MERGE", patch: { phase: "inningsComplete" } });
            return;
          }
          if (state.afterBallPhase === "matchComplete") {
            dispatch({ type: "MERGE", patch: { phase: "matchComplete" } });
            playSound("win");
            return;
          }
          if (state.afterBallPhase === "overComplete") {
            dispatch({ type: "MERGE", patch: { phase: "overComplete" } });
            return;
          }
          startBallSelection();
        };

        const startSecondInnings = () => {
          const first = state.innings[0];
          const secondSide = first.battingSide === "human" ? "ai" : "human";
          const second = createBlankInnings({
            battingSide: secondSide,
            team: secondSide === "human" ? state.setup.userTeam : state.setup.opponent,
            striker: secondSide === "human" ? selectedBatter : state.aiPersonality,
            bowler: secondSide === "human" ? AI_BOWLER : selectedBowler,
          });
          dispatch({
            type: "MERGE",
            patch: {
              phase: "inningsIntro",
              inningsIndex: 1,
              innings: [first, second],
              target: first.runs + 1,
              commentary: { title: `${second.team} need ${first.runs + 1}.`, detail: "The chase is live. Every legal ball now has pressure attached." },
            },
          });
        };

        const resetMatch = () => {
          const fresh = arenaInitialState();
          dispatch({ type: "MERGE", patch: { ...fresh, progress: loadArenaProgress() } });
        };

        return {
          state,
          dispatch,
          selectedBatter,
          selectedBowler,
          startToss,
          startMatch,
          startBallSelection,
          startHumanBattingDelivery,
          playHumanShot,
          startHumanBowlingDelivery,
          stopBowlingAccuracy,
          continueAfterBall,
          startSecondInnings,
          resetMatch,
        };
      }

      function chooseAiTossChoice(pitch, difficulty, mode) {
        if (difficulty === "legend" && (pitch.green || pitch.swing > 1.15)) return "bowl";
        if (mode === "super") return Math.random() < 0.55 ? "bowl" : "bat";
        if (pitch.boundary > 0.03) return "bat";
        return Math.random() < 0.5 ? "bat" : "bowl";
      }

      function applyOutcomeToState(state, outcome, userRole) {
        const innings = currentInnings(state);
        const updated = { ...innings };
        updated.runs += outcome.runs || 0;
        updated.confidence = clamp((updated.confidence || 0) + (outcome.runs >= 4 ? 0.04 : outcome.wicket ? -0.04 : outcome.runs > 0 ? 0.01 : -0.01), -0.12, 0.14);
        if (outcome.legal) {
          updated.legalBalls += 1;
          updated.batter.balls += 1;
          updated.bowler.legalBalls += 1;
        }
        if (outcome.code === "Wd") updated.bowler.wides += 1;
        if (outcome.code === "Nb") updated.bowler.noBalls += 1;
        updated.batter.runs += outcome.runs || 0;
        updated.bowler.runs += outcome.runs || 0;
        if (outcome.code === DOT_BALL) updated.bowler.dots += 1;
        if (outcome.runs === 4) updated.batter.fours += 1;
        if (outcome.runs === 6) updated.batter.sixes += 1;
        if (outcome.wicket) {
          updated.wickets += 1;
          updated.bowler.wickets += 1;
          updated.batter.out = true;
        }
        updated.recent = [...updated.recent.slice(-11), outcome.code];
        const inningsList = [...state.innings];
        inningsList[state.inningsIndex] = updated;

        const maxed = updated.legalBalls >= state.maxBalls || updated.wickets >= ARENA_CONFIG.maxWickets;
        const chased = Boolean(state.target && updated.runs >= state.target);
        const matchDone = state.inningsIndex === 1 && (maxed || chased);
        const firstDone = state.inningsIndex === 0 && maxed;
        const overDone = outcome.legal && updated.legalBalls > 0 && updated.legalBalls % 6 === 0 && !maxed && !chased;
        const result = matchDone ? calculateMatchResult(state, inningsList) : null;
        const progress = awardProgress(state.progress, outcome, userRole, result);
        const aiMemory = {
          userShots: userRole === "bat" ? [...state.aiMemory.userShots.slice(-(ARENA_CONFIG.aiMemoryLength - 1)), outcome.shot] : state.aiMemory.userShots,
          userBalls: userRole === "bowl" ? [...state.aiMemory.userBalls.slice(-(ARENA_CONFIG.aiMemoryLength - 1)), outcome.delivery] : state.aiMemory.userBalls,
          outcomes: [...state.aiMemory.outcomes.slice(-(ARENA_CONFIG.aiMemoryLength - 1)), outcome.code],
        };

        return {
          innings: inningsList,
          phase: "ballResult",
          afterBallPhase: matchDone ? "matchComplete" : firstDone ? "inningsComplete" : overDone ? "overComplete" : "awaitingSelection",
          lastOutcome: outcome,
          aiMemory,
          progress,
          result,
          commentary: { title: outcome.title, detail: outcome.detail },
        };
      }

      function calculateMatchResult(state, inningsList) {
        const first = inningsList[0];
        const second = inningsList[1];
        const humanBatFirst = first.battingSide === "human";
        const humanRuns = humanBatFirst ? first.runs : second.runs;
        const aiRuns = humanBatFirst ? second.runs : first.runs;
        if (humanRuns === aiRuns) {
          return { type: "tie", title: "Match tied.", margin: "Another Super Over awaits.", winner: "Tie", playerOfMatch: "Shared honours" };
        }
        const humanWin = humanRuns > aiRuns;
        const winnerTeam = humanWin ? state.setup.userTeam : state.setup.opponent;
        const margin = humanBatFirst === humanWin
          ? `${Math.abs(humanRuns - aiRuns)} run${Math.abs(humanRuns - aiRuns) === 1 ? "" : "s"}`
          : `${ARENA_CONFIG.maxWickets - second.wickets} wicket${ARENA_CONFIG.maxWickets - second.wickets === 1 ? "" : "s"}`;
        return {
          type: humanWin ? "win" : "loss",
          title: `${winnerTeam} won by ${margin}.`,
          margin,
          winner: winnerTeam,
          playerOfMatch: pickPlayerOfMatch(state, inningsList),
          lastBallWin: second.legalBalls >= state.maxBalls && Math.abs(humanRuns - aiRuns) <= 1,
        };
      }

      function pickPlayerOfMatch(state, inningsList) {
        const humanInnings = inningsList.find((item) => item.battingSide === "human");
        const aiInnings = inningsList.find((item) => item.battingSide === "ai");
        if ((humanInnings?.batter.runs || 0) >= (aiInnings?.batter.runs || 0)) return humanInnings?.batter.name || "Warrior Batter";
        return aiInnings?.batter.name || "CricKuru XI batter";
      }

      function ArenaPage() {
        return <KidsArenaPage />;
      }

      const KIDS_ARENA_MAX_BALLS = 6;
      const KIDS_ARENA_MAX_WICKETS = 2;
      const KIDS_ARENA_BOWL_TARGET = 18;

      const kidsBatOptions = [
        { id: "defend", label: "Defend", hint: "Safe shot", color: "cyan" },
        { id: "hit", label: "Hit", hint: "Good runs", color: "gold" },
        { id: "big", label: "Big Hit", hint: "Six chance", color: "crimson" },
      ];

      const kidsBowlOptions = [
        { id: "straight", label: "Straight", hint: "Safe ball", color: "cyan" },
        { id: "swing", label: "Swing", hint: "Wicket try", color: "gold" },
        { id: "surprise", label: "Surprise", hint: "Risky ball", color: "crimson" },
      ];

      function kidsArenaInitialState() {
        return {
          step: "toss",
          tossPick: "Heads",
          tossResult: "",
          tossWinner: "",
          role: "",
          score: 0,
          opponentScore: 0,
          wickets: 0,
          balls: 0,
          lastPlay: "",
          message: "Pick heads or tails, then toss the coin.",
          log: [],
          complete: false,
        };
      }

      function KidsArenaPage() {
        const [game, setGame] = useState(kidsArenaInitialState);

        const resetGame = () => setGame(kidsArenaInitialState());

        const pickToss = (pick) => {
          setGame((current) => ({ ...current, tossPick: pick, message: `You picked ${pick}. Toss the coin.` }));
        };

        const tossCoin = () => {
          const tossResult = Math.random() < 0.5 ? "Heads" : "Tails";
          const won = tossResult === game.tossPick;
          setGame((current) => ({
            ...current,
            step: "choice",
            tossResult,
            tossWinner: won ? "You" : "CricKuru Bot",
            message: won ? "You won the toss. Choose batting or bowling." : "Bot won the toss. For practice, you still choose batting or bowling.",
          }));
        };

        const chooseRole = (role) => {
          setGame((current) => ({
            ...current,
            step: "play",
            role,
            score: 0,
            opponentScore: 0,
            wickets: 0,
            balls: 0,
            lastPlay: "",
            complete: false,
            log: [],
            message: role === "bat" ? "Batting time. Tap one shot for each ball." : `Bowling time. Keep the bot under ${KIDS_ARENA_BOWL_TARGET} runs.`,
          }));
        };

        const finishText = (next) => {
          if (next.role === "bat") {
            if (next.score >= 20) return "Amazing batting. You made a huge score.";
            if (next.score >= 12) return "Good batting. The Warriors crowd is happy.";
            return "Nice try. Play again and go for more runs.";
          }
          if (next.opponentScore < KIDS_ARENA_BOWL_TARGET && next.wickets >= 1) return "Great bowling. You beat the bot.";
          if (next.opponentScore < KIDS_ARENA_BOWL_TARGET) return "Good control. You kept the bot quiet.";
          return "The bot scored fast. Try more straight balls.";
        };

        const playBall = (option) => {
          if (game.complete || game.step !== "play") return;

          const isBatting = game.role === "bat";
          const roll = Math.random();
          let runs = 0;
          let wicket = false;
          let lastPlay = "";

          if (isBatting) {
            if (option.id === "defend") {
              runs = roll < 0.14 ? 0 : roll < 0.72 ? 1 : 2;
              wicket = roll > 0.95;
            } else if (option.id === "hit") {
              runs = roll < 0.16 ? 0 : roll < 0.42 ? 1 : roll < 0.7 ? 2 : roll < 0.92 ? 4 : 6;
              wicket = roll > 0.96;
            } else {
              runs = roll < 0.16 ? 0 : roll < 0.32 ? 2 : roll < 0.58 ? 4 : roll < 0.84 ? 6 : 0;
              wicket = roll > 0.84;
            }
            lastPlay = wicket ? `${option.label}: Wicket` : `${option.label}: ${runs} run${runs === 1 ? "" : "s"}`;
          } else {
            if (option.id === "straight") {
              runs = roll < 0.26 ? 0 : roll < 0.68 ? 1 : roll < 0.9 ? 2 : 4;
              wicket = roll > 0.93;
            } else if (option.id === "swing") {
              runs = roll < 0.2 ? 0 : roll < 0.54 ? 1 : roll < 0.75 ? 2 : roll < 0.9 ? 4 : 0;
              wicket = roll > 0.86;
            } else {
              runs = roll < 0.2 ? 0 : roll < 0.42 ? 1 : roll < 0.62 ? 4 : roll < 0.8 ? 6 : 0;
              wicket = roll > 0.8;
            }
            lastPlay = wicket ? `${option.label}: Wicket` : `${option.label}: Bot scored ${runs}`;
          }

          setGame((current) => {
            const balls = current.balls + 1;
            const wickets = current.wickets + (wicket ? 1 : 0);
            const score = isBatting ? current.score + runs : current.score;
            const opponentScore = isBatting ? current.opponentScore : current.opponentScore + runs;
            const complete = balls >= KIDS_ARENA_MAX_BALLS || wickets >= KIDS_ARENA_MAX_WICKETS;
            const next = { ...current, balls, wickets, score, opponentScore, lastPlay, complete };
            return {
              ...next,
              message: complete ? finishText(next) : wicket ? "Big moment. The wicket fell." : "Good ball. Pick the next move.",
              log: [lastPlay, ...current.log].slice(0, 4),
            };
          });
        };

        return (
          <main className="route-bg page-grain min-h-screen px-3 pb-5 pt-32 sm:px-5 sm:pt-36">
            <section className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-5xl flex-col gap-3">
              <KidsArenaHeader step={game.step} />
              <div className="grid flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="grid gap-3">
                  {game.step === "toss" && <KidsTossCard game={game} onPick={pickToss} onToss={tossCoin} />}
                  {game.step === "choice" && <KidsRoleCard game={game} onChoose={chooseRole} onReset={resetGame} />}
                  {game.step === "play" && <KidsPlayCard game={game} onPlay={playBall} onReset={resetGame} />}
                </div>
                <KidsHowToCard role={game.role} step={game.step} />
              </div>
            </section>
          </main>
        );
      }

      function KidsArenaHeader({ step }) {
        const items = [
          ["toss", "1 Toss"],
          ["choice", "2 Bat/Bowl"],
          ["play", "3 Play"],
        ];

        return (
          <div className="rounded-[8px] border border-white/10 bg-night/78 p-3 backdrop-blur-xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.26em] text-gold">CricKuru Arena</p>
                <h1 className="font-display text-4xl font-black uppercase leading-none text-white sm:text-6xl">Kids Cricket Game</h1>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {items.map(([id, label]) => (
                  <span key={id} className={`rounded-full border px-3 py-2 text-center text-[0.65rem] font-black uppercase tracking-[0.12em] ${step === id ? "border-gold/60 bg-gold/14 text-gold" : "border-white/12 bg-white/5 text-white/48"}`}>
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );
      }

      function KidsTossCard({ game, onPick, onToss }) {
        return (
          <motion.div className="glass grid min-h-[58vh] content-center gap-5 rounded-[8px] p-4 text-center sm:p-6" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mx-auto grid h-24 w-24 place-items-center rounded-full border-4 border-gold bg-gradient-to-br from-gold to-crimson font-display text-3xl font-black text-night shadow-[0_0_50px_rgba(244,185,66,0.22)]">
              {game.tossPick[0]}
            </div>
            <div>
              <h2 className="font-display text-5xl font-black uppercase leading-none text-white">Toss Time</h2>
              <p className="mx-auto mt-3 max-w-lg text-base leading-7 text-white/65">{game.message}</p>
            </div>
            <div className="mx-auto grid w-full max-w-md grid-cols-2 gap-3">
              {["Heads", "Tails"].map((pick) => (
                <button key={pick} type="button" onClick={() => onPick(pick)} className={`min-h-14 rounded-[8px] border text-lg font-black uppercase tracking-[0.12em] ${game.tossPick === pick ? "border-gold bg-gold text-night" : "border-white/12 bg-white/7 text-white"}`}>
                  {pick}
                </button>
              ))}
            </div>
            <button type="button" onClick={onToss} className="shine-button mx-auto min-h-14 w-full max-w-md rounded-full bg-gold px-6 text-sm font-black uppercase tracking-[0.18em] text-night">
              Toss Coin
            </button>
          </motion.div>
        );
      }

      function KidsRoleCard({ game, onChoose, onReset }) {
        return (
          <motion.div className="glass grid min-h-[58vh] content-center gap-5 rounded-[8px] p-4 text-center sm:p-6" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.26em] text-cyan">{game.tossResult} - {game.tossWinner} won</p>
              <h2 className="mt-3 font-display text-5xl font-black uppercase leading-none text-white">Choose Your Turn</h2>
              <p className="mx-auto mt-3 max-w-lg text-base leading-7 text-white/65">{game.message}</p>
            </div>
            <div className="mx-auto grid w-full max-w-xl gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => onChoose("bat")} className="min-h-24 rounded-[8px] border border-gold/45 bg-gold/14 p-4 text-left text-gold">
                <span className="font-display text-4xl font-black uppercase">Batting</span>
                <span className="mt-2 block text-sm font-bold text-white/70">Tap shots and score in 6 balls.</span>
              </button>
              <button type="button" onClick={() => onChoose("bowl")} className="min-h-24 rounded-[8px] border border-cyan/45 bg-cyan/10 p-4 text-left text-cyan">
                <span className="font-display text-4xl font-black uppercase">Bowling</span>
                <span className="mt-2 block text-sm font-bold text-white/70">Tap deliveries and stop the bot.</span>
              </button>
            </div>
            <button type="button" onClick={onReset} className="mx-auto min-h-11 rounded-full border border-white/15 bg-white/7 px-5 text-sm font-black uppercase tracking-[0.14em] text-white/72">
              Toss Again
            </button>
          </motion.div>
        );
      }

      function KidsPlayCard({ game, onPlay, onReset }) {
        const isBatting = game.role === "bat";
        const options = isBatting ? kidsBatOptions : kidsBowlOptions;
        const resultLine = isBatting
          ? `You scored ${game.score}/${game.wickets} in ${game.balls} ball${game.balls === 1 ? "" : "s"}.`
          : `Bot scored ${game.opponentScore}/${game.wickets}. Target: under ${KIDS_ARENA_BOWL_TARGET}.`;

        return (
          <motion.div className="grid gap-3" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
            <div className="glass rounded-[8px] p-3 sm:p-4">
              <div className="grid gap-2 sm:grid-cols-4">
                <KidsScore label="Mode" value={isBatting ? "Bat" : "Bowl"} />
                <KidsScore label="Balls" value={`${game.balls}/${KIDS_ARENA_MAX_BALLS}`} />
                <KidsScore label={isBatting ? "Runs" : "Bot"} value={isBatting ? game.score : game.opponentScore} highlight />
                <KidsScore label="Wickets" value={`${game.wickets}/${KIDS_ARENA_MAX_WICKETS}`} />
              </div>
            </div>

            <KidsMiniField game={game} />

            <div className="glass rounded-[8px] p-3 sm:p-4">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-gold">{game.complete ? "Over finished" : "Tap one button"}</p>
                  <h2 className="font-display text-3xl font-black uppercase text-white sm:text-4xl">{game.complete ? "Game Result" : isBatting ? "Choose a Shot" : "Choose a Ball"}</h2>
                </div>
                <p className="rounded-[8px] border border-white/10 bg-night/55 px-3 py-2 text-sm font-bold text-white/70">{resultLine}</p>
              </div>

              <p className="mb-3 rounded-[8px] border border-white/10 bg-white/[0.035] p-3 text-sm font-semibold leading-6 text-white/68">
                {game.message}
              </p>

              {game.complete ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <button type="button" onClick={onReset} className="shine-button min-h-14 rounded-full bg-gold px-6 text-sm font-black uppercase tracking-[0.18em] text-night">Play Again</button>
                  <a href={CricLinks.matches} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-14 items-center justify-center rounded-full border border-white/15 bg-white/7 px-6 text-sm font-black uppercase tracking-[0.18em] text-white/72">Real Matches</a>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {options.map((option) => <KidsArenaButton key={option.id} option={option} onClick={() => onPlay(option)} />)}
                </div>
              )}
            </div>
          </motion.div>
        );
      }

      function KidsMiniField({ game }) {
        const ballProgress = `${Math.min(94, 8 + game.balls * 14)}%`;
        return (
          <div className="relative min-h-[210px] overflow-hidden rounded-[8px] border border-white/12 bg-[radial-gradient(circle_at_50%_0%,rgba(244,185,66,0.16),transparent_28%),linear-gradient(180deg,#080D16,#05070B)] sm:min-h-[260px]">
            <div className="absolute inset-x-0 bottom-5 mx-auto h-40 w-[88%] rounded-[50%] border border-gold/20 bg-[radial-gradient(ellipse_at_center,rgba(244,185,66,0.18),rgba(8,13,22,0.55)_48%,transparent_72%)]" />
            <div className="absolute bottom-12 left-1/2 h-36 w-20 -translate-x-1/2 rounded-full border border-gold/35 bg-gradient-to-b from-[#b68a3c] to-[#4d3517]" />
            <div className="absolute bottom-24 left-[20%] text-center">
              <div className="mx-auto h-16 w-9 rounded-full bg-black" />
              <p className="mt-2 text-[0.6rem] font-black uppercase tracking-[0.14em] text-white/48">Bowler</p>
            </div>
            <div className="absolute bottom-20 right-[18%] text-center">
              <div className="mx-auto h-20 w-10 rounded-full bg-black" />
              <span className="absolute right-1 top-2 h-20 w-2 rotate-[-28deg] rounded-full bg-gold/70" />
              <p className="mt-2 text-[0.6rem] font-black uppercase tracking-[0.14em] text-white/48">Batter</p>
            </div>
            <motion.div className="absolute bottom-[42%] h-4 w-4 rounded-full bg-crimson shadow-[0_0_20px_rgba(183,25,50,0.9)]" animate={{ left: ballProgress }} transition={{ duration: 0.35, ease: "easeOut" }} />
            <div className="absolute left-3 right-3 top-3 rounded-[8px] border border-white/10 bg-night/72 p-3 text-center backdrop-blur">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-white/42">Last ball</p>
              <p className="font-display text-3xl font-black uppercase text-white">{game.lastPlay || "Ready"}</p>
            </div>
          </div>
        );
      }

      function KidsArenaButton({ option, onClick }) {
        const tones = {
          gold: "border-gold/50 bg-gold/14 text-gold",
          cyan: "border-cyan/50 bg-cyan/10 text-cyan",
          crimson: "border-crimson/50 bg-crimson/12 text-crimson",
        };
        return (
          <button type="button" onClick={onClick} className={`min-h-20 rounded-[8px] border p-2 text-center ${tones[option.color] || tones.gold}`}>
            <span className="block font-display text-2xl font-black uppercase leading-none sm:text-3xl">{option.label}</span>
            <span className="mt-1 block text-[0.65rem] font-bold uppercase tracking-[0.08em] text-white/58">{option.hint}</span>
          </button>
        );
      }

      function KidsScore({ label, value, highlight }) {
        return (
          <div className="rounded-[8px] border border-white/10 bg-white/[0.04] p-3 text-center">
            <p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-white/42">{label}</p>
            <p className={`font-display text-3xl font-black uppercase ${highlight ? "text-gold" : "text-white"}`}>{value}</p>
          </div>
        );
      }

      function KidsHowToCard({ step, role }) {
        const lines = step === "toss"
          ? ["Pick Heads or Tails.", "Tap Toss Coin.", "Next choose Batting or Bowling."]
          : step === "choice"
            ? ["Batting means score runs.", "Bowling means stop the bot.", "Both games use big tap buttons."]
            : role === "bat"
              ? ["Tap Defend for safety.", "Tap Hit for boundaries.", "Tap Big Hit for sixes but more risk."]
              : ["Tap Straight for control.", "Tap Swing for wickets.", "Tap Surprise for risk and reward."];

        return (
          <aside className="glass rounded-[8px] p-4 lg:sticky lg:top-24 lg:self-start">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan">How to play</p>
            <h2 className="mt-2 font-display text-3xl font-black uppercase text-white">No keyboard needed</h2>
            <div className="mt-4 grid gap-2">
              {lines.map((line, index) => (
                <div key={line} className="flex gap-3 rounded-[8px] border border-white/10 bg-white/[0.035] p-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gold font-black text-night">{index + 1}</span>
                  <p className="text-sm font-semibold leading-6 text-white/68">{line}</p>
                </div>
              ))}
            </div>
          </aside>
        );
      }

      function ArenaHeader({ progress, onHelp, state, dispatch }) {
        return (
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.32em] text-gold">CricKuru Arena</p>
              <h1 className="font-display text-5xl font-black uppercase leading-none text-white sm:text-7xl">Tactical Cricket Duel</h1>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={onHelp} className="min-h-11 rounded-full border border-white/15 bg-white/7 px-5 text-sm font-black uppercase tracking-[0.14em] text-white/80 hover:border-gold/50 hover:text-gold">
                Controls
              </button>
              <button type="button" onClick={() => dispatch({ type: "SETTINGS", key: "sound", value: !state.settings.sound })} className="min-h-11 rounded-full border border-white/15 bg-white/7 px-5 text-sm font-black uppercase tracking-[0.14em] text-white/80 hover:border-gold/50 hover:text-gold">
                Sound {state.settings.sound ? "On" : "Off"}
              </button>
              <div className="glass rounded-full px-5 py-3 text-sm font-bold text-white/70">
                Level <span className="text-gold">{progress.level}</span> | XP <span className="text-cyan">{progress.xp}</span>
              </div>
            </div>
          </div>
        );
      }

      function ArenaMenu({ arena }) {
        const { state, dispatch, startToss, selectedBatter, selectedBowler } = arena;
        const batterOptions = ARENA_PLAYERS.filter((player) => ["batter", "allrounder", "keeper"].includes(player.type));
        const bowlerOptions = ARENA_PLAYERS.filter((player) => ["bowler", "allrounder"].includes(player.type));

        return (
          <motion.div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]" initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, ease }}>
            <div className="glass rounded-[8px] p-6">
              <h2 className="font-display text-5xl font-black uppercase text-white">Match Setup</h2>
              <p className="mt-3 leading-7 text-white/64">Pick a fast format and play. The Arena now keeps choices short so the game fits every screen.</p>
              <div className="mt-7 grid gap-5">
                <OptionGroup label="Game mode" value={state.setup.mode} options={COMPACT_MODE_OPTIONS.map((value) => ({ value, label: ARENA_MODES[value].label }))} onChange={(value) => dispatch({ type: "SETUP", key: "mode", value })} />
                <OptionGroup label="Difficulty" value={state.setup.difficulty} options={COMPACT_DIFFICULTY_OPTIONS.map((value) => ({ value, label: ARENA_DIFFICULTIES[value].label }))} onChange={(value) => dispatch({ type: "SETUP", key: "difficulty", value })} />
                <OptionGroup label="Pitch" value={state.setup.pitch} options={COMPACT_PITCH_OPTIONS.map((value) => ({ value, label: PITCHES[value].label }))} onChange={(value) => dispatch({ type: "SETUP", key: "pitch", value })} />
                <OptionGroup label="Bowler type" value={state.setup.bowlerType} options={Object.entries(BOWLER_TYPES).slice(0, 3).map(([value, item]) => ({ value, label: item.label }))} onChange={(value) => dispatch({ type: "SETUP", key: "bowlerType", value })} />
              </div>
              <button type="button" onClick={startToss} className="shine-button mt-8 inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-gold px-7 text-sm font-black uppercase tracking-[0.18em] text-night">
                Start Toss <Icon.Play size={18} />
              </button>
            </div>
            <div className="grid gap-5">
              <div className="glass rounded-[8px] p-6">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan">Team Sheet</p>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <PlayerSelect label="Starting batter" value={state.setup.batterId} players={batterOptions} onChange={(value) => dispatch({ type: "SETUP", key: "batterId", value })} />
                  <PlayerSelect label="Starting bowler" value={state.setup.bowlerId} players={bowlerOptions} onChange={(value) => dispatch({ type: "SETUP", key: "bowlerId", value })} />
                </div>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <PlayerCard player={selectedBatter} title="Selected Batter" stats={["power", "timing", "technique", "composure"]} />
                <PlayerCard player={selectedBowler} title="Selected Bowler" stats={["pace", "accuracy", "swing", "spin"]} />
              </div>
            </div>
          </motion.div>
        );
      }

      function OptionGroup({ label, value, options, onChange }) {
        return (
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-white/48">{label}</p>
            <div className="flex flex-wrap gap-2">
              {options.map((option) => (
                <button key={option.value} type="button" onClick={() => onChange(option.value)} className={`min-h-11 rounded-full border px-4 text-sm font-bold transition ${value === option.value ? "border-gold/70 bg-gold/14 text-gold" : "border-white/12 bg-white/6 text-white/68 hover:border-white/28 hover:text-white"}`}>
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        );
      }

      function PlayerSelect({ label, value, players, onChange }) {
        const fieldName = `arena-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;

        return (
          <label className="block" htmlFor={fieldName}>
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-white/48">{label}</span>
            <select id={fieldName} name={fieldName} value={value} onChange={(event) => onChange(event.target.value)} className="min-h-12 w-full rounded-[8px] border border-white/12 bg-night px-4 text-white">
              {players.map((player) => <option key={player.id} value={player.id}>{player.name} - {player.role}</option>)}
            </select>
          </label>
        );
      }

      function PlayerCard({ player, title, stats }) {
        return (
          <article className="glass rounded-[8px] p-5">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-gold">{title}</p>
            <h3 className="mt-2 font-display text-3xl font-black uppercase text-white">{player.name}</h3>
            <p className="text-sm font-semibold text-white/48">{player.role}</p>
            <div className="mt-5 grid gap-3">
              {stats.map((stat) => (
                <div key={stat}>
                  <div className="mb-1 flex justify-between text-xs uppercase tracking-[0.15em] text-white/50"><span>{stat}</span><span>{player[stat] || 50}</span></div>
                  <div className="h-2 rounded-full bg-white/8"><div className="h-full rounded-full bg-gradient-to-r from-gold to-cyan" style={{ width: `${player[stat] || 50}%` }} /></div>
                </div>
              ))}
            </div>
          </article>
        );
      }

      function TossScreen({ arena }) {
        const { state, startMatch } = arena;
        const humanWon = state.toss?.winner === "human";
        return (
          <motion.div className="glass mx-auto max-w-3xl rounded-[8px] p-8 text-center" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
            <motion.div className="mx-auto grid h-28 w-28 place-items-center rounded-full border-4 border-gold bg-gradient-to-br from-gold to-crimson font-display text-4xl font-black text-night shadow-[0_0_60px_rgba(244,185,66,0.28)]" animate={{ rotateY: [0, 720], y: [0, -18, 0] }} transition={{ duration: 1.4, ease }}>
              {state.toss?.coin?.[0]}
            </motion.div>
            <h2 className="mt-7 font-display text-5xl font-black uppercase text-white">{humanWon ? "You won the toss" : "CricKuru XI won the toss"}</h2>
            <p className="mt-3 text-white/64">{state.pitch.label}. {humanWon ? "Choose your first move." : `AI chooses to ${state.toss?.aiChoice} first.`}</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              {humanWon ? (
                <>
                  <button type="button" onClick={() => startMatch("bat")} className="shine-button min-h-12 rounded-full bg-gold px-7 text-sm font-black uppercase tracking-[0.16em] text-night">Bat First</button>
                  <button type="button" onClick={() => startMatch("bowl")} className="min-h-12 rounded-full border border-white/15 bg-white/8 px-7 text-sm font-black uppercase tracking-[0.16em] text-white hover:border-gold/60 hover:text-gold">Bowl First</button>
                </>
              ) : (
                <button type="button" onClick={() => startMatch()} className="shine-button min-h-12 rounded-full bg-gold px-7 text-sm font-black uppercase tracking-[0.16em] text-night">Enter the Arena</button>
              )}
            </div>
          </motion.div>
        );
      }

      function InningsIntro({ arena }) {
        const { state, startBallSelection } = arena;
        const innings = currentInnings(state);
        return (
          <motion.div className="glass mx-auto max-w-4xl rounded-[8px] p-8" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-xs font-black uppercase tracking-[0.26em] text-cyan">Innings {state.inningsIndex + 1}</p>
            <h2 className="mt-3 font-display text-6xl font-black uppercase leading-none text-white">{innings.team} batting</h2>
            <div className="gold-divider my-6" />
            <p className="text-lg leading-8 text-white/68">{state.target ? `${innings.team} need ${state.target} to win.` : "Set the tone. The first innings decides the chase."}</p>
            <button type="button" onClick={startBallSelection} className="shine-button mt-8 min-h-14 rounded-full bg-gold px-8 text-sm font-black uppercase tracking-[0.18em] text-night">First Delivery</button>
          </motion.div>
        );
      }

      function ArenaGameplay({ arena }) {
        const { state } = arena;
        const innings = currentInnings(state);
        const isHumanBatting = innings.battingSide === "human";
        return (
          <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="grid gap-5">
              <MatchScoreboard state={state} />
              <StadiumGameScene state={state} isHumanBatting={isHumanBatting} />
              {state.phase === "overComplete" ? <OverCompleteCard arena={arena} /> : isHumanBatting ? <BattingControls arena={arena} /> : <BowlingControls arena={arena} />}
            </div>
            <div className="grid gap-5 content-start">
              <CommentaryPanel state={state} />
              <FieldMap field={isHumanBatting ? state.currentDelivery?.field || "balanced" : state.bowlingSelection.field} />
              <ProgressPanel progress={state.progress} />
            </div>
          </div>
        );
      }

      function MatchScoreboard({ state }) {
        const innings = currentInnings(state);
        const required = state.target ? Math.max(0, state.target - innings.runs) : null;
        const ballsLeft = state.maxBalls - innings.legalBalls;
        return (
          <div className="glass rounded-[8px] p-4">
            <div className="grid gap-3 md:grid-cols-5">
              <ScoreStat label="Batting" value={innings.team} />
              <ScoreStat label="Score" value={`${innings.runs}/${innings.wickets}`} highlight />
              <ScoreStat label="Overs" value={`${formatOvers(innings.legalBalls)} / ${formatOvers(state.maxBalls)}`} />
              <ScoreStat label="Run Rate" value={runRate(innings.runs, innings.legalBalls)} />
              <ScoreStat label={state.target ? "Need" : "Target"} value={state.target ? `${required} from ${ballsLeft}` : "Set"} highlight={Boolean(state.target)} />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <p className="rounded-[8px] bg-white/[0.045] p-3 text-sm text-white/65">Striker: <span className="font-bold text-white">{innings.batter.name}</span> {innings.batter.runs}({innings.batter.balls})</p>
              <p className="rounded-[8px] bg-white/[0.045] p-3 text-sm text-white/65">Bowler: <span className="font-bold text-white">{innings.bowler.name}</span> {formatOvers(innings.bowler.legalBalls)}-{innings.bowler.runs}-{innings.bowler.wickets}</p>
              <RecentBalls balls={innings.recent} />
            </div>
          </div>
        );
      }

      function ScoreStat({ label, value, highlight }) {
        return (
          <div className="rounded-[8px] border border-white/10 bg-white/[0.04] p-3">
            <p className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-white/42">{label}</p>
            <p className={`mt-1 font-display text-2xl font-black uppercase ${highlight ? "text-gold" : "text-white"}`}>{value}</p>
          </div>
        );
      }

      function RecentBalls({ balls }) {
        return (
          <div className="flex items-center gap-2 rounded-[8px] bg-white/[0.045] p-3">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-white/40">Recent</span>
            <div className="flex flex-wrap gap-1">
              {(balls.length ? balls : ["-"]).map((ball, index) => (
                <span key={`${ball}-${index}`} className={`grid h-7 min-w-7 place-items-center rounded-full px-2 text-xs font-black ${ball === "W" ? "bg-crimson text-white" : ball === "4" || ball === "6" ? "bg-gold text-night" : "bg-white/10 text-white/72"}`}>{ball}</span>
              ))}
            </div>
          </div>
        );
      }

      function StadiumGameScene({ state, isHumanBatting }) {
        const outcome = state.lastOutcome;
        const dramatic = outcome?.runs === 6 || outcome?.wicket;
        return (
          <div className={`relative min-h-[260px] overflow-hidden rounded-[8px] border border-white/12 bg-[radial-gradient(circle_at_50%_0%,rgba(244,185,66,0.14),transparent_24%),linear-gradient(180deg,#080D16,#05070B)] sm:min-h-[320px] lg:min-h-[360px] ${dramatic && state.settings.shake ? "animate-pulse" : ""}`}>
            <div className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_20%_0%,rgba(245,247,250,0.18),transparent_26%),radial-gradient(circle_at_78%_0%,rgba(244,185,66,0.2),transparent_24%)]" />
            <div className="absolute inset-x-0 top-16 h-20 opacity-45" style={{ background: "repeating-linear-gradient(90deg, rgba(245,247,250,.14) 0 5px, transparent 5px 22px)" }} />
            <div className="absolute bottom-8 left-1/2 h-56 w-[min(760px,88vw)] -translate-x-1/2 rounded-[50%] border border-gold/20 bg-[radial-gradient(ellipse_at_center,rgba(244,185,66,0.2),rgba(8,13,22,0.45)_45%,transparent_70%)]" />
            <div className="absolute bottom-10 left-1/2 h-64 w-28 -translate-x-1/2 rounded-full border border-gold/35 bg-gradient-to-b from-[#b68a3c] to-[#4d3517] shadow-[0_0_42px_rgba(244,185,66,0.16)]" />
            <div className="absolute bottom-28 left-1/2 h-16 w-16 -translate-x-1/2 rounded-full border border-white/20 bg-white/8" />
            <PlayerSilhouette className="absolute bottom-24 left-[28%]" label={isHumanBatting ? "AI Bowler" : "Your Bowler"} />
            <PlayerSilhouette className="absolute bottom-20 right-[27%] scale-110" label={isHumanBatting ? "You Bat" : "AI Bat"} bat />
            <motion.div className="absolute h-4 w-4 rounded-full bg-crimson shadow-[0_0_22px_rgba(183,25,50,0.9)]" animate={state.phase === "awaitingTiming" || state.phase === "deliveryRunning" ? { left: ["29%", "52%", "71%"], bottom: ["42%", "35%", "30%"] } : { left: "52%", bottom: "35%" }} transition={{ duration: 1.2, repeat: state.phase === "awaitingTiming" || state.phase === "deliveryRunning" ? Infinity : 0, ease: "easeInOut" }} />
            {outcome && (
              <motion.div className="absolute left-1/2 top-8 w-[min(520px,88%)] -translate-x-1/2 rounded-[8px] border border-gold/30 bg-night/82 p-4 text-center backdrop-blur-xl" initial={{ opacity: 0, y: -18 }} animate={{ opacity: 1, y: 0 }}>
                <p className="font-display text-4xl font-black uppercase text-gold">{outcome.code === DOT_BALL ? "Dot" : outcome.code}</p>
                <p className="text-sm font-semibold text-white/76">{outcome.title}</p>
              </motion.div>
            )}
          </div>
        );
      }

      function PlayerSilhouette({ className, label, bat }) {
        return (
          <div className={`${className} text-center`}>
            <div className="relative mx-auto h-28 w-16">
              {bat && <span className="absolute -right-4 top-6 h-24 w-2 rotate-[-28deg] rounded-full bg-gold/70" />}
              <span className="absolute left-1/2 top-0 h-8 w-8 -translate-x-1/2 rounded-full bg-black" />
              <span className="absolute left-1/2 top-8 h-12 w-9 -translate-x-1/2 rounded-full bg-black" />
              <span className="absolute bottom-0 left-5 h-12 w-3 -rotate-12 rounded-full bg-black" />
              <span className="absolute bottom-0 right-5 h-12 w-3 rotate-12 rounded-full bg-black" />
            </div>
            <p className="mt-2 text-[0.65rem] font-black uppercase tracking-[0.16em] text-white/50">{label}</p>
          </div>
        );
      }

      function BattingControls({ arena }) {
        const { state, dispatch, startHumanBattingDelivery, playHumanShot, continueAfterBall } = arena;
        return (
          <div className="glass rounded-[8px] p-5">
            <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-gold">Batting controls</p>
                <h3 className="font-display text-3xl font-black uppercase text-white">Pick the shot, then time it</h3>
              </div>
              {state.phase === "awaitingTiming" && <TimingMeter start={state.meterStart} cycle={ARENA_CONFIG.timingCycleMs} type="timing" />}
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <ControlGroup label="Direction" options={COMPACT_BAT_DIRECTIONS} value={state.battingSelection.direction} onChange={(value) => dispatch({ type: "BATTING", key: "direction", value })} />
              <ControlGroup label="Shot type" options={COMPACT_SHOT_TYPES} value={state.battingSelection.shotType} onChange={(value) => dispatch({ type: "BATTING", key: "shotType", value })} />
              <ControlGroup label="Footwork" options={COMPACT_FOOTWORK} value={state.battingSelection.footwork} onChange={(value) => dispatch({ type: "BATTING", key: "footwork", value })} />
              <ControlGroup label="Aggression" options={COMPACT_AGGRESSION} value={state.battingSelection.aggression} onChange={(value) => dispatch({ type: "BATTING", key: "aggression", value })} />
            </div>
            <ActionRow phase={state.phase} startLabel="Start AI Delivery" actionLabel="Play Shot" onStart={startHumanBattingDelivery} onAction={playHumanShot} onContinue={continueAfterBall} />
          </div>
        );
      }

      function BowlingControls({ arena }) {
        const { state, dispatch, startHumanBowlingDelivery, stopBowlingAccuracy, continueAfterBall } = arena;
        const bowlerType = BOWLER_TYPES[state.bowlingSelection.bowlerType];
        const variations = bowlerType.variations.slice(0, 4);
        const paceOptions = bowlerType.paceOptions.slice(0, 3);
        return (
          <div className="glass rounded-[8px] p-5">
            <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-gold">Bowling controls</p>
                <h3 className="font-display text-3xl font-black uppercase text-white">Set the trap, then nail accuracy</h3>
              </div>
              {state.phase === "deliveryRunning" && <TimingMeter start={state.meterStart} cycle={ARENA_CONFIG.accuracyCycleMs} type="accuracy" />}
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <ControlGroup label="Bowler type" options={Object.keys(BOWLER_TYPES).slice(0, 3)} value={state.bowlingSelection.bowlerType} labelFor={(value) => BOWLER_TYPES[value].label} onChange={(value) => dispatch({ type: "BOWLING", key: "bowlerType", value })} />
              <ControlGroup label="Variation" options={variations} value={state.bowlingSelection.variation} onChange={(value) => dispatch({ type: "BOWLING", key: "variation", value })} />
              <ControlGroup label="Line" options={COMPACT_LINES} value={state.bowlingSelection.line} onChange={(value) => dispatch({ type: "BOWLING", key: "line", value })} />
              <ControlGroup label="Length" options={COMPACT_LENGTHS} value={state.bowlingSelection.length} onChange={(value) => dispatch({ type: "BOWLING", key: "length", value })} />
              <ControlGroup label="Pace" options={paceOptions} value={state.bowlingSelection.pace} onChange={(value) => dispatch({ type: "BOWLING", key: "pace", value })} />
            </div>
            <div className="mt-4">
              <ControlGroup label="Field preset" options={COMPACT_FIELDS} value={state.bowlingSelection.field} labelFor={(value) => FIELD_PRESETS[value].label} onChange={(value) => dispatch({ type: "BOWLING", key: "field", value })} />
            </div>
            <ActionRow phase={state.phase} startLabel="Lock Delivery" actionLabel="Stop Accuracy" onStart={startHumanBowlingDelivery} onAction={stopBowlingAccuracy} onContinue={continueAfterBall} />
          </div>
        );
      }

      function ControlGroup({ label, options, value, onChange, labelFor }) {
        return (
          <div>
            <p className="mb-2 text-[0.65rem] font-black uppercase tracking-[0.18em] text-white/42">{label}</p>
            <div className="flex max-h-40 flex-wrap gap-2 overflow-auto pr-1">
              {options.map((option) => (
                <button key={option} type="button" onClick={() => onChange(option)} className={`min-h-11 rounded-full border px-3 text-xs font-black uppercase tracking-[0.08em] transition ${value === option ? "border-gold/70 bg-gold/16 text-gold" : "border-white/12 bg-white/6 text-white/62 hover:border-white/25 hover:text-white"}`}>
                  {labelFor ? labelFor(option) : option}
                </button>
              ))}
            </div>
          </div>
        );
      }

      function TimingMeter({ start, cycle, type }) {
        const [value, setValue] = useState(0);
        useEffect(() => {
          const id = window.setInterval(() => setValue(getMeterValue(start, cycle)), 32);
          return () => window.clearInterval(id);
        }, [start, cycle]);
        return (
          <div className="w-full max-w-xs">
            <div className="mb-1 flex justify-between text-[0.65rem] font-black uppercase tracking-[0.16em] text-white/42"><span>{type === "timing" ? "Timing" : "Accuracy"}</span><span>{Math.round(value)}</span></div>
            <div className="relative h-4 overflow-hidden rounded-full bg-white/10">
              <span className="absolute left-[44%] top-0 h-full w-[16%] bg-gold/35" />
              <span className="absolute top-0 h-full w-1 rounded-full bg-white shadow-[0_0_16px_rgba(255,255,255,.8)]" style={{ left: `${value}%` }} />
            </div>
          </div>
        );
      }

      function ActionRow({ phase, startLabel, actionLabel, onStart, onAction, onContinue }) {
        return (
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            {phase === "awaitingSelection" && <button type="button" onClick={onStart} className="shine-button min-h-13 rounded-full bg-gold px-7 text-sm font-black uppercase tracking-[0.16em] text-night">{startLabel}</button>}
            {(phase === "awaitingTiming" || phase === "deliveryRunning") && <button type="button" onClick={onAction} className="shine-button min-h-13 rounded-full bg-gold px-7 text-sm font-black uppercase tracking-[0.16em] text-night">{actionLabel}</button>}
            {phase === "ballResult" && <button type="button" onClick={onContinue} className="min-h-13 rounded-full border border-gold/40 bg-white/8 px-7 text-sm font-black uppercase tracking-[0.16em] text-gold">Continue</button>}
          </div>
        );
      }

      function CommentaryPanel({ state }) {
        const outcome = state.lastOutcome;
        return (
          <aside className="glass rounded-[8px] p-5">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan">Commentary</p>
            <h3 className="mt-3 font-display text-3xl font-black uppercase text-white">{state.commentary.title}</h3>
            <p className="mt-3 text-sm leading-7 text-white/66">{state.commentary.detail}</p>
            {outcome && (
              <div className="mt-5 rounded-[8px] border border-white/10 bg-night/58 p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-gold">Tactical breakdown</p>
                <ul className="mt-3 grid gap-2 text-sm text-white/68">
                  {outcome.tactical.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            )}
          </aside>
        );
      }

      function FieldMap({ field }) {
        const preset = FIELD_PRESETS[field] || FIELD_PRESETS.balanced;
        const positions = [[50, 12], [30, 25], [70, 25], [20, 55], [80, 55], [35, 78], [65, 78], [50, 50]];
        return (
          <div className="glass rounded-[8px] p-5">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-gold">Field: {preset.label}</p>
            <div className="relative mx-auto mt-4 aspect-square max-w-[230px] rounded-full border border-gold/30 bg-[radial-gradient(circle,rgba(244,185,66,.16),rgba(255,255,255,.04)_45%,transparent_68%)]">
              {positions.map(([left, top], index) => <span key={index} className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70" style={{ left: `${left}%`, top: `${top}%` }} />)}
              <span className="absolute left-1/2 top-1/2 h-10 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/80" />
            </div>
            <p className="mt-4 text-sm text-white/60">{preset.zone}. Catch {preset.catch >= 0 ? "+" : ""}{Math.round(preset.catch * 100)}%, boundary {preset.boundary >= 0 ? "+" : ""}{Math.round(preset.boundary * 100)}%.</p>
          </div>
        );
      }

      function ProgressPanel({ progress }) {
        const strikeRate = progress.batting.balls ? ((progress.batting.runs / progress.batting.balls) * 100).toFixed(1) : "0.0";
        const economy = progress.bowling.legalBalls ? ((progress.bowling.runs / progress.bowling.legalBalls) * 6).toFixed(2) : "0.00";
        return (
          <div className="glass rounded-[8px] p-5">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-gold">Guest Progress</p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <MiniStat label="W-L-T" value={`${progress.wins}-${progress.losses}-${progress.ties}`} />
              <MiniStat label="Streak" value={progress.streak} />
              <MiniStat label="Runs" value={progress.batting.runs} />
              <MiniStat label="SR" value={strikeRate} />
              <MiniStat label="Wickets" value={progress.bowling.wickets} />
              <MiniStat label="Economy" value={economy} />
            </div>
            <p className="mt-4 text-xs leading-6 text-white/48">Saved locally for guest users. Hostinger backend can replace this later for logged-in leaderboards.</p>
          </div>
        );
      }

      function MiniStat({ label, value }) {
        return <div className="rounded-[8px] bg-white/[0.045] p-3"><p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-white/38">{label}</p><p className="font-display text-2xl font-black text-white">{value}</p></div>;
      }

      function OverCompleteCard({ arena }) {
        const innings = currentInnings(arena.state);
        return (
          <div className="glass rounded-[8px] p-6 text-center">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-gold">Over Complete</p>
            <h3 className="font-display text-5xl font-black uppercase text-white">{innings.runs}/{innings.wickets} after {formatOvers(innings.legalBalls)}</h3>
            <button type="button" onClick={arena.startBallSelection} className="shine-button mt-5 min-h-12 rounded-full bg-gold px-7 text-sm font-black uppercase tracking-[0.16em] text-night">Next Over</button>
          </div>
        );
      }

      function InningsTransition({ arena }) {
        const first = arena.state.innings[0];
        return (
          <motion.div className="glass mx-auto max-w-4xl rounded-[8px] p-8 text-center" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-xs font-black uppercase tracking-[0.26em] text-cyan">Innings complete</p>
            <h2 className="mt-3 font-display text-6xl font-black uppercase text-white">{first.team} made {first.runs}/{first.wickets}</h2>
            <p className="mt-4 text-lg text-white/68">Target: <span className="font-black text-gold">{first.runs + 1}</span>. Top batter: {first.batter.name} {first.batter.runs}({first.batter.balls}).</p>
            <button type="button" onClick={arena.startSecondInnings} className="shine-button mt-8 min-h-14 rounded-full bg-gold px-8 text-sm font-black uppercase tracking-[0.18em] text-night">Start Chase</button>
          </motion.div>
        );
      }

      function MatchResult({ arena }) {
        const { state, resetMatch } = arena;
        const first = state.innings[0];
        const second = state.innings[1];
        const result = state.result;
        return (
          <motion.div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
            <div className="glass rounded-[8px] p-8">
              <p className="text-xs font-black uppercase tracking-[0.26em] text-gold">Match Result</p>
              <h2 className="mt-3 font-display text-6xl font-black uppercase leading-none text-white">{result?.title || "Match complete"}</h2>
              <p className="mt-5 text-lg text-white/68">Player of the match: <span className="text-gold">{result?.playerOfMatch}</span></p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <MiniStat label={first.team} value={`${first.runs}/${first.wickets}`} />
                <MiniStat label={second.team} value={`${second.runs}/${second.wickets}`} />
              </div>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={resetMatch} className="shine-button min-h-12 rounded-full bg-gold px-7 text-sm font-black uppercase tracking-[0.16em] text-night">Rematch</button>
                <Link to="/" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/15 bg-white/8 px-7 text-sm font-black uppercase tracking-[0.16em] text-white hover:border-gold/60 hover:text-gold">Return Home</Link>
                <button type="button" onClick={() => navigator.share?.({ title: "CricKuru Arena", text: result?.title, url: window.location.href })} className="min-h-12 rounded-full border border-white/15 bg-white/8 px-7 text-sm font-black uppercase tracking-[0.16em] text-white hover:border-gold/60 hover:text-gold">Share Result</button>
              </div>
            </div>
            <ProgressPanel progress={state.progress} />
          </motion.div>
        );
      }

      function ArenaHelp({ onClose }) {
        return (
          <div className="fixed inset-0 z-[90] grid place-items-center bg-black/72 p-4 backdrop-blur-sm">
            <div className="glass max-h-[86vh] w-full max-w-3xl overflow-auto rounded-[8px] p-6">
              <div className="flex items-center justify-between gap-4">
                <h2 className="font-display text-4xl font-black uppercase text-white">Arena Controls</h2>
                <button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-white/8"><Icon.X size={20} /></button>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <HelpBlock title="Batting" lines={["A/D/W/Q/S choose direction", "1/2/3 choose footwork", "Pick shot type and aggression", "Space starts delivery, then Space plays shot"]} />
                <HelpBlock title="Bowling" lines={["Arrow keys move line and length", "1-4 select variation", "Space locks delivery", "Space again stops accuracy meter"]} />
              </div>
            </div>
          </div>
        );
      }

      function HelpBlock({ title, lines }) {
        return <div className="rounded-[8px] border border-white/10 bg-white/[0.045] p-4"><p className="font-display text-3xl font-black uppercase text-gold">{title}</p><ul className="mt-3 grid gap-2 text-sm text-white/68">{lines.map((line) => <li key={line}>{line}</li>)}</ul></div>;
      }

      function DevPanel({ state }) {
        const outcome = state.lastOutcome;
        return (
          <div className="fixed bottom-4 right-4 z-[95] max-h-[70vh] w-[min(420px,92vw)] overflow-auto rounded-[8px] border border-cyan/40 bg-night/95 p-4 text-xs text-white shadow-2xl">
            <p className="mb-3 font-black uppercase tracking-[0.2em] text-cyan">Developer Panel</p>
            <pre className="whitespace-pre-wrap">{JSON.stringify({
              phase: state.phase,
              aiDelivery: state.currentDelivery,
              aiShot: state.currentShot,
              deliveryQuality: outcome?.deliveryQuality,
              shotQuality: outcome?.shotQuality,
              tacticalMatchup: outcome?.tacticalMatchup,
              pressureModifier: outcome?.pressureModifier,
              outcome: outcome?.code,
              aiMemory: state.aiMemory,
            }, null, 2)}</pre>
          </div>
        );
      }

      const memeBankFallback = [
        { id: "fallback-001", style: "Warrior Roast", topic: "last ball six", visual: "batter", tags: ["six", "chase"], text: "When the bowler says it is just a friendly match and then bowls a yorker first ball." },
        { id: "fallback-002", style: "Dressing Room", topic: "dropped catch", visual: "fielder", tags: ["catch", "fielding"], text: "Me after dropping one catch: the lights moved at the last second." },
        { id: "fallback-003", style: "Fan Hype", topic: "finish", visual: "fans", tags: ["warriors", "finish"], text: "Kurukshetra Warriors when the chase needs 18 off 6: say less." },
        { id: "fallback-004", style: "Warrior Roast", topic: "single", visual: "allrounder", tags: ["single", "celebration"], text: "That one teammate who brings full celebration energy for a single." },
        { id: "fallback-005", style: "Dressing Room", topic: "warm up", visual: "captain", tags: ["warmup", "team"], text: "POV: You called it a warm-up and the captain made a full batting order." },
        { id: "fallback-006", style: "Fan Hype", topic: "cover drive", visual: "batter", tags: ["drive", "form"], text: "When your cover drive finally beats point and you start walking like prime form arrived." },
      ];

      const memeStyles = ["Warrior Roast", "Dressing Room", "Fan Hype"];
      const memeVisualLabels = {
        batter: "Batter",
        bowler: "Bowler",
        fielder: "Fielder",
        keeper: "Wicketkeeper",
        captain: "Captain",
        allrounder: "All-rounder",
        fans: "Crowd",
        scoreboard: "Scoreboard",
        umpire: "Umpire",
      };

      function normalizeMemeItem(item, index = 0) {
        const fallback = memeBankFallback[index % memeBankFallback.length];
        const visual = memeVisualLabels[item?.visual] ? item.visual : fallback.visual;
        const style = memeStyles.includes(item?.style) ? item.style : fallback.style;
        return {
          id: String(item?.id || `meme-${index + 1}`).trim(),
          style,
          topic: String(item?.topic || fallback.topic).trim(),
          visual,
          tags: asArray(item?.tags).map((tag) => String(tag).toLowerCase().trim()).filter(Boolean),
          text: String(item?.text || fallback.text).replace(/\s+/g, " ").trim(),
        };
      }

      function useMemeBank() {
        const [state, setState] = useState({ loading: true, error: "", memes: memeBankFallback.map(normalizeMemeItem) });

        useEffect(() => {
          let cancelled = false;

          const loadMemes = async () => {
            try {
              const response = await fetch(assetUrl(`/data/meme-bank.json?v=${Date.now()}`), { cache: "no-store" });
              if (!response.ok) throw new Error(`Meme vault returned ${response.status}`);
              const data = await response.json();
              const memes = asArray(data.memes).map(normalizeMemeItem).filter((item) => item.text);
              if (!memes.length) throw new Error("Meme vault is empty");
              if (!cancelled) setState({ loading: false, error: "", memes });
            } catch (error) {
              if (!cancelled) {
                setState((current) => ({
                  loading: false,
                  error: error.message || "Meme vault unavailable",
                  memes: current.memes.length ? current.memes : memeBankFallback.map(normalizeMemeItem),
                }));
              }
            }
          };

          loadMemes();
          return () => {
            cancelled = true;
          };
        }, []);

        return state;
      }

      function normalizeMemeTopic(value) {
        return String(value || "the clutch cricket moment").replace(/\s+/g, " ").trim() || "the clutch cricket moment";
      }

      function findMemeCandidates(memes, topic, style) {
        const cleanTopic = normalizeMemeTopic(topic);
        const terms = cleanTopic.toLowerCase().split(/[^a-z0-9]+/).filter((term) => term.length > 2);
        const stylePool = asArray(memes).filter((meme) => !style || meme.style === style);
        const pool = stylePool.length ? stylePool : asArray(memes);
        const scored = pool.map((meme) => {
          const haystack = [meme.topic, meme.text, ...(meme.tags || [])].join(" ").toLowerCase();
          const score = terms.reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0);
          return { meme, score };
        });
        const matches = scored.filter((item) => item.score > 0).map((item) => item.meme);
        return matches.length ? matches : pool;
      }

      function pickMeme(memes, topic, style, currentId = "") {
        const candidates = findMemeCandidates(memes, topic, style);
        const freshCandidates = candidates.length > 1 ? candidates.filter((meme) => meme.id !== currentId) : candidates;
        const pool = freshCandidates.length ? freshCandidates : candidates;
        return pool[Math.floor(Math.random() * pool.length)] || memeBankFallback[0];
      }

      function escapeSvgText(value) {
        return String(value || "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
      }

      function wrapMemeText(value, maxChars = 22, maxLines = 6) {
        const words = String(value || "").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
        const lines = [];
        let current = "";

        words.forEach((word) => {
          const pieces = word.length > maxChars ? word.match(new RegExp(`.{1,${maxChars}}`, "g")) || [word] : [word];
          pieces.forEach((piece) => {
            const next = current ? `${current} ${piece}` : piece;
            if (next.length > maxChars && current) {
              lines.push(current);
              current = piece;
            } else {
              current = next;
            }
          });
        });

        if (current) lines.push(current);
        if (lines.length <= maxLines) return lines;
        const compacted = lines.slice(0, maxLines);
        compacted[maxLines - 1] = `${compacted[maxLines - 1].replace(/\.*$/, "")}...`;
        return compacted;
      }

      function memeVisualArtwork(visual = "batter") {
        const commonWickets = `<g opacity="0.72" stroke="#F5F7FA" stroke-width="10" stroke-linecap="round"><path d="M192 616v-182"/><path d="M230 616v-196"/><path d="M268 616v-180"/><path d="M178 430h106"/></g>`;
        const ball = `<circle cx="815" cy="208" r="38" fill="#B71932"/><path d="M802 177c25 23 30 53 6 78" fill="none" stroke="#F5F7FA" stroke-width="4" opacity="0.7"/>`;
        const batter = `<g transform="translate(618 184) rotate(-8)"><path d="M186 74l-78 360" stroke="#F4B942" stroke-width="34" stroke-linecap="round"/><circle cx="96" cy="96" r="52" fill="#F5F7FA"/><path d="M95 152c-36 42-43 105-22 168l32 97" stroke="#F5F7FA" stroke-width="48" stroke-linecap="round" fill="none"/><path d="M84 222l-114 84" stroke="#F5F7FA" stroke-width="32" stroke-linecap="round"/><path d="M118 236l96 76" stroke="#F5F7FA" stroke-width="32" stroke-linecap="round"/><path d="M82 404l-92 164" stroke="#F5F7FA" stroke-width="36" stroke-linecap="round"/><path d="M136 404l92 150" stroke="#F5F7FA" stroke-width="36" stroke-linecap="round"/></g>${ball}`;
        const bowler = `<g transform="translate(660 190) rotate(10)"><circle cx="120" cy="70" r="48" fill="#F5F7FA"/><path d="M102 130c-60 44-88 116-84 212" stroke="#F5F7FA" stroke-width="46" stroke-linecap="round" fill="none"/><path d="M98 160l-112-84" stroke="#F5F7FA" stroke-width="30" stroke-linecap="round"/><path d="M136 145l72-132" stroke="#F4B942" stroke-width="32" stroke-linecap="round"/><path d="M40 336l-82 146" stroke="#F5F7FA" stroke-width="34" stroke-linecap="round"/><path d="M86 330l118 116" stroke="#F5F7FA" stroke-width="34" stroke-linecap="round"/></g><circle cx="874" cy="118" r="34" fill="#B71932"/>`;
        const fielder = `<g transform="translate(596 300) rotate(-18)"><circle cx="170" cy="70" r="46" fill="#F5F7FA"/><path d="M132 122c-56 28-104 74-150 138" stroke="#F5F7FA" stroke-width="44" stroke-linecap="round" fill="none"/><path d="M94 176l-146-32" stroke="#F5F7FA" stroke-width="30" stroke-linecap="round"/><path d="M98 210l148 30" stroke="#F5F7FA" stroke-width="30" stroke-linecap="round"/><path d="M-8 266l-140 86" stroke="#F5F7FA" stroke-width="34" stroke-linecap="round"/><path d="M26 286l108 108" stroke="#F5F7FA" stroke-width="34" stroke-linecap="round"/></g><circle cx="508" cy="452" r="32" fill="#B71932"/>`;
        const keeper = `${commonWickets}<g transform="translate(590 242)"><circle cx="124" cy="74" r="48" fill="#F5F7FA"/><path d="M116 132c-28 62-26 132 8 214" stroke="#F5F7FA" stroke-width="48" stroke-linecap="round" fill="none"/><path d="M92 202l-96 84" stroke="#F4B942" stroke-width="38" stroke-linecap="round"/><path d="M156 202l104 84" stroke="#F4B942" stroke-width="38" stroke-linecap="round"/><path d="M106 346l-76 126" stroke="#F5F7FA" stroke-width="34" stroke-linecap="round"/><path d="M146 346l88 126" stroke="#F5F7FA" stroke-width="34" stroke-linecap="round"/></g>`;
        const captain = `<g transform="translate(610 210)"><circle cx="120" cy="70" r="48" fill="#F5F7FA"/><path d="M116 132c-40 62-46 142-20 250" stroke="#F5F7FA" stroke-width="50" stroke-linecap="round" fill="none"/><path d="M98 176l-116 34" stroke="#F5F7FA" stroke-width="30" stroke-linecap="round"/><path d="M142 174l190-78" stroke="#F4B942" stroke-width="30" stroke-linecap="round"/><path d="M86 382l-82 140" stroke="#F5F7FA" stroke-width="34" stroke-linecap="round"/><path d="M128 382l102 132" stroke="#F5F7FA" stroke-width="34" stroke-linecap="round"/></g><path d="M832 300h118M832 354h92M832 408h132" stroke="#22D3EE" stroke-width="12" opacity="0.65" stroke-linecap="round"/>`;
        const allrounder = `<g transform="translate(620 212)"><path d="M214 68l-82 350" stroke="#F4B942" stroke-width="28" stroke-linecap="round"/><circle cx="104" cy="80" r="48" fill="#F5F7FA"/><path d="M100 140c-40 54-42 130-14 228" stroke="#F5F7FA" stroke-width="48" stroke-linecap="round" fill="none"/><path d="M82 196l-116 62" stroke="#F5F7FA" stroke-width="30" stroke-linecap="round"/><path d="M126 190l118 48" stroke="#F5F7FA" stroke-width="30" stroke-linecap="round"/><path d="M78 366l-84 142" stroke="#F5F7FA" stroke-width="34" stroke-linecap="round"/><path d="M124 366l100 128" stroke="#F5F7FA" stroke-width="34" stroke-linecap="round"/></g><circle cx="858" cy="218" r="34" fill="#B71932"/>`;
        const fans = `<g transform="translate(560 190)" opacity="0.92"><path d="M0 286h420v204H0z" fill="#05070B" opacity="0.5" stroke="#F4B942" stroke-width="6"/><path d="M28 248c70-74 138-74 206 0 54-60 108-66 162-18" fill="none" stroke="#F4B942" stroke-width="24" stroke-linecap="round"/><g fill="#F5F7FA">${[0, 70, 140, 210, 280, 350].map((x) => `<circle cx="${38 + x}" cy="316" r="30"/><path d="M${14 + x} 366h48v100h-48z"/>`).join("")}</g></g>`;
        const scoreboard = `<g transform="translate(548 198)"><rect x="0" y="0" width="440" height="290" rx="28" fill="#05070B" opacity="0.82" stroke="#F4B942" stroke-width="8"/><text x="42" y="82" fill="#F4B942" font-family="Impact, Arial Black, Arial, sans-serif" font-size="54">WARRIORS</text><text x="42" y="168" fill="#F5F7FA" font-family="Impact, Arial Black, Arial, sans-serif" font-size="82">148/5</text><text x="42" y="232" fill="#22D3EE" font-family="Arial, sans-serif" font-size="34" font-weight="800">NEED 12 OFF 6</text></g>`;
        const umpire = `${commonWickets}<g transform="translate(650 176)"><circle cx="112" cy="72" r="46" fill="#F5F7FA"/><path d="M112 130v252" stroke="#F5F7FA" stroke-width="52" stroke-linecap="round"/><path d="M92 174l-120 54" stroke="#F5F7FA" stroke-width="30" stroke-linecap="round"/><path d="M132 160l22-142" stroke="#F4B942" stroke-width="28" stroke-linecap="round"/><path d="M92 382l-82 142" stroke="#F5F7FA" stroke-width="34" stroke-linecap="round"/><path d="M134 382l84 142" stroke="#F5F7FA" stroke-width="34" stroke-linecap="round"/></g>`;
        return { batter, bowler, fielder, keeper, captain, allrounder, fans, scoreboard, umpire }[visual] || batter;
      }

      function buildMemeImageSvg({ meme, text, topic, style }) {
        const current = normalizeMemeItem(meme || memeBankFallback[0]);
        const textLines = wrapMemeText(String(text || current.text).toUpperCase(), 24, 5);
        const topicLines = wrapMemeText(normalizeMemeTopic(topic).toUpperCase(), 30, 2);
        const fontSize = textLines.length > 4 ? 58 : textLines.length > 3 ? 66 : 76;
        const lineHeight = Math.round(fontSize * 1.05);
        const startY = textLines.length > 4 ? 672 : 700;
        const memeTspans = textLines
          .map((line, index) => `<tspan x="92" y="${startY + index * lineHeight}">${escapeSvgText(line)}</tspan>`)
          .join("");
        const topicTspans = topicLines
          .map((line, index) => `<tspan x="80" y="${374 + index * 34}">${escapeSvgText(line)}</tspan>`)
          .join("");

        return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
          <defs>
            <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#05070B"/>
              <stop offset="0.48" stop-color="#080D16"/>
              <stop offset="1" stop-color="#B71932"/>
            </linearGradient>
            <radialGradient id="shine" cx="30%" cy="20%" r="78%">
              <stop offset="0" stop-color="#F4B942" stop-opacity="0.36"/>
              <stop offset="1" stop-color="#F4B942" stop-opacity="0"/>
            </radialGradient>
          </defs>
          <rect width="1080" height="1080" fill="url(#bg)"/>
          <rect width="1080" height="1080" fill="url(#shine)"/>
          <circle cx="838" cy="218" r="238" fill="#F4B942" opacity="0.1"/>
          <circle cx="232" cy="842" r="250" fill="#22D3EE" opacity="0.1"/>
          <path d="M54 584C245 486 393 470 560 544c161 71 314 52 470-62v170H54z" fill="#F4B942" opacity="0.08"/>
          <path d="M0 546c235 88 474 96 712 24 126-38 244-44 368-4v106H0z" fill="#F5F7FA" opacity="0.05"/>
          <g opacity="0.92">${memeVisualArtwork(current.visual)}</g>
          <rect x="52" y="602" width="976" height="308" rx="32" fill="#05070B" opacity="0.82" stroke="#F4B942" stroke-opacity="0.38" stroke-width="4"/>
          <text x="80" y="118" fill="#F4B942" font-family="Impact, Arial Black, Arial, sans-serif" font-size="58" letter-spacing="1">CRICKURU MEMES</text>
          <text x="80" y="208" fill="#F5F7FA" font-family="Impact, Arial Black, Arial, sans-serif" font-size="84">KURUKSHETRA</text>
          <text x="80" y="296" fill="#F4B942" font-family="Impact, Arial Black, Arial, sans-serif" font-size="84">WARRIORS</text>
          <rect x="78" y="332" width="558" height="94" rx="22" fill="#05070B" opacity="0.66" stroke="#F4B942" stroke-opacity="0.34"/>
          <text x="104" y="356" fill="#22D3EE" font-family="Arial, sans-serif" font-size="23" font-weight="800" letter-spacing="5">${escapeSvgText(String(style || current.style).toUpperCase())}</text>
          <text fill="#F5F7FA" opacity="0.72" font-family="Arial, sans-serif" font-size="28" font-weight="800">${topicTspans}</text>
          <text fill="#FFFFFF" font-family="Impact, Arial Black, Arial, sans-serif" font-size="${fontSize}" stroke="#000000" stroke-width="9" paint-order="stroke" letter-spacing="0">${memeTspans}</text>
          <rect x="80" y="922" width="920" height="2" fill="#F4B942" opacity="0.4"/>
          <text x="80" y="984" fill="#F5F7FA" opacity="0.78" font-family="Arial, sans-serif" font-size="34" font-weight="800">crickuru.com</text>
          <text x="674" y="984" fill="#F4B942" opacity="0.9" font-family="Arial, sans-serif" font-size="34" font-weight="800">${escapeSvgText((memeVisualLabels[current.visual] || "Cricket").toUpperCase())} MOMENT</text>
        </svg>`;
      }

      function svgDataUrl(svg) {
        return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
      }

      function downloadBlob(filename, content, type) {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
      }

      function MemeGeneratorPage() {
        const { loading, error, memes } = useMemeBank();
        const [topic, setTopic] = useState("last ball six");
        const [currentMeme, setCurrentMeme] = useState(() => normalizeMemeItem(memeBankFallback[0]));
        const [memeText, setMemeText] = useState(memeBankFallback[0].text);
        const [style, setStyle] = useState("Warrior Roast");
        const [isCustomText, setIsCustomText] = useState(false);
        const [hasSeededVault, setHasSeededVault] = useState(false);
        const memeSvg = useMemo(() => buildMemeImageSvg({ meme: currentMeme, text: memeText, topic, style }), [currentMeme, memeText, topic, style]);
        const memeImageUrl = useMemo(() => svgDataUrl(memeSvg), [memeSvg]);
        const vaultLabel = loading ? "Loading" : `${memes.length} stored`;
        const visualLabel = memeVisualLabels[currentMeme.visual] || "Cricket";

        useEffect(() => {
          if (!loading && !hasSeededVault && !isCustomText && memes.length) {
            const nextMeme = pickMeme(memes, topic, style, currentMeme.id);
            setCurrentMeme(nextMeme);
            setMemeText(nextMeme.text);
            setHasSeededVault(true);
          }
        }, [currentMeme.id, hasSeededVault, isCustomText, loading, memes, style, topic]);

        const generateMeme = () => {
          const nextMeme = pickMeme(memes, topic, style, currentMeme.id);
          setCurrentMeme(nextMeme);
          setMemeText(nextMeme.text);
          setIsCustomText(false);
        };

        const handleStyleChange = (nextStyle) => {
          const nextMeme = pickMeme(memes, topic, nextStyle, currentMeme.id);
          setStyle(nextStyle);
          setCurrentMeme(nextMeme);
          setMemeText(nextMeme.text);
          setIsCustomText(false);
        };

        const downloadMeme = () => {
          const suffix = isCustomText ? "custom" : currentMeme.id;
          downloadBlob(`crickuru-meme-${suffix}.svg`, memeSvg, "image/svg+xml");
        };

        return (
          <main className="route-bg page-grain min-h-screen px-5 pb-16 pt-36 sm:px-8">
            <section className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
              <motion.div className="glass rounded-[8px] p-6 sm:p-8" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
                <p className="text-xs font-black uppercase tracking-[0.32em] text-gold">CricKuru Meme Lab</p>
                <h1 className="mt-4 font-display text-6xl font-black uppercase leading-none text-white sm:text-8xl">Viral Cricket Meme Generator</h1>
                <p className="mt-5 max-w-2xl text-lg leading-8 text-white/66">
                  Generate one Kurukshetra Warriors cricket meme at a time from the CricKuru vault, with a matching cricket visual behind the caption.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <MemeMeta label="Vault" value={vaultLabel} />
                  <MemeMeta label="Visual" value={visualLabel} />
                  <MemeMeta label="Source" value={loading ? "Syncing" : error ? "Backup" : "Ready"} />
                </div>
                <div className="mt-8 grid gap-4">
                  <label className="block" htmlFor="meme-topic">
                    <span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-white/48">Meme topic</span>
                    <input
                      id="meme-topic"
                      name="meme-topic"
                      value={topic}
                      onChange={(event) => setTopic(event.target.value)}
                      className="min-h-12 w-full rounded-[8px] border border-white/12 bg-night px-4 text-white outline-none focus:border-gold"
                      placeholder="last ball six, dropped catch, yorker, rivalry..."
                    />
                  </label>
                  <OptionGroup
                    label="Style"
                    value={style}
                    options={["Warrior Roast", "Dressing Room", "Fan Hype"].map((value) => ({ value, label: value }))}
                    onChange={handleStyleChange}
                  />
                  <label className="block" htmlFor="meme-copy">
                    <span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-white/48">Meme text</span>
                    <textarea
                      id="meme-copy"
                      name="meme-copy"
                      value={memeText}
                      onChange={(event) => {
                        setMemeText(event.target.value);
                        setIsCustomText(true);
                      }}
                      rows="5"
                      className="w-full rounded-[8px] border border-white/12 bg-night p-4 text-white outline-none focus:border-gold"
                    />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button type="button" onClick={generateMeme} className="shine-button inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-gold px-6 text-sm font-black uppercase tracking-[0.16em] text-night">
                      <Icon.Sparkles size={17} /> Generate One
                    </button>
                    <button type="button" onClick={downloadMeme} className="min-h-12 rounded-full border border-white/15 bg-white/8 px-6 text-sm font-black uppercase tracking-[0.16em] text-white hover:border-gold/60 hover:text-gold">
                      Download Meme Image
                    </button>
                  </div>
                </div>
              </motion.div>
              <div className="grid gap-6">
                <motion.div className="relative overflow-hidden rounded-[8px] border border-gold/28 bg-[radial-gradient(circle_at_78%_12%,rgba(244,185,66,0.22),transparent_28%),linear-gradient(145deg,#05070B,#080D16_48%,#B71932)] p-4 shadow-[0_30px_100px_rgba(0,0,0,.45)] sm:p-6" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
                  <div className="absolute right-[-60px] top-[-60px] h-48 w-48 rounded-full bg-gold/14 blur-3xl" />
                  <div className="relative aspect-square rounded-[8px] border border-white/12 bg-black/24 p-2">
                    <img src={memeImageUrl} alt={`Generated CricKuru meme image preview with ${visualLabel} background`} className="h-full w-full rounded-[8px] object-cover" />
                  </div>
                </motion.div>
                <motion.div className="glass rounded-[8px] p-5" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} aria-live="polite">
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan">Now Generated</p>
                  <h2 className="mt-2 font-display text-4xl font-black uppercase text-white">{currentMeme.topic}</h2>
                  <p className="mt-3 text-sm font-semibold leading-6 text-white/58">
                    {currentMeme.id.toUpperCase()} - {currentMeme.style} - {visualLabel}
                  </p>
                  <p className="mt-5 rounded-[8px] border border-white/10 bg-night/52 p-4 text-base font-bold leading-7 text-white/74">
                    {memeText}
                  </p>
                </motion.div>
              </div>
            </section>
          </main>
        );
      }

      function MemeMeta({ label, value }) {
        return (
          <div className="rounded-[8px] border border-white/10 bg-white/[0.045] p-3">
            <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-white/38">{label}</p>
            <p className="mt-1 font-display text-2xl font-black uppercase text-white">{value}</p>
          </div>
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
        const matchesForStatus = asArray(data[statusTab]);
        const filteredMatches = matchesForStatus.filter((match) => levelTab === "all" || match.level === levelTab);
        const featureMatch = asArray(data.live)[0] || asArray(data.upcoming)[0] || asArray(data.recent)[0];
        const rankings = normalizedIndiaRankings(data);

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
                      {loading ? "Syncing now" : `Updated ${formatFeedDate(data.syncedAt)}`}
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

              <div className="mt-10 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
                <div className="grid gap-5">
                  {featureMatch ? (
                    <IndiaFeatureMatch match={featureMatch} />
                  ) : (
                    <div className="glass rounded-[8px] p-6">
                      <p className="font-display text-4xl font-black uppercase text-white">No India match listed right now</p>
                      <p className="mt-3 leading-7 text-white/62">
                        The automated feed is ready. When a live, recent or upcoming India-linked match is available, it will appear here and in the top panel.
                      </p>
                    </div>
                  )}

                  <div className="glass rounded-[8px] p-5">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.24em] text-gold">Match filter</p>
                        <h2 className="mt-2 font-display text-4xl font-black uppercase text-white">Live, Past and Future</h2>
                      </div>
                      <div className="flex flex-wrap gap-2" role="tablist" aria-label="India match status">
                        {indiaStatusTabs.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            role="tab"
                            aria-selected={statusTab === item.id}
                            onClick={() => setStatusTab(item.id)}
                            className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-xs font-black uppercase tracking-[0.14em] transition ${
                              statusTab === item.id
                                ? "border-gold/60 bg-gold/12 text-gold"
                                : "border-white/12 bg-white/[0.045] text-white/62 hover:border-white/25 hover:text-white"
                            }`}
                          >
                            <item.icon size={15} /> {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mt-5 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="India match level">
                      {indiaLevelTabs.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          role="tab"
                          aria-selected={levelTab === item.id}
                          onClick={() => setLevelTab(item.id)}
                          className={`shrink-0 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.14em] transition ${
                            levelTab === item.id
                              ? "border-cyan/60 bg-cyan/10 text-cyan"
                              : "border-white/12 bg-white/[0.035] text-white/54 hover:border-white/25 hover:text-white"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    <div className="mt-6 grid gap-3">
                      {filteredMatches.length ? (
                        filteredMatches.map((match) => <IndiaMatchCard key={match.id} match={match} />)
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
                  <div className="glass rounded-[8px] p-5">
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan">Update rhythm</p>
                    <h2 className="mt-2 font-display text-4xl font-black uppercase text-white">Near-Live Scoreboard</h2>
                    <p className="mt-4 leading-8 text-white/66">
                      The browser checks the saved site feed every minute. GitHub Actions refreshes the feed on a schedule, so live scores can update without manual publishing.
                    </p>
                    <p className="mt-4 rounded-[8px] border border-white/10 bg-white/[0.045] p-4 text-sm leading-7 text-white/56">
                      Source: {data.source || "public cricket feed"}. For ball-by-ball guaranteed data, connect an official paid cricket data API later.
                    </p>
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

      function IndiaFeatureMatch({ match }) {
        return (
          <article className="relative overflow-hidden rounded-[8px] border border-gold/24 bg-[radial-gradient(circle_at_88%_12%,rgba(244,185,66,0.2),transparent_34%),rgba(255,255,255,0.05)] p-6">
            <div className="absolute right-[-56px] top-[-60px] h-44 w-44 rounded-full bg-gold/10 blur-3xl" aria-hidden="true" />
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-gold">{match.statusLabel || match.status || "India match"}</p>
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

      function IndiaMatchCard({ match }) {
        return (
          <article className="rounded-[8px] border border-white/10 bg-white/[0.04] p-4 transition hover:border-gold/35 hover:bg-white/[0.06]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-white/12 bg-night/70 px-3 py-1 text-[0.62rem] font-black uppercase tracking-[0.16em] text-white/55">
                    {match.statusLabel || match.status}
                  </span>
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
              </div>
              <p className="text-sm text-white/45">&copy; 2026 CricKuru. Built for crickuru.com.</p>
            </div>
          </footer>
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
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route
                    path="/warriors"
                    element={<WarriorsDataPage />}
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
                    path="/arena"
                    element={<ArenaPage />}
                  />
                  <Route
                    path="/memes"
                    element={<MemeGeneratorPage />}
                  />
                  <Route
                    path="/meme"
                    element={<MemeGeneratorPage />}
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
              </IndiaMatchesProvider>
            </BrowserRouter>
          </ThemeProvider>
        );
      }
createRoot(document.getElementById("root")).render(<App />);
