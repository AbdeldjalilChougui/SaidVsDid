// Minimal client for Mozilla's Otari gateway (OpenAI-compatible Chat Completions plus Otari's extras:
// server-side tools, guardrails, routing-policy model names, per-end-user budgets via `user`).
import "dotenv/config";

export const OTARI_URL = (process.env.OTARI_BASE_URL || "https://api.otari.ai/api/v1").replace(/\/$/, "");
export const OTARI_KEY = process.env.OTARI_API_KEY || "";
export const otariReady = () => !!OTARI_KEY;

export type OtariTool = "otari_web_search" | "otari_web_fetch" | "otari_code_execution";
export interface ChatOptions {
  model: string;
  system: string;
  user: string;
  tools?: OtariTool[];
  guard?: "monitor" | "block"; // prompt-injection guardrail mode for this request
  endUser?: string; // per-user budget: Otari tracks spend for this id on a service key
  maxToolIterations?: number;
  json?: boolean;
}
export interface Trace {
  role: string; requested: string; served?: string; tools: OtariTool[]; guardrails?: string; endUserBudget?: string;
  promptTokens?: number; completionTokens?: number; ms: number; ok: boolean; error?: string; toolCalls?: string[];
}
export class OtariError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) { super(message); }
}

let userFieldRejected = false;
let guardrailMissing = false;
export const guardrailsConfigured = () => !guardrailMissing;
export const perUserBudgets = () => !userFieldRejected;

export async function chat(role: string, o: ChatOptions): Promise<{ text: string; trace: Trace }> {
  try {
    return await chatOnce(role, { ...o, endUser: userFieldRejected ? undefined : o.endUser, guard: guardrailMissing ? undefined : o.guard });
  } catch (e) {
    // A regular (non-service) key cannot name end users: fall back to the key's own budget.
    const msg = (e as Error).message;
    if (o.endUser && !userFieldRejected && /'user' field does not match/i.test(msg)) {
      userFieldRejected = true;
      return chat(role, { ...o, endUser: undefined });
    }
    // No guardrail service on this workspace yet: run without it (the trace records why).
    if (o.guard && /no guardrails service is configured|guardrail.*not.*configured/i.test(msg)) {
      guardrailMissing = true;
      return chat(role, { ...o, guard: undefined });
    }
    throw e;
  }
}

async function chatOnce(role: string, o: ChatOptions): Promise<{ text: string; trace: Trace }> {
  const t0 = Date.now();
  const body: Record<string, unknown> = {
    model: o.model,
    messages: [{ role: "system", content: o.system }, { role: "user", content: o.user }],
    temperature: 0.1,
  };
  if (o.tools?.length) {
    body.tools = o.tools.map((type) => ({ type }));
    body.max_tool_iterations = o.maxToolIterations ?? 6;
  }
  if (o.guard) body.guardrails = [{ profile: process.env.OTARI_GUARDRAIL_PROFILE || "prompt-injection", mode: o.guard }];
  if (o.endUser) body.user = o.endUser;
  if (o.json && !o.tools?.length) body.response_format = { type: "json_object" };
  const trace: Trace = { role, requested: o.model, tools: o.tools ?? [], ms: 0, ok: false };
  const res = await fetch(`${OTARI_URL}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${OTARI_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(150_000),
  });
  trace.ms = Date.now() - t0;
  trace.guardrails = res.headers.get("otari-guardrails") ?? undefined;
  trace.endUserBudget = res.headers.get("otari-end-user-budget") ?? undefined;
  const raw = await res.text();
  let json: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  try { json = JSON.parse(raw); } catch { json = { error: { message: raw.slice(0, 300) } }; }
  if (!res.ok) {
    const code = json?.error?.code ?? json?.error?.type ?? json?.detail?.code;
    const msg = json?.error?.message ?? json?.detail?.message ?? json?.detail ?? raw.slice(0, 300);
    trace.error = `${res.status} ${code ?? ""} ${typeof msg === "string" ? msg : JSON.stringify(msg)}`.trim();
    throw Object.assign(new OtariError(trace.error, res.status, code), { trace });
  }
  trace.ok = true;
  trace.served = json.model;
  trace.promptTokens = json.usage?.prompt_tokens;
  trace.completionTokens = json.usage?.completion_tokens;
  const msg = json.choices?.[0]?.message ?? {};
  trace.toolCalls = (msg.tool_calls ?? []).map((c: { function?: { name?: string } }) => c.function?.name ?? "tool");
  let text: string = typeof msg.content === "string" ? msg.content : Array.isArray(msg.content) ? msg.content.map((c: { text?: string }) => c.text ?? "").join("") : "";
  if (!text && msg.reasoning_content) text = msg.reasoning_content;
  return { text, trace };
}

/** Models the key can use, and which of Otari's server tools are available to it. */
export async function discover() {
  const get = async (path: string) => {
    const r = await fetch(`${OTARI_URL}${path}`, { headers: { Authorization: `Bearer ${OTARI_KEY}` }, signal: AbortSignal.timeout(20_000) });
    if (!r.ok) throw new Error(`${path}: ${r.status} ${(await r.text()).slice(0, 200)}`);
    return r.json();
  };
  const models = await get("/models").catch((e) => ({ error: String(e) }));
  const tools = await get("/tools").catch((e) => ({ error: String(e) }));
  return { models, tools };
}

export const OPEN_WEIGHT = /(qwen|llama|gemma|mistral|mixtral|ministral|deepseek|gpt-oss|kimi|glm|phi-|olmo|nemotron|granite|hermes|smollm|minimax|devstral|codestral)/i;

/** Pulls the first JSON object out of a model answer (models sometimes wrap it in prose or fences). */
export function parseJson<T>(text: string): T {
  const clean = text.replace(/```(?:json)?/g, "").trim();
  const start = clean.search(/[[{]/);
  if (start < 0) throw new Error("no JSON in the model answer");
  const open = clean[start], close = open === "{" ? "}" : "]";
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < clean.length; i++) {
    const c = clean[i];
    if (inStr) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === open) depth++;
    else if (c === close && --depth === 0) return JSON.parse(clean.slice(start, i + 1));
  }
  throw new Error("unterminated JSON in the model answer");
}
