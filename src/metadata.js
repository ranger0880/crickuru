const SITE_ORIGIN = "https://crickuru.com";
const SITE_NAME = "CricKuru";
const DEFAULT_IMAGE_PATH = "/assets/stadium-vip-warriors.png";
const CAPTAIN_NAME = "Ankit Kulshreshtha";
const CAPTAIN_PATH = "/captain/ankit-kulshreshtha";
const CAPTAIN_PROFILE_URL = "https://cricheroes.com/player-profile/29139731/ankit-kulshreshtha/profile";

export const ROUTE_METADATA = [
  {
    path: "/",
    canonicalPath: "/",
    title: "CricKuru - Kurukshetra Warriors & Captain Ankit Kulshreshtha",
    description:
      "CricKuru is the home of Kurukshetra Warriors and captain Ankit Kulshreshtha, with CricHeroes links, live team intelligence and cricket stories.",
    ogType: "website",
    themeColor: "#05070B",
    changefreq: "weekly",
    priority: "1.0",
    jsonLdType: "home",
  },
  {
    path: "/warriors",
    canonicalPath: "/warriors",
    title: "Kurukshetra Warriors CricHeroes Team Data - CricKuru",
    description:
      "Explore the public Kurukshetra Warriors CricHeroes feed, captain Ankit Kulshreshtha, interactive match scorecards, player profiles, cross-team form, rare records and live updates.",
    ogType: "website",
    themeColor: "#05070B",
    changefreq: "daily",
    priority: "0.95",
    jsonLdType: "warriorsData",
  },
  {
    path: CAPTAIN_PATH,
    canonicalPath: CAPTAIN_PATH,
    title: "Ankit Kulshreshtha - Captain of Kurukshetra Warriors | CricKuru",
    description:
      "Meet Ankit Kulshreshtha, captain of Kurukshetra Warriors. Explore his public CricHeroes profile, captaincy record, cricket role and team connection on CricKuru.",
    ogType: "profile",
    themeColor: "#05070B",
    changefreq: "weekly",
    priority: "0.95",
    jsonLdType: "captainProfile",
  },
  {
    path: "/india-matches",
    canonicalPath: "/india-matches",
    title: "India Live Cricket Scores, Fixtures and Results - CricKuru",
    description:
      "Follow India-linked live cricket scores, recent results, future fixtures, and match levels from international cricket to domestic and state-level matches.",
    ogType: "website",
    themeColor: "#05070B",
    changefreq: "daily",
    priority: "0.9",
    jsonLdType: "indiaMatches",
  },
  {
    path: "/players",
    canonicalPath: "/players",
    title: "Kurukshetra Warriors Player Stats and Performance - CricKuru",
    description:
      "Explore Kurukshetra Warriors player profiles with overall CricHeroes career totals, cross-team recent matches, rare records, role badges, 1-100 performance charges and Warriors awards.",
    ogType: "website",
    themeColor: "#05070B",
    changefreq: "daily",
    priority: "0.85",
    jsonLdType: "players",
  },
  {
    path: "/quiz",
    canonicalPath: "/quiz",
    title: "CricKuru Cricket Quiz, Lobby and Leaderboard",
    description:
      "Play the CricKuru cricket quiz with 10000 general knowledge and tricky cricket questions, profile registration, powerups, lobby challenges, duels and rotating leaderboards.",
    ogType: "website",
    themeColor: "#05070B",
    changefreq: "daily",
    priority: "0.88",
    jsonLdType: "quiz",
  },
  {
    path: "/coin",
    canonicalPath: "/coin",
    title: "Kuru Coin - CricKuru Community Launch Watch",
    description:
      "Explore the neutral Kuru Coin launch watch page for cricket meme artwork, community links, and risk-aware launch preparation without profit promises.",
    ogType: "website",
    themeColor: "#05070B",
    changefreq: "monthly",
    priority: "0.7",
    jsonLdType: "coin",
  },
  {
    path: "/gt-gaming",
    canonicalPath: "/gt-gaming",
    title: "GT Gaming Chairs - Comfort and Control for Long Sessions | CricKuru",
    description:
      "Explore the GT Throne gaming chair from CricKuru sponsor GT Gaming, including its recline, memory foam, upholstery, steel frame and long-session comfort features.",
    ogType: "website",
    themeColor: "#05070B",
    changefreq: "monthly",
    priority: "0.65",
    jsonLdType: "gtGaming",
  },
  {
    path: "/shop",
    canonicalPath: "/shop",
    title: "Cricket Gear on Amazon - Bats, Balls, Protection and Training | CricKuru",
    description:
      "Shop curated Amazon India cricket gear for tennis-ball and leather-ball cricket: bats, balls, gloves, pads, helmets, kit bags, stumps and training equipment, with current product links and practical buying notes.",
    ogType: "website",
    themeColor: "#05070B",
    changefreq: "weekly",
    priority: "0.8",
    jsonLdType: "shop",
  },
  {
    path: "/kurukshetra-coin",
    canonicalPath: "/coin",
    title: "Kuru Coin - CricKuru Community Launch Watch",
    description:
      "Explore the neutral Kuru Coin launch watch page for cricket meme artwork, community links, and risk-aware launch preparation without profit promises.",
    ogType: "website",
    themeColor: "#05070B",
    changefreq: "monthly",
    priority: "0.5",
    jsonLdType: "coin",
  },
];

