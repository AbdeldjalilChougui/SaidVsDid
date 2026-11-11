// A compact, hand-curated list of well-known third-party tracking domains, grouped by purpose.
// Inspired by public block lists (Disconnect, EasyPrivacy); kept small on purpose so it stays readable.
export type TrackerCategory = "advertising" | "analytics" | "social" | "session-replay" | "fingerprinting" | "consent";

export interface TrackerEntry { domain: string; company: string; category: TrackerCategory }

const T = (category: TrackerCategory, company: string, ...domains: string[]): TrackerEntry[] => domains.map((domain) => ({ domain, company, category }));

export const TRACKERS: TrackerEntry[] = [
  ...T("advertising", "Google", "doubleclick.net", "googlesyndication.com", "googleadservices.com", "adservice.google.com", "googletagservices.com"),
  ...T("analytics", "Google", "google-analytics.com", "analytics.google.com", "googletagmanager.com"),
  ...T("advertising", "Meta", "connect.facebook.net", "facebook.com/tr", "fbcdn.net/signals"),
  ...T("advertising", "Amazon", "amazon-adsystem.com", "assoc-amazon.com"),
  ...T("advertising", "Microsoft", "bat.bing.com", "ads.microsoft.com"),
  ...T("session-replay", "Microsoft Clarity", "clarity.ms"),
  ...T("advertising", "Criteo", "criteo.com", "criteo.net"),
  ...T("advertising", "Taboola", "taboola.com"),
  ...T("advertising", "Outbrain", "outbrain.com"),
  ...T("advertising", "Xandr", "adnxs.com"),
  ...T("advertising", "Magnite", "rubiconproject.com"),
  ...T("advertising", "PubMatic", "pubmatic.com"),
  ...T("advertising", "OpenX", "openx.net"),
  ...T("advertising", "Index Exchange", "casalemedia.com"),
  ...T("advertising", "The Trade Desk", "adsrvr.org"),
  ...T("advertising", "Quantcast", "quantserve.com", "quantcount.com"),
  ...T("advertising", "TikTok", "analytics.tiktok.com"),
  ...T("advertising", "LinkedIn", "snap.licdn.com", "px.ads.linkedin.com"),
  ...T("advertising", "X (Twitter)", "static.ads-twitter.com", "ads-api.twitter.com", "t.co/i/adsct"),
  ...T("advertising", "Pinterest", "ct.pinterest.com", "s.pinimg.com/ct"),
  ...T("advertising", "Snap", "sc-static.net", "tr.snapchat.com"),
  ...T("advertising", "Reddit", "redditstatic.com/ads", "alb.reddit.com"),
  ...T("advertising", "Yahoo", "ads.yahoo.com", "analytics.yahoo.com"),
  ...T("advertising", "Moat (Oracle)", "moatads.com"),
  ...T("advertising", "Integral Ad Science", "adsafeprotected.com"),
  ...T("advertising", "DoubleVerify", "doubleverify.com"),
  ...T("analytics", "Adobe", "omtrdc.net", "demdex.net", "2o7.net", "everesttech.net"),
  ...T("analytics", "Comscore", "scorecardresearch.com"),
  ...T("analytics", "Yandex", "mc.yandex.ru"),
  ...T("analytics", "Segment", "segment.com", "segment.io", "cdn.segment.com"),
  ...T("analytics", "Mixpanel", "mixpanel.com"),
  ...T("analytics", "Amplitude", "amplitude.com"),
  ...T("analytics", "Heap", "heapanalytics.com"),
  ...T("analytics", "HubSpot", "hs-analytics.net", "js.hs-scripts.com", "hs-banner.com", "hsadspixel.net"),
  ...T("analytics", "Chartbeat", "chartbeat.com", "chartbeat.net"),
  ...T("analytics", "Parse.ly", "parsely.com"),
  ...T("analytics", "New Relic", "nr-data.net"),
  ...T("analytics", "Optimizely", "optimizely.com"),
  ...T("analytics", "Cloudflare Web Analytics", "static.cloudflareinsights.com"),
  ...T("analytics", "Plausible", "plausible.io"),
  ...T("session-replay", "Hotjar", "hotjar.com", "hotjar.io"),
  ...T("session-replay", "FullStory", "fullstory.com"),
  ...T("session-replay", "Mouseflow", "mouseflow.com"),
  ...T("session-replay", "Crazy Egg", "crazyegg.com"),
  ...T("session-replay", "Smartlook", "smartlook.com"),
  ...T("session-replay", "LogRocket", "logrocket.io", "lr-ingest.io"),
  ...T("fingerprinting", "FingerprintJS", "fpjs.io", "fingerprint.com"),
  ...T("social", "Meta", "facebook.com/plugins"),
  ...T("social", "AddThis", "addthis.com"),
  ...T("social", "ShareThis", "sharethis.com"),
  ...T("consent", "OneTrust", "cookielaw.org", "onetrust.com"),
  ...T("consent", "Cookiebot", "cookiebot.com"),
  ...T("consent", "TrustArc", "trustarc.com"),
];

