# Written feedback (answer in your own words; notes from the build)

**1. When were you most tempted to skip Otari and call the provider directly? What happened?**
<Your answer. Candidate from the build: while working out which hosted open-weight models support tool calling with Otari's server-side tools, calling one provider directly would have been simpler to debug.>

**2. What did you end up building yourself that Otari should have done for you?**
<Candidate: a JSON extractor for model answers (open-weight models often wrap JSON in prose), and model discovery that picks open-weight models by role. A "structured output" guarantee across providers, and a filter for open-weight models in `/v1/models`, would remove both.>

**3. If the rules hadn't required Otari, would you have continued using Otari? Why or why not?**
<Candidate: yes for this app. Per-user budgets on a service key and gateway-run web and code tools are exactly what a public, free-to-use tool needs, and switching models or providers without changing code keeps it on open-weight models.>
