const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const STEPS = { evidence: "What the homepage loads", policy: "What the privacy policy promises", analysis: "Tracker math in Otari's sandbox", judge: "Promise-by-promise verdicts", report: "Plain-language report" };
const LABEL = { advertising: "advertising", analytics: "analytics", "session-replay": "session replay", social: "social", fingerprinting: "fingerprinting", consent: "consent tools", other: "other third parties" };

try { const u = localStorage.getItem("svd-user"); if (u) $("user").value = u; } catch {}
for (const s of ["cnn.com", "healthline.com", "theguardian.com", "weather.com", "mozilla.org"]) {
  const b = document.createElement("button"); b.type = "button"; b.className = "chip"; b.textContent = s;
  b.onclick = () => { $("url").value = s; $("form").requestSubmit(); }; $("suggest").append(b);
}
fetch("/api/config").then((r) => r.json()).then((c) => {
  $("mode").innerHTML = c.mode === "otari"
    ? `Running on <b>Otari</b> (${esc(c.gateway)}) · researcher <b>${esc(c.researcher)}</b> · analyst <b>${esc(c.analyst)}</b> · judge <b>${esc(c.judge)}</b> · writer <b>${esc(c.writer)}</b>${c.error ? ` · <span class="warn">${esc(c.error)}</span>` : ""}`
    : "Offline mode: no Otari key, so the reading and judging use simple rules instead of models.";
});

$("form").onsubmit = (ev) => {
  ev.preventDefault();
  const url = $("url").value.trim(), user = $("user").value.trim();
  try { if (user) localStorage.setItem("svd-user", user); } catch {}
  $("go").disabled = true; $("result").classList.add("hidden"); $("progress").classList.remove("hidden");
  const items = {};
  $("steps").innerHTML = "";
  for (const [k, v] of Object.entries(STEPS)) {
    const li = document.createElement("li"); li.innerHTML = `<span class="dot"></span><span><b>${v}</b><br><span class="d"></span></span>`;
    $("steps").append(li); items[k] = li;
  }
  const es = new EventSource(`/api/scan?url=${encodeURIComponent(url)}&user=${encodeURIComponent(user)}`);
  es.onmessage = (m) => {
    const e = JSON.parse(m.data);
    const li = items[e.step];
    if (li) { li.className = e.status; li.querySelector(".d").textContent = e.detail; }
    if (e.step === "done") { render(e.data); es.close(); $("go").disabled = false; }
    if (e.step === "error" || e.step === "budget") {
      const li2 = document.createElement("li"); li2.className = "fail"; li2.innerHTML = `<span class="dot"></span><span><b>${e.step === "budget" ? "Budget reached" : "Error"}</b><br>${esc(e.detail)}</span>`;
      $("steps").append(li2); es.close(); $("go").disabled = false;
    }
  };
  es.onerror = () => { es.close(); $("go").disabled = false; };
};

function render(r) {
  $("result").classList.remove("hidden");
  $("grade").textContent = r.report.grade; $("grade").className = `grade ${r.report.grade}`;
  $("site").textContent = `${r.evidence.site} · checked ${new Date(r.finishedAt).toLocaleString()}${r.mode === "offline" ? " · offline mode" : ""}`;
  $("headline").textContent = r.report.headline;
  $("summary").innerHTML = (r.report.summary || []).map((s) => `<li>${esc(s)}</li>`).join("");
  const byId = Object.fromEntries((r.verdicts || []).map((v) => [v.id, v]));
  const order = { contradicted: 0, unclear: 1, consistent: 2 };
  const claims = [...r.claims].sort((a, b) => (order[byId[a.id]?.verdict] ?? 1) - (order[byId[b.id]?.verdict] ?? 1));
  $("claims").innerHTML = claims.length ? claims.map((c) => {
    const v = byId[c.id] || { verdict: "unclear", explanation: "", evidence: "" };
    return `<div class="claim ${v.verdict}"><span class="tag">${v.verdict}</span><b>${esc(c.claim)}</b><q>${esc(c.quote)}</q><div class="why">${esc(v.explanation)}</div>${v.evidence ? `<div class="ev">${esc(v.evidence)}</div>` : ""}</div>`;
  }).join("") : `<p class="small">No promises could be read from the policy.</p>`;
  $("policy").textContent = r.policyUrl ? `Policy read: ${r.policyUrl}` : ""; if (r.policyUrl) $("policy").href = r.policyUrl;
  const c = r.evidence.counts;
  $("counts").innerHTML = ["advertising", "session-replay", "analytics", "fingerprinting", "consent", "other"].map((k) =>
    `<div class="count ${(k === "advertising" || k === "session-replay") && c[k] ? "hot" : ""}"><b>${c[k]}</b><span>${LABEL[k]}</span></div>`).join("");
  const seen = new Set();
  $("trackers").innerHTML = r.evidence.thirdParties.filter((t) => t.tracker).filter((t) => { const k = t.tracker.company + t.tracker.category; if (seen.has(k)) return false; seen.add(k); return true; })
    .map((t) => `<span class="tk ${t.tracker.category}">${esc(t.tracker.company)} <small>${LABEL[t.tracker.category]}</small></span>`).join("")
    + (r.evidence.signatures || []).map((s) => `<span class="tk ${s.category}">${esc(s.label)} <small>inline snippet</small></span>`).join("");
  $("hosts").innerHTML = r.evidence.thirdParties.map((t) => `<div>${esc(t.host)}${t.tracker ? ` · ${esc(t.tracker.company)}` : ""}</div>`).join("") || "none";
  $("limits").innerHTML = r.evidence.limitations.map((l) => `<li>${esc(l)}</li>`).join("");
  $("tips").innerHTML = (r.report.tips || []).map((t) => `<li>${esc(t)}</li>`).join("");
  $("trace").innerHTML = r.traces.length ? `<table><thead><tr><th>Role</th><th>Model asked → served</th><th>Otari features</th><th>Time</th></tr></thead><tbody>${r.traces.map((t) => `<tr><td><b>${esc(t.role)}</b></td><td><code>${esc(t.requested)}</code>${t.served && t.served !== t.requested ? ` → <code>${esc(t.served)}</code>` : ""}</td><td>${t.tools.map((x) => `<span class="pill">${esc(x)}</span>`).join("")}${t.guardrails ? `<span class="pill">guardrail: ${esc(t.guardrails)}</span>` : ""}${t.endUserBudget ? `<span class="pill">per-user budget: ${esc(t.endUserBudget)}</span>` : ""}${t.ok ? "" : `<span class="pill" style="background:#ffe6ea;color:#8f1630">${esc(t.error)}</span>`}</td><td>${(t.ms / 1000).toFixed(1)} s</td></tr>`).join("")}</tbody></table>` : `<p class="small">No model calls (offline mode).</p>`;
  $("warnings").textContent = r.warnings.length ? `Notes: ${r.warnings.join(" · ")}` : "";
  $("result").scrollIntoView({ behavior: "smooth", block: "start" });
}