export const NOT_FOUND_METADATA = {
  path: "/404",
  canonicalPath: "/",
  title: "Page Not Found - CricKuru",
  description: "This CricKuru route is not available yet. Return to the Kurukshetra Warriors cricket hub.",
  robots: "noindex,follow",
  ogType: "website",
  themeColor: "#05070B",
  jsonLdType: "home",
};

export function absoluteUrl(path = "/") {
  return new URL(path, SITE_ORIGIN).toString();
}

export function routeUrl(path = "/") {
  const normalized = String(path || "/");
  const slashPath = normalized === "/" ? "/" : `${normalized.replace(/\/+$/, "")}/`;
  return absoluteUrl(slashPath);
}

export function routeMetadataForPath(pathname = "/") {
  const normalized = normalizePath(pathname);
  return ROUTE_METADATA.find((route) => route.path === normalized) || NOT_FOUND_METADATA;
}

export function stringifyJsonLd(pathname = "/") {
  const metadata = routeMetadataForPath(pathname);
  return JSON.stringify(jsonLdForRoute(metadata), null, 2).replace(/</g, "\\u003c");
}

export function renderRouteMeta(pathname = "/") {
  const metadata = routeMetadataForPath(pathname);
  const canonicalUrl = routeUrl(metadata.canonicalPath);
  const pageUrl = routeUrl(metadata.path);
  const imageUrl = absoluteUrl(DEFAULT_IMAGE_PATH);
  const jsonLd = stringifyJsonLd(pathname);

  return [
    `<title>${escapeHtml(metadata.title)}</title>`,
    `<meta name="description" content="${escapeHtml(metadata.description)}" data-route-meta="managed" />`,
    `<meta name="robots" content="${escapeHtml(metadata.robots || "index,follow")}" data-route-meta="managed" />`,
    `<meta name="theme-color" content="${escapeHtml(metadata.themeColor)}" data-route-meta="managed" />`,
    `<meta name="author" content="${SITE_NAME}" data-route-meta="managed" />`,
    `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" data-route-meta="managed" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" data-route-meta="managed" />`,
    `<meta property="og:type" content="${escapeHtml(metadata.ogType)}" data-route-meta="managed" />`,
    `<meta property="og:title" content="${escapeHtml(metadata.title)}" data-route-meta="managed" />`,
    `<meta property="og:description" content="${escapeHtml(metadata.description)}" data-route-meta="managed" />`,
    `<meta property="og:url" content="${escapeHtml(pageUrl)}" data-route-meta="managed" />`,
    `<meta property="og:image" content="${escapeHtml(imageUrl)}" data-route-meta="managed" />`,
    `<meta property="og:image:alt" content="${escapeHtml(`${SITE_NAME} - ${metadata.title}`)}" data-route-meta="managed" />`,
    `<meta name="twitter:card" content="summary_large_image" data-route-meta="managed" />`,
    `<meta name="twitter:title" content="${escapeHtml(metadata.title)}" data-route-meta="managed" />`,
    `<meta name="twitter:description" content="${escapeHtml(metadata.description)}" data-route-meta="managed" />`,
    `<meta name="twitter:image" content="${escapeHtml(imageUrl)}" data-route-meta="managed" />`,
    `<script type="application/ld+json" id="crickuru-jsonld" data-route-meta="managed">${jsonLd}</script>`,
  ].join("\n    ");
}

