// Web server: streams each scan step to the page (Server-Sent Events) and serves the static UI.
import express from "express";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { otariReady, OTARI_URL } from "./otari.js";
import { roles, scan } from "./pipeline.js";

const app = express();
const PORT = Number(process.env.PORT || 4630);
mkdirSync("scans/examples", { recursive: true });

app.get("/api/config", async (_req, res) => {
  if (!otariReady()) return res.json({ mode: "offline", gateway: OTARI_URL });
  try { const r = await roles(); res.json({ mode: "otari", gateway: OTARI_URL, ...r }); }
  catch (e) { res.json({ mode: "otari", gateway: OTARI_URL, error: (e as Error).message }); }
});

app.get("/api/scan", async (req, res) => {
  const url = String(req.query.url ?? ""), user = String(req.query.user ?? "").slice(0, 64).replace(/[^\w.-]/g, "") || undefined;
  res.set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
  res.flushHeaders();
  const send = (step: string, status: string, detail: string, data?: unknown) => res.write(`data: ${JSON.stringify({ step, status, detail, data })}\n\n`);
  try {
    const result = await scan(url, { endUser: user, emit: send });
    const file = `scans/${result.evidence.site}-${Date.now()}.json`;
    writeFileSync(file, JSON.stringify(result, null, 2));
  } catch (e) {
    send("error", "fail", (e as Error).message);
  }
  res.end();
});

app.get("/api/examples", (_req, res) => {
  const files = readdirSync("scans/examples").filter((f) => f.endsWith(".json"));
  res.json(files.map((f) => JSON.parse(readFileSync(`scans/examples/${f}`, "utf8"))));
});

app.use(express.static(path.resolve("public")));
app.listen(PORT, () => console.log(`Said vs Did on http://localhost:${PORT} (${otariReady() ? `Otari: ${OTARI_URL}` : "offline mode: set OTARI_API_KEY in .env"})`));
