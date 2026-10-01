function cleanParams(params) {
  return Object.fromEntries(
    Object.entries(params || {}).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

export function trackEvent(name, params = {}) {
  if (typeof window === "undefined" || !name) return;
  const payload = cleanParams(params);

  try {
    if (typeof window.gtag === "function") {
      window.gtag("event", name, payload);
      return;
    }

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: name, ...payload });
  } catch {
    // Analytics must never interrupt navigation or gameplay.
  }
}

export function trackAmazonClick({ asin, category, placement, linkType = "product" }) {
  trackEvent("affiliate_click", {
    merchant: "amazon_in",
    asin,
    category,
    placement,
    link_type: linkType,
  });
}

export function trackSponsorClick(placement) {
  trackEvent("sponsor_click", {
    sponsor: "gt_gaming",
    placement,
  });
}
