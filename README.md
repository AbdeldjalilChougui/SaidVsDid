# Said vs Did

**The privacy policy says. The website does.** Paste a website: Said vs Did reads its privacy policy, loads its homepage the way a browser does on a first visit, and checks every promise against what actually loads, before you click "accept".

Built for **MozFest Developers Wilding: Online**, on [Otari](https://otari.ai), Mozilla.ai's open-source AI gateway, with open-weight models only.

## Why

- Privacy policies are long, and most people never read them.
- Even when someone does read one, they can't see whether the site keeps its word.
- A policy can say "we do not sell your personal information" while the homepage loads six ad networks and a session-replay recorder before you click anything.

Said vs Did puts the two side by side, one promise at a time, in plain language.

## Try it

```bash
pnpm install
cp .env.example .env   # add OTARI_API_KEY (a service key, see below)
pnpm start             # http://localhost:4630
```

| Do | See |
|---|---|
| Open http://localhost:4630, type `cnn.com` and click **Check it** | Five steps light up live: evidence → policy → sandbox math → verdicts → report. Then you get a grade, each promise marked **contradicted**, **consistent** or **unclear** with the hosts that prove it, the trackers grouped by purpose, and a table of the Otari calls made. |
| `pnpm scan healthline.com --user alice` | The same scan in the terminal, plus every Otari call: model asked and model served, tools, guardrail verdict, end-user budget. |
| `pnpm test` | 7 tests for the evidence extractor, tracker matching, URL safety and JSON parsing. |
| Run it without `OTARI_API_KEY` | Offline mode: the evidence is the same, but reading and judging use simple rules instead of models. |

## How it uses Otari

| Otari capability | Where it is used |
|---|---|
| **Open-weight models in distinct roles** | **Researcher** (Qwen) reads the policy. **Analyst** (a code model) does the tracker math. **Judge** (Llama, gpt-oss or a routing policy) gives the verdicts. **Writer** (Gemma or Mistral) writes the report. Models are discovered from `/v1/models` and can be overridden in `.env`. |
| **Web search + web fetch** | The researcher calls `otari_web_search` to find the policy and `otari_web_fetch` to read it, on the gateway. |
| **Code execution** | The analyst runs Python in Otari's sandbox (`otari_code_execution`) to count trackers by category. The app checks the result against its own count and shows whether they match. |
| **Guardrails** | Fetched web pages are untrusted, so the researcher runs with the `prompt-injection` guardrail in monitor mode and the judge in **block** mode. A page that tries to hijack the judge is refused, and the scan reports it. |
| **Per-user budgets** | The app uses an Otari **service key**. Every request names the person (`user: "svd:<name>"`), so each person gets their own daily budget and one heavy user can't drain the app. The page shows the budget Otari reports back, and a friendly message when it runs out. |
| **Budgets and spending limits** | A daily end-user budget, plus a spend ceiling on the key. |
| **Model routing and fallbacks** | Set `SVD_JUDGE_MODEL` to an Otari routing policy (e.g. `svd-judge`: an open-weight model with a second one as fallback). The trace shows the model asked for and the model that actually answered. |

### Otari setup (once, in the dashboard)

1. **Spend & budgets:** create an end-user budget, e.g. $0.10 per day.
2. **API keys → Create key → Advanced:** tick **Service key** and pick that budget as the default end-user budget. Put this key in `.env` as `OTARI_API_KEY`.
3. **Tools:** turn on Web search and Code execution for the workspace.
4. **Guardrails:** configure a prompt-injection guardrail and mandate it on the workspace (monitor). The judge's requests ask for `block`.
5. **Routing policies** (optional): create `svd-judge` with a fallback, then set `SVD_JUDGE_MODEL=svd-judge`.

## How a scan works

1. **Evidence, no AI** (`src/evidence.ts`): fetches the homepage and lists every third-party script, iframe, pixel and preload.
   - Each host is matched against a hand-curated tracker list (`src/trackers.ts`, inspired by Disconnect and EasyPrivacy).
   - Inline snippets such as the Meta Pixel (`fbq('init')`), Google Tag Manager containers and the TikTok Pixel are spotted even when the script itself is injected later.
   - Cookies set on the very first response are recorded.
2. **Researcher:** finds and reads the policy, then returns at most 8 concrete, checkable promises, each with an exact quote.
3. **Analyst:** recomputes the tracker statistics in Otari's sandbox.
4. **Judge:** compares each promise with the evidence. It is told to be fair: disclosed tracking counts as **consistent**, not contradicted.
5. **Writer:** produces an A–F grade, a headline, three bullets and practical tips.

## Limits (shown in the app too)

- Only the homepage is read. Scripts a tag manager injects later are detected through their inline snippets, not executed.
- No cookie banner is clicked. The check shows what a first-time visitor's browser is asked to load *before* consenting, which is what consent rules care about.
- Models can misread a policy. Every verdict shows the quote and the hosts behind it, so a person can check it.

## Built during the hackathon

Everything was written on 2026-11-11 for Developers Wilding. The Otari integration is the core of the project, not an add-on.

## License

MIT. See [LICENSE](LICENSE).
