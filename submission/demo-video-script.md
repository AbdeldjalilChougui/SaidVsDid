# Demo video (3–5 min). Your own screen recording with your voice: no AI voice or AI video

Record with OBS or SimpleScreenRecorder at 1280×720 or higher, with the microphone on.

1. **0:00–0:30 · The problem.** Show the home page.
   > "Privacy policies say things like 'we don't sell your data'. Nobody can check that. Said vs Did does: it compares what the policy says with what the website actually loads."
2. **0:30–1:45 · Live scan.** Type `cnn.com` (or another site) and a user name, then click **Check it**. Talk over each step as it lights up:
   > "First, no AI: the server loads the homepage and finds N third-party hosts and N known trackers."
   > "Now the researcher, an open-weight model, finds and reads the policy using Otari's web search and web fetch."
   > "The analyst recounts the trackers by running Python in Otari's code sandbox, and the app checks that the numbers match."
   > "The judge, a different open-weight model, checks each promise, behind Otari's prompt-injection guardrail, because web pages are untrusted."
3. **1:45–2:45 · The result.** Read the grade and the headline. Point at one **contradicted** promise: read the quote, then the hosts that contradict it. Show the tracker chips: advertising, session replay.
4. **2:45–3:45 · Otari integration.** Scroll to **How Otari ran this scan**:
   - the model asked for and the model served, which shows the routing policy and fallback;
   - the tools used;
   - the guardrail header;
   - the per-user budget.

   Open the Otari dashboard: show **Activity** (the requests from the scan), the **end-user budget** for your user name, and the **routing policy**.
5. **3:45–4:15 · Per-user budget.** Optionally, show a user who has hit the budget, with the friendly "your daily scan budget is used up" message.
6. **4:15–4:30 · Close.**
   > "Open-weight models, 7 Otari features, and the open web gets a little more honest. Code on GitHub."
