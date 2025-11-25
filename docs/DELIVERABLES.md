What You Deliver
 - Repo link with source code.
 - README.md that covers:
 - How to run it locally (commands, env vars, tokens).
 - How to connect it to a Slack workspace (scopes, setup steps).
 - How to trigger your demo.
 - Any prerequisites (Slack app setup, public URL/tunnel, etc.).

Some Constraints & Hints To Keep in Mind
 - Architecture: Any stack is fine, just prioritize something you can ship in ~15 hours.
 - Data: Store tickets however you want, but I recommend Supabase.
 - Grouping: Your grouping doesn’t need to be perfect; just show intelligent heuristics (e.g., similarity by text, same thread, or recent temporal proximity).
 - Local Setup: If you need to expose endpoints for Slack event subscriptions, use ngrok or an equivalent tunnel.

Evaluation Criteria
 - Works end-to-end: A Slack message → visible in the dashboard in near-real time.
 - Latency & stability: Feels responsive and consistent.
 - Clarity: Clean structure, readable code, and runnable README.
 - Judgment: Sensible trade-offs for a 10–15h project.
 - Resourcefulness: How you unblocked yourself (Slack docs, AI tools, etc.).
 - Communication: Clear write-up on approach and assumptions.


