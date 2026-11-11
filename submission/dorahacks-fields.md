# DoraHacks submission: Mozilla Otari Hackathon (Devs Wilding)

Deadline: **11 Nov 2026, 17:59 UTC+1 (16:59 UTC)**, as shown on the DoraHacks timer.
Submit at https://dorahacks.io/hackathon/mozilla-devs-wilding → **Submit Build**.

| Field | What to put |
|---|---|
| Project name | Said vs Did |
| One line | Checks what a website's privacy policy says against what its homepage actually loads, with open-weight models on Otari. |
| Email used on Otari.ai | <your Otari email> |
| GitHub repo | https://github.com/AbdeldjalilChougui/SaidVsDid |
| Hackathon branch | `devs-wilding` |
| First commit where Otari came in | <link to the commit that adds `src/otari.ts`> |
| Track | Build on Otari! |
| Demo video (3–5 min, your own screen recording + voice) | <YouTube unlisted link> |
| Feedback video (3–5 min, your own screen recording + voice) | <YouTube unlisted link> |
| PRs / issues opened on mozilla-ai/otari | <link, or "none"> |

## Otari features used (paste into the description)

- **Open-weight models, distinct roles:** researcher (Qwen), analyst (code model), judge (Llama / gpt-oss, through a routing policy), writer (Gemma / Mistral).
- **Web search + web fetch:** `otari_web_search` and `otari_web_fetch` find and read the privacy policy on the gateway.
- **Code execution:** `otari_code_execution` recomputes the tracker statistics in Otari's sandbox. The app cross-checks the result against its own count.
- **Guardrails:** the prompt-injection guardrail runs on requests that carry fetched web content (monitor for the researcher, **block** for the judge).
- **Per-user budgets:** an Otari service key, with `user` set per person, so each user gets their own daily budget.
- **Budgets and spending limits:** a daily end-user budget, plus a ceiling on the key.
- **Model routing and fallbacks:** the judge calls the `svd-judge` routing policy, which falls back to a second open-weight model.

## Description (paste)

Said vs Did turns a privacy policy into something you can check. Paste a website.

1. The server loads the homepage the way a browser does on a first visit and lists every third-party script, pixel and iframe, matched against a curated tracker list. This step uses no AI.
2. An open-weight researcher model finds and reads the privacy policy with Otari's web search and web fetch, and extracts the concrete promises.
3. A second model recounts the trackers by running Python in Otari's code sandbox.
4. A third model, behind a prompt-injection guardrail, judges each promise against the evidence: contradicted, consistent or unclear, with the hosts that prove it.
5. A writer model produces a plain-language grade and tips.

Every person gets their own Otari budget through a service key, so the app can be public without one user draining it. The UI shows exactly which models Otari served, the tools used, the guardrail verdict and the user's budget, for every scan.

Why it matters: privacy policies are written to be skipped. This makes "we don't sell your data" checkable against what the site really loads before you click accept. That is Mozilla's open-web mission, in one click.