export function applyRouteMetadata(pathname = "/") {
  if (typeof document === "undefined") return;

  const metadata = routeMetadataForPath(pathname);
  const canonicalUrl = routeUrl(metadata.canonicalPath);
  const pageUrl = routeUrl(metadata.path);
  const imageUrl = absoluteUrl(DEFAULT_IMAGE_PATH);

  document.title = metadata.title;
  setMeta("name", "description", metadata.description);
  setMeta("name", "robots", metadata.robots || "index,follow");
  setMeta("name", "theme-color", metadata.themeColor);
  setMeta("name", "author", SITE_NAME);
  setLink("canonical", canonicalUrl);
  setMeta("property", "og:site_name", SITE_NAME);
  setMeta("property", "og:type", metadata.ogType);
  setMeta("property", "og:title", metadata.title);
  setMeta("property", "og:description", metadata.description);
  setMeta("property", "og:url", pageUrl);
  setMeta("property", "og:image", imageUrl);
  setMeta("property", "og:image:alt", `${SITE_NAME} - ${metadata.title}`);
  setMeta("name", "twitter:card", "summary_large_image");
  setMeta("name", "twitter:title", metadata.title);
  setMeta("name", "twitter:description", metadata.description);
  setMeta("name", "twitter:image", imageUrl);

  let jsonLd = document.getElementById("crickuru-jsonld");
  if (!jsonLd) {
    jsonLd = document.createElement("script");
    jsonLd.type = "application/ld+json";
    jsonLd.id = "crickuru-jsonld";
    jsonLd.dataset.routeMeta = "managed";
    document.head.appendChild(jsonLd);
  }
  jsonLd.textContent = stringifyJsonLd(pathname);
}

