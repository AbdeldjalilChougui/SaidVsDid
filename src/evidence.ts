// What the site actually does: fetch its homepage and list every third-party resource it loads.
// Deterministic (no AI), so the evidence can be re-checked by anyone.
import { SIGNATURES, matchTracker, siteOf, type TrackerCategory } from "./trackers.js";

export interface ThirdParty { host: string; urls: string[]; tracker?: { company: string; category: TrackerCategory }; tags: string[] }
export interface Evidence {
  url: string; finalUrl: string; status: number; fetchedAt: string;
  site: string; thirdParties: ThirdParty[]; signatures: { label: string; company: string; category: TrackerCategory }[];
  cookies: { name: string; thirdParty: boolean }[];
  policyLinks: string[];
  counts: Record<TrackerCategory | "other", number>;
  limitations: string[];
}

const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36 SaidVsDid/1.0";

export function normalizeUrl(input: string) {
  const s = input.trim();
  const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
  if (!/^https?:$/.test(u.protocol)) throw new Error("only http(s) URLs");
  if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|\[?::1)/.test(u.hostname)) throw new Error("private addresses are not scanned");
  return u.toString();
}

/** Pulls resource URLs, inline signatures and privacy-policy links out of raw HTML. */
export function extractFromHtml(html: string, baseUrl: string) {
  const resources: { url: string; tag: string }[] = [];
  const add = (raw: string, tag: string) => {
    try {
      const u = new URL(raw.replace(/&amp;/g, "&"), baseUrl);
      if (/^https?:$/.test(u.protocol)) resources.push({ url: u.toString(), tag });
    } catch { /* ignore */ }
  };
  const attr = (tag: string, name: string) => new RegExp(`<${tag}\\b[^>]*?\\s${name}\\s*=\\s*["']([^"']+)["']`, "gi");
  for (const [tag, name] of [["script", "src"], ["iframe", "src"], ["img", "src"], ["link", "href"], ["source", "src"], ["embed", "src"]] as const) {
    for (const m of html.matchAll(attr(tag, name))) {
      if (tag === "link" && !/rel\s*=\s*["'][^"']*(stylesheet|preconnect|dns-prefetch|preload|prefetch|modulepreload)/i.test(m[0])) continue;
      add(m[1], tag);
    }
  }
  const signatures = SIGNATURES.filter((s) => s.pattern.test(html)).map((s) => ({ label: s.label, company: s.company, category: s.category }));
  const policyLinks: string[] = [];
  for (const m of html.matchAll(/<a\b[^>]*?href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const text = m[2].replace(/<[^>]+>/g, " ").toLowerCase();
    if (/privacy|privacidad|confidentialit|datenschutz|données personnelles|خصوصية/.test(text) || /privacy/i.test(m[1])) {
      try { policyLinks.push(new URL(m[1], baseUrl).toString()); } catch { /* ignore */ }
    }
  }
  const score = (u: string) => (/privacy[-_]?(policy|notice|statement)?/i.test(new URL(u).pathname) ? 2 : 0) + (/cookie|terms/i.test(u) ? -1 : 0) + (/article|news|story/i.test(u) ? -3 : 0);
  const ranked = [...new Set(policyLinks)].sort((a, b) => score(b) - score(a)).filter((u) => score(u) > -2);
  return { resources, signatures, policyLinks: ranked.slice(0, 5) };
}

export function summarize(url: string, finalUrl: string, status: number, html: string, setCookies: string[]): Evidence {
  const site = siteOf(new URL(finalUrl).hostname);
  const { resources, signatures, policyLinks } = extractFromHtml(html, finalUrl);
  const byHost = new Map<string, ThirdParty>();
  for (const r of resources) {
    const host = new URL(r.url).hostname.toLowerCase();
    if (siteOf(host) === site) continue;
    const tp = byHost.get(host) ?? { host, urls: [], tags: [] };
    if (tp.urls.length < 3) tp.urls.push(r.url);
    if (!tp.tags.includes(r.tag)) tp.tags.push(r.tag);
    const t = matchTracker(r.url);
    if (t && !tp.tracker) tp.tracker = { company: t.company, category: t.category };
    byHost.set(host, tp);
  }
  const thirdParties = [...byHost.values()].sort((a, b) => Number(!!b.tracker) - Number(!!a.tracker) || a.host.localeCompare(b.host));
  const counts = { advertising: 0, analytics: 0, social: 0, "session-replay": 0, fingerprinting: 0, consent: 0, other: 0 };
  for (const tp of thirdParties) counts[tp.tracker?.category ?? "other"]++;
  const cookies = setCookies.map((c) => {
    const name = c.split("=")[0].trim();
    const domain = /domain=\.?([^;]+)/i.exec(c)?.[1]?.toLowerCase();
    return { name, thirdParty: !!domain && siteOf(domain) !== site };
  });
  return {
    url, finalUrl, status, fetchedAt: new Date().toISOString(), site, thirdParties, signatures, cookies, policyLinks, counts,
    limitations: [
      "Only the homepage HTML is read; scripts injected later by a tag manager are seen through their inline signatures, not loaded.",
      "No cookies are accepted and no consent banner is clicked, so this is what a first-time visitor's browser is asked to load before saying yes.",
    ],
  };
}

export async function collectEvidence(input: string): Promise<{ evidence: Evidence; html: string }> {
  const url = normalizeUrl(input);
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html,*/*" }, redirect: "follow", signal: AbortSignal.timeout(20_000) });
  const html = (await res.text()).slice(0, 3_000_000);
  const setCookies = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  return { evidence: summarize(url, res.url || url, res.status, html, setCookies), html };
}

/** Fetches a policy page as plain text (used when the gateway's web fetch is not available). */
/** Renders a JavaScript-built page in headless Chromium (used when the raw HTML is nearly empty). */
async function renderText(url: string): Promise<string> {
  const pw = process.env.PLAYWRIGHT_MODULE || "/home/djalil/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/index.mjs";
  const { chromium } = await import(pw);
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/home/djalil/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome", headless: true });
  try {
    const page = await browser.newPage({ userAgent: UA });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(4000);
    return String(await page.evaluate("document.body.innerText")).replace(/\s+/g, " ").trim().slice(0, 60_000);
  } finally {
    await browser.close();
  }
}

export async function fetchText(url: string) {
  const raw = await fetchRawText(url);
  if (raw.length > 1500) return raw;
  try { const rendered = await renderText(url); return rendered.length > raw.length ? rendered : raw; } catch { return raw; }
}

async function fetchRawText(url: string) {
  const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow", signal: AbortSignal.timeout(20_000) });
  const html = await res.text();
  return decodeEntities(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<nav[\s\S]*?<\/nav>|<header[\s\S]*?<\/header>|<footer[\s\S]*?<\/footer>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim().slice(0, 60_000);
}

export function decodeEntities(s: string) {
  const named: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", times: "×", copy: "©", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", ndash: "–", mdash: "—", hellip: "…" };
  return s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&([a-z]+);/gi, (m, n) => named[n.toLowerCase()] ?? m);
}
