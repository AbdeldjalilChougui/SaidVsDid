// Usage: pnpm scan <url> [--user alice] [--save]
import { mkdirSync, writeFileSync } from "node:fs";
import { scan } from "./pipeline.js";

const url = process.argv[2];
if (!url) { console.error("usage: pnpm scan <url> [--user id] [--save]"); process.exit(1); }
const i = process.argv.indexOf("--user");
const result = await scan(url, { endUser: i > 0 ? process.argv[i + 1] : "cli", emit: (step, status, detail) => console.log(`${status === "ok" ? "✓" : status === "start" ? "…" : status === "warn" ? "!" : "✗"} ${step.padEnd(8)} ${detail}`) });
console.log(`\n${result.report.grade}  ${result.report.headline}`);
for (const v of result.verdicts) {
  const c = result.claims.find((x) => x.id === v.id);
  console.log(`  [${v.verdict}] ${c?.claim}\n      → ${v.explanation} ${v.evidence ? `(${v.evidence})` : ""}`);
}
console.log("\nOtari calls:");
for (const t of result.traces) console.log(`  ${t.role.padEnd(10)} ${t.requested} → ${t.served ?? "-"} ${t.tools.join("+")} ${t.ms}ms ${t.ok ? "" : t.error} ${t.guardrails ? `guardrails=${t.guardrails}` : ""} ${t.endUserBudget ? `budget=${t.endUserBudget}` : ""}`);
if (result.warnings.length) console.log("\nWarnings:", result.warnings);
if (process.argv.includes("--save")) {
  mkdirSync("scans/examples", { recursive: true });
  const f = `scans/examples/${result.evidence.site}.json`;
  writeFileSync(f, JSON.stringify(result, null, 2));
  console.log(`saved ${f}`);
}