function jsonLdForRoute(metadata) {
  const canonicalUrl = routeUrl(metadata.canonicalPath);
  const imageUrl = absoluteUrl(DEFAULT_IMAGE_PATH);
  const basePage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: metadata.title,
    description: metadata.description,
    url: canonicalUrl,
    image: imageUrl,
    inLanguage: "en-IN",
    breadcrumb: breadcrumbForPath(metadata.canonicalPath),
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_ORIGIN,
    },
  };

  if (metadata.jsonLdType === "quiz") {
    return [
      basePage,
      {
        "@context": "https://schema.org",
        "@type": "Quiz",
        name: "CricKuru Cricket Quiz",
        description: metadata.description,
        url: canonicalUrl,
        educationalAlignment: "Cricket general knowledge, rules and match awareness",
        isPartOf: {
          "@type": "WebSite",
          name: SITE_NAME,
          url: SITE_ORIGIN,
        },
      },
      {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: "CricKuru Quiz Lobby",
        applicationCategory: "GameApplication",
        operatingSystem: "Web browser",
        url: canonicalUrl,
      },
    ];
  }

  if (metadata.jsonLdType === "shop") {
    return [
      basePage,
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "CricKuru Cricket Gear Shop",
        description: metadata.description,
        url: canonicalUrl,
        about: {
          "@type": "Thing",
          name: "Cricket equipment buying guide",
        },
        isPartOf: {
          "@type": "WebSite",
          name: SITE_NAME,
          url: SITE_ORIGIN,
        },
      },
    ];
  }

  if (metadata.jsonLdType === "coin") {
    return [
      basePage,
      {
        "@context": "https://schema.org",
        "@type": "CreativeWork",
        name: "Kuru Coin Launch Watch",
        description: metadata.description,
        url: canonicalUrl,
        creator: {
          "@type": "Organization",
          name: SITE_NAME,
        },
      },
    ];
  }

  return [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_ORIGIN,
      description: metadata.description,
      potentialAction: {
        "@type": "SearchAction",
        target: `${SITE_ORIGIN}/?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "SportsTeam",
      name: "Kurukshetra Warriors",
      sport: "Cricket",
      url: SITE_ORIGIN,
      memberOf: {
        "@type": "SportsOrganization",
        name: SITE_NAME,
      },
      location: {
        "@type": "Place",
        name: "Greater Noida",
      },
      member: {
        "@type": "Person",
        name: CAPTAIN_NAME,
        jobTitle: "Captain",
        url: routeUrl(CAPTAIN_PATH),
        sameAs: [CAPTAIN_PROFILE_URL],
      },
    },
    basePage,
  ];
}

export function renderRouteSeoContent(pathname = "/") {
  const metadata = routeMetadataForPath(pathname);
  const isNotFound = normalizePath(pathname) === "/404";
  const content = isNotFound
    ? {
        eyebrow: "CricKuru cricket hub",
        heading: "Page not found",
        body: "That CricKuru route is unavailable. Return to the cricket hub for Kurukshetra Warriors match updates, player profiles, the India match feed and quizzes.",
        links: [["/", "Return to CricKuru"], ["/warriors", "Open Kurukshetra Warriors"]],
      }
    : {
        home: {
          eyebrow: "The global cricket community",
          heading: "Cricket is more than a game",
          body: "CricKuru is the cricket hub for Kurukshetra Warriors, captain Ankit Kulshreshtha, public CricHeroes team links, India match updates, quizzes and player profiles.",
          links: [["/warriors", "Kurukshetra Warriors"], ["/india-matches", "India match updates"], ["/quiz", "Cricket quiz"]],
        },
        warriorsData: {
          eyebrow: "Kurukshetra Warriors cricket",
          heading: "Kurukshetra Warriors match centre",
          body: "Follow the Greater Noida society cricket team through public CricHeroes match results, scorecards, members, player form, team records and captain Ankit Kulshreshtha.",
          links: [["/captain/ankit-kulshreshtha", "Captain Ankit Kulshreshtha"], ["/players", "Warriors player profiles"], ["/india-matches", "India cricket matches"]],
        },
        captainProfile: {
          eyebrow: "Kurukshetra Warriors captain",
          heading: "Ankit Kulshreshtha cricket profile",
          body: "Explore the public cricket profile of Ankit Kulshreshtha, captain of Kurukshetra Warriors in Greater Noida, with his CricHeroes connection, captaincy snapshot and recent match context.",
          links: [["/warriors", "Kurukshetra Warriors team"], ["/players", "Player command room"], ["https://cricheroes.com/player-profile/29139731/ankit-kulshreshtha/stats", "Official CricHeroes stats"]],
        },
        indiaMatches: {
          eyebrow: "India cricket match updates",
          heading: "India live scores and fixtures",
          body: "Browse India-linked cricket fixtures and results across international, women's, youth, domestic and state-level cricket, with tournament filters and important-match tracking.",
          links: [["/warriors", "Kurukshetra Warriors results"], ["/players", "Player performance"], ["/quiz", "Cricket quiz"]],
        },
        players: {
          eyebrow: "Kurukshetra Warriors players",
          heading: "Player stats and cricket profiles",
          body: "Search Warriors player profiles, recent form, role badges, performance charges, batting, bowling, fielding and captaincy signals sourced from the public CricHeroes feed.",
          links: [["/captain/ankit-kulshreshtha", "Captain profile"], ["/warriors", "Team match centre"], ["/india-matches", "India match feed"]],
        },
        quiz: {
          eyebrow: "Cricket quiz and lobby",
          heading: "Challenge your cricket knowledge",
          body: "Play a cricket quiz with general knowledge, tricky rules, score maths, powerups, profiles, leaderboards and friendly duels for Kurukshetra Warriors fans.",
          links: [["/warriors", "Warriors match updates"], ["/players", "Player profiles"]],
        },
        coin: {
          eyebrow: "CricKuru community project",
          heading: "Kuru Coin launch watch",
          body: "Follow the Kurukshetra Warriors community coin concept and launch preparation with clear, risk-aware information and no promises of profit or returns.",
          links: [["/warriors", "Kurukshetra Warriors"], ["/", "CricKuru home"]],
        },
        gtGaming: {
          eyebrow: "Official team sponsor",
          heading: "GT Gaming chairs for cricket and gaming",
          body: "Learn about GT Gaming chairs featured by CricKuru, including the GT Throne setup for long cricket score-watching, gaming sessions and match-day comfort.",
          links: [["https://gtgaming.shop/", "Visit GT Gaming"], ["/warriors", "Follow the Warriors"]],
        },
        shop: {
          eyebrow: "CricKuru gear desk",
          heading: "Cricket gear for every surface",
          body: "Browse curated Amazon India collections for tennis-ball and leather-ball cricket, including bats, balls, protection, kit bags, stumps and training equipment with real product images and practical fit notes.",
          links: [["/warriors", "Kurukshetra Warriors"], ["/players", "Player profiles"], ["/gt-gaming", "GT Gaming sponsor"]],
        },
      }[metadata.seoKey || metadata.jsonLdType] || {
        eyebrow: "CricKuru cricket hub",
        heading: metadata.title,
        body: metadata.description,
        links: [["/", "Return to CricKuru"]],
      };

  const links = content.links
    .map(([href, label]) => `<a href="${escapeHtml(href)}" class="text-gold underline decoration-gold/40 underline-offset-4">${escapeHtml(label)}</a>`)
    .join(" <span aria-hidden=\"true\">-</span> ");

  return `<section id="static-seo-content" class="mx-auto max-w-4xl" aria-labelledby="static-seo-title">
          <p class="mb-5 text-xs font-extrabold uppercase tracking-[0.32em] text-cyan">${escapeHtml(content.eyebrow)}</p>
          <h1 id="static-seo-title" class="font-display text-[clamp(3.25rem,9vw,7.4rem)] font-black uppercase leading-[0.86]">${escapeHtml(content.heading)}</h1>
          <p class="mx-auto mt-7 max-w-3xl text-lg leading-8 text-white/76">${escapeHtml(content.body)}</p>
          <nav class="mt-7 flex flex-wrap justify-center gap-x-3 gap-y-2 text-sm font-bold" aria-label="CricKuru discovery links">${links}</nav>
        </section>`;
}

function breadcrumbForPath(pathname) {
  const normalized = normalizePath(pathname);
  const items = [
    {
      "@type": "ListItem",
      position: 1,
      name: "CricKuru",
      item: SITE_ORIGIN,
    },
  ];
  if (normalized !== "/") {
    const route = ROUTE_METADATA.find((item) => item.path === normalized) || NOT_FOUND_METADATA;
    items.push({
      "@type": "ListItem",
      position: 2,
      name: route.title.replace(/\s+\|\s+CricKuru$/, ""),
      item: routeUrl(route.canonicalPath),
    });
  }
  return {
    "@type": "BreadcrumbList",
    itemListElement: items,
  };
}

function setMeta(attribute, key, content) {
  let tag = document.head.querySelector(`meta[${attribute}="${CSS.escape(key)}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attribute, key);
    tag.dataset.routeMeta = "managed";
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

function setLink(rel, href) {
  let tag = document.head.querySelector(`link[rel="${CSS.escape(rel)}"]`);
  if (!tag) {
    tag = document.createElement("link");
    tag.setAttribute("rel", rel);
    tag.dataset.routeMeta = "managed";
    document.head.appendChild(tag);
  }
  tag.setAttribute("href", href);
}

function normalizePath(pathname) {
  const clean = `/${String(pathname || "/").split("?")[0].split("#")[0].replace(/^\/+/, "")}`;
  return clean.length > 1 ? clean.replace(/\/+$/, "") : "/";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