/** Inline snippets that reveal a tracker even when its script is injected later (e.g. through a tag manager). */
export const SIGNATURES: { pattern: RegExp; company: string; category: TrackerCategory; label: string }[] = [
  { pattern: /\bfbq\(\s*['"]init/, company: "Meta", category: "advertising", label: "Meta Pixel (fbq init)" },
  { pattern: /\bgtag\(\s*['"]config['"]\s*,\s*['"](G|UA|AW)-/, company: "Google", category: "analytics", label: "Google tag (gtag config)" },
  { pattern: /GTM-[A-Z0-9]{4,}/, company: "Google", category: "analytics", label: "Google Tag Manager container" },
  { pattern: /\b_hsq\b/, company: "HubSpot", category: "analytics", label: "HubSpot tracking queue" },
  { pattern: /\bttq\.load\(/, company: "TikTok", category: "advertising", label: "TikTok Pixel" },
  { pattern: /\b_linkedin_partner_id\b/, company: "LinkedIn", category: "advertising", label: "LinkedIn Insight tag" },
  { pattern: /\bhj\(\s*['"]|_hjSettings/, company: "Hotjar", category: "session-replay", label: "Hotjar settings" },
  { pattern: /\bclarity\(\s*['"]|clarity\.ms\/tag/, company: "Microsoft Clarity", category: "session-replay", label: "Clarity tag" },
  { pattern: /\bpintrk\(/, company: "Pinterest", category: "advertising", label: "Pinterest tag" },
  { pattern: /\bsnaptr\(/, company: "Snap", category: "advertising", label: "Snap Pixel" },
  { pattern: /\buetq\b/, company: "Microsoft", category: "advertising", label: "Microsoft UET tag" },
];

/** Finds the tracker entry for a URL, matching on host suffix and optional path prefix. */
export function matchTracker(url: string): TrackerEntry | undefined {
  let host = "", path = "";
  try {
    const u = new URL(url);
    host = u.hostname.toLowerCase().replace(/^www\./, "");
    path = u.pathname;
  } catch {
    return undefined;
  }
  return TRACKERS.find((t) => {
    const [d, ...rest] = t.domain.split("/");
    const p = rest.length ? `/${rest.join("/")}` : "";
    return (host === d || host.endsWith(`.${d}`)) && (!p || path.startsWith(p));
  });
}

/** Registrable-ish domain (last two labels, three for common second-level TLDs) used to decide first vs third party. */
export function siteOf(host: string) {
  const parts = host.toLowerCase().replace(/^www\./, "").split(".");
  const sld = ["co", "com", "org", "net", "ac", "gov", "edu"];
  if (parts.length >= 3 && sld.includes(parts[parts.length - 2]) && parts[parts.length - 1].length === 2) return parts.slice(-3).join(".");
  return parts.slice(-2).join(".");
}
