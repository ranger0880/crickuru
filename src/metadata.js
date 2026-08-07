const SITE_ORIGIN = "https://www.crickuru.com";
const SITE_NAME = "CricKuru";
const DEFAULT_IMAGE_PATH = "/assets/stadium-vip-warriors.png";

export const ROUTE_METADATA = [
  {
    path: "/",
    canonicalPath: "/",
    title: "CricKuru - Kurukshetra Warriors Cricket Hub",
    description:
      "The global home of Kurukshetra Warriors with CricHeroes links, live team intelligence, cricket stories, a playable arena, and the CricKuru meme forge.",
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
      "Explore the public Kurukshetra Warriors CricHeroes feed with team profile details, match scorecards, roster data, award records, opponent form and live updates.",
    ogType: "website",
    themeColor: "#05070B",
    changefreq: "daily",
    priority: "0.95",
    jsonLdType: "warriorsData",
  },
  {
    path: "/arena",
    canonicalPath: "/arena",
    title: "CricKuru Arena - Play the Kurukshetra Cricket Game",
    description:
      "Play CricKuru Arena, a fast browser cricket duel with toss choices, batting controls, bowling tactics, scorecards, achievements, and guest progress.",
    ogType: "website",
    themeColor: "#05070B",
    changefreq: "weekly",
    priority: "0.9",
    jsonLdType: "arena",
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
      "Explore Kurukshetra Warriors player profiles, CricHeroes roster signals, award counts, role badges, impact scores and recent performance cards.",
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
      "Play the CricKuru cricket quiz with 1000 general knowledge and tricky cricket questions, profile registration, powerups, lobby challenges, duels and rotating leaderboards.",
    ogType: "website",
    themeColor: "#05070B",
    changefreq: "daily",
    priority: "0.88",
    jsonLdType: "quiz",
  },
  {
    path: "/memes",
    canonicalPath: "/memes",
    title: "CricKuru Meme Forge - Cricket Meme Generator",
    description:
      "Generate, edit, and download Kurukshetra Warriors cricket meme text and artwork ideas for match moments, rivalries, dressing-room jokes, and fan hype.",
    ogType: "website",
    themeColor: "#05070B",
    changefreq: "weekly",
    priority: "0.8",
    jsonLdType: "memes",
  },
  {
    path: "/meme",
    canonicalPath: "/memes",
    title: "CricKuru Meme Forge - Cricket Meme Generator",
    description:
      "Generate, edit, and download Kurukshetra Warriors cricket meme text and artwork ideas for match moments, rivalries, dressing-room jokes, and fan hype.",
    ogType: "website",
    themeColor: "#05070B",
    changefreq: "weekly",
    priority: "0.6",
    jsonLdType: "memes",
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
  ogType: "website",
  themeColor: "#05070B",
  jsonLdType: "home",
};

export function absoluteUrl(path = "/") {
  return new URL(path, SITE_ORIGIN).toString();
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
  const canonicalUrl = absoluteUrl(metadata.canonicalPath);
  const pageUrl = absoluteUrl(metadata.path);
  const imageUrl = absoluteUrl(DEFAULT_IMAGE_PATH);
  const jsonLd = stringifyJsonLd(pathname);

  return [
    `<title>${escapeHtml(metadata.title)}</title>`,
    `<meta name="description" content="${escapeHtml(metadata.description)}" data-route-meta="managed" />`,
    `<meta name="theme-color" content="${escapeHtml(metadata.themeColor)}" data-route-meta="managed" />`,
    `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" data-route-meta="managed" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" data-route-meta="managed" />`,
    `<meta property="og:type" content="${escapeHtml(metadata.ogType)}" data-route-meta="managed" />`,
    `<meta property="og:title" content="${escapeHtml(metadata.title)}" data-route-meta="managed" />`,
    `<meta property="og:description" content="${escapeHtml(metadata.description)}" data-route-meta="managed" />`,
    `<meta property="og:url" content="${escapeHtml(pageUrl)}" data-route-meta="managed" />`,
    `<meta property="og:image" content="${escapeHtml(imageUrl)}" data-route-meta="managed" />`,
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
  const canonicalUrl = absoluteUrl(metadata.canonicalPath);
  const pageUrl = absoluteUrl(metadata.path);
  const imageUrl = absoluteUrl(DEFAULT_IMAGE_PATH);

  document.title = metadata.title;
  setMeta("name", "description", metadata.description);
  setMeta("name", "theme-color", metadata.themeColor);
  setLink("canonical", canonicalUrl);
  setMeta("property", "og:site_name", SITE_NAME);
  setMeta("property", "og:type", metadata.ogType);
  setMeta("property", "og:title", metadata.title);
  setMeta("property", "og:description", metadata.description);
  setMeta("property", "og:url", pageUrl);
  setMeta("property", "og:image", imageUrl);
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
  const canonicalUrl = absoluteUrl(metadata.canonicalPath);
  const imageUrl = absoluteUrl(DEFAULT_IMAGE_PATH);
  const basePage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: metadata.title,
    description: metadata.description,
    url: canonicalUrl,
    image: imageUrl,
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_ORIGIN,
    },
  };

  if (metadata.jsonLdType === "arena") {
    return [
      basePage,
      {
        "@context": "https://schema.org",
        "@type": "VideoGame",
        name: "CricKuru Arena",
        applicationCategory: "Game",
        operatingSystem: "Web browser",
        url: canonicalUrl,
        genre: "Cricket simulation",
        publisher: {
          "@type": "Organization",
          name: SITE_NAME,
          url: SITE_ORIGIN,
        },
      },
    ];
  }

  if (metadata.jsonLdType === "memes") {
    return [
      basePage,
      {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: "CricKuru Meme Forge",
        applicationCategory: "DesignApplication",
        operatingSystem: "Web browser",
        url: canonicalUrl,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
      },
    ];
  }

  if (metadata.jsonLdType === "indiaMatches") {
    return [
      basePage,
      {
        "@context": "https://schema.org",
        "@type": "SportsEvent",
        name: "India Cricket Match Updates",
        sport: "Cricket",
        url: canonicalUrl,
        organizer: {
          "@type": "Organization",
          name: SITE_NAME,
          url: SITE_ORIGIN,
        },
        eventStatus: "https://schema.org/EventScheduled",
      },
      {
        "@context": "https://schema.org",
        "@type": "Dataset",
        name: "CricKuru India Cricket Match Feed",
        description: metadata.description,
        url: canonicalUrl,
        keywords: ["India cricket", "live scores", "fixtures", "domestic cricket", "state cricket"],
        creator: {
          "@type": "Organization",
          name: SITE_NAME,
        },
      },
    ];
  }

  if (metadata.jsonLdType === "warriorsData") {
    return [
      basePage,
      {
        "@context": "https://schema.org",
        "@type": "SportsTeam",
        name: "Kurukshetra Warriors",
        sport: "Cricket",
        url: canonicalUrl,
        sameAs: [
          "https://cricheroes.com/team-profile/8626734/kurukshetra-warriors",
          "https://cricheroes.com/team-profile/8626734/kurukshetra-warriors/matches",
          "https://cricheroes.com/team-profile/8626734/kurukshetra-warriors/members",
        ],
        location: {
          "@type": "Place",
          name: "Greater Noida",
        },
      },
      {
        "@context": "https://schema.org",
        "@type": "Dataset",
        name: "Kurukshetra Warriors Public CricHeroes Feed",
        description: metadata.description,
        url: canonicalUrl,
        keywords: ["Kurukshetra Warriors", "CricHeroes", "cricket team data", "match scorecards", "player roster"],
        creator: {
          "@type": "Organization",
          name: SITE_NAME,
          url: SITE_ORIGIN,
        },
      },
    ];
  }

  if (metadata.jsonLdType === "players") {
    return [
      basePage,
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "Kurukshetra Warriors Player Command Room",
        description: metadata.description,
        url: canonicalUrl,
        isPartOf: {
          "@type": "WebSite",
          name: SITE_NAME,
          url: SITE_ORIGIN,
        },
      },
      {
        "@context": "https://schema.org",
        "@type": "SportsTeam",
        name: "Kurukshetra Warriors",
        sport: "Cricket",
        url: canonicalUrl,
        location: {
          "@type": "Place",
          name: "Greater Noida",
        },
      },
    ];
  }

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
    },
    basePage,
  ];
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
