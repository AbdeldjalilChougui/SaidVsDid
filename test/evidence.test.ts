import { test } from "node:test";
import assert from "node:assert/strict";
import { decodeEntities, extractFromHtml, normalizeUrl, summarize } from "../src/evidence.js";
import { matchTracker, siteOf } from "../src/trackers.js";
import { parseJson } from "../src/otari.js";

const HTML = `<html><head>
<script src="https://www.googletagmanager.com/gtm.js?id=GTM-ABC123"></script>
<script async src="//securepubads.g.doubleclick.net/tag/js/gpt.js"></script>
<script src="https://static.hotjar.com/c/hotjar-1.js"></script>
<script src="/static/app.js"></script>
<script src="https://cdn.example-shop.com/lib.js"></script>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter">
<script>!function(f,b,e,v,n,t,s){}(window);fbq('init', '123');</script>
</head><body>
<img src="https://www.facebook.com/tr?id=123&amp;ev=PageView" height="1" width="1">
<a href="/legal/privacy-policy">Privacy Policy</a> <a href="/news/article-1">Read our privacy story</a>
</body></html>`;

test("tracker matching uses host suffix and path prefix", () => {
  assert.equal(matchTracker("https://securepubads.g.doubleclick.net/x.js")?.company, "Google");
  assert.equal(matchTracker("https://www.facebook.com/tr?id=1")?.category, "advertising");
  assert.equal(matchTracker("https://www.facebook.com/somepage"), undefined);
  assert.equal(matchTracker("https://notdoubleclick.net/x"), undefined);
});

test("first-party detection handles second-level country domains", () => {
  assert.equal(siteOf("www.bbc.co.uk"), "bbc.co.uk");
  assert.equal(siteOf("edition.cnn.com"), "cnn.com");
});

test("extracts third parties, trackers, inline snippets and the privacy link", () => {
  const e = summarize("https://example-shop.com", "https://www.example-shop.com/", 200, HTML, ["sid=1; Domain=.example-shop.com", "_fbp=2; Domain=.facebook.com"]);
  const hosts = e.thirdParties.map((t) => t.host);
  assert.ok(hosts.includes("securepubads.g.doubleclick.net"));
  assert.ok(!hosts.includes("cdn.example-shop.com"), "own subdomains are first party");
  assert.equal(e.counts.advertising, 2); // doubleclick + facebook pixel
  assert.equal(e.counts["session-replay"], 1); // hotjar
  assert.ok(e.signatures.some((s) => s.label.startsWith("Meta Pixel")));
  assert.ok(e.signatures.some((s) => s.label.includes("Tag Manager")));
  assert.equal(e.policyLinks[0], "https://www.example-shop.com/legal/privacy-policy");
  assert.deepEqual(e.cookies, [{ name: "sid", thirdParty: false }, { name: "_fbp", thirdParty: true }]);
});

test("stylesheets count only when linked as resources", () => {
  const { resources } = extractFromHtml(`<link rel="canonical" href="https://other.com/x"><link rel="preconnect" href="https://cdn.other.com">`, "https://a.com");
  assert.deepEqual(resources.map((r) => r.url), ["https://cdn.other.com/"]);
});

test("refuses private addresses and adds https", () => {
  assert.equal(normalizeUrl("cnn.com"), "https://cnn.com/");
  assert.throws(() => normalizeUrl("http://127.0.0.1:8000"));
  assert.throws(() => normalizeUrl("localhost"));
});

test("decodes HTML entities in policy text", () => {
  assert.equal(decodeEntities("Center &#8211; Close &times; &copy;"), "Center – Close × ©");
});

test("parses JSON wrapped in prose or code fences", () => {
  assert.deepEqual(parseJson<{ a: number }>('Sure!\n```json\n{"a": 1, "b": "x}"}\n```'), { a: 1, b: "x}" });
  assert.throws(() => parseJson("no json here"));
});
