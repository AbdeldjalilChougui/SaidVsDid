# Feedback video (3–5 min). Your own screen recording with your voice

Answer the 4 questions honestly from your own experience. Below are notes from building it; replace them with what you saw.

1. **What did you build with Otari, and which features did you use?** Walk through `src/otari.ts` (one chat call with `tools`, `guardrails` and `user`) and `src/pipeline.ts` (the 4 roles). Show the dashboard pages you configured: service key, end-user budget, tools, guardrail, routing policy.
2. **What worked well?**
   - Server-side tools (web search, fetch and code execution) on open-weight models with a single `tools: [{type: ...}]` entry, with no tool loop to write.
   - Per-user budgets with no key per person: just the `user` field on a service key.
   - Response headers (`Otari-Guardrails`, `Otari-End-User-Budget`) that an app can show directly.
3. **What didn't work, or cost time?** Note real friction you hit, for example:
   - finding the exact model ids for open-weight models;
   - which tools are enabled by default on the hosted workspace;
   - guardrail profile names.

   Show any error message from the scan's trace table.
4. **What's missing, and what would you change?** Ideas:
   - a per-request "dry run" that says which features would apply;
   - guardrail verdicts returned in the JSON body as well as the header;
   - a public catalogue of open-weight model ids with their tool-calling support.
