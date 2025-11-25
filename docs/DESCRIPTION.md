Nixo Coding Exercise: FDE Slackbot
Goal (~15-20 hours)
Build a minimal Slackbot and dashboard that help a Forward-Deployed Engineer (FDE) stay on top of customer conversations.
Your Slackbot should live inside a simulated company workspace and be part of all channels that include customers. Whenever a customer sends a message that sounds like:
a support question,
a bug report,
a feature request, or
a general question relevant to the product or deployment,
…the bot should detect it and populate it in a simple UI.
If the message is casual or irrelevant (e.g., “thank you”, “let’s get dinner”), it should be ignored. Messages that relate to the same issue should be grouped together in the UI, even if they occur in different threads or channels.
The end goal: from your dashboard, an FDE should be able to instantly see all relevant customer messages with context.
It’s okay for the system to run entirely on localhost.

Core Requirements
Realtime: When a relevant message appears in Slack, it should show up in the UI within <10 seconds.
Grouping: Related messages (same issue) should be grouped intelligently. Describe your grouping logic and assumptions in your write-up.
De-duplication: No duplicate tickets should appear in the UI.
Classification: Messages should be filtered so that only relevant ones show up — document how you define “relevant to FDEs.”
Local-friendly: The project can run locally; you may use tunnels (ngrok, Cloudflare, etc.) if needed for Slack events.
Single FDE assumption: Assume there is only one FDE (you) and everyone else in the channels are customers.
No polling: Use events, sockets, or streams. But not polling.
You’ll need to register a Slackbot and configure the right scopes and event subscriptions. (This is intentionally part of the challenge. Figuring out the correct permissions and endpoints is something AI tools can’t fully automate.) Your system should demonstrate end-to-end data flow from Slack → backend → frontend dashboard. Use any stack and architecture you prefer.
