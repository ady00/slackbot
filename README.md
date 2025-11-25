# Nixo FDE Slackbot

> A real-time Slackbot and dashboard for Forward-Deployed Engineers to track customer support tickets, bugs, and feature requests.

**by:** Advay

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your API keys:
npm run dev
```

The backend runs on `http://localhost:3000`

## 📊 Classification Performance

the FDE bot classifies messages into the following.
- **bug** - Error reports, crashes, broken functionality
- **support** - Help requests, troubleshooting questions
- **feature_request** - Enhancement suggestions
- **question** - Product/deployment questions
- **irrelevant** - Greetings, casual chat (filtered out)

**Average latency: 0.86s** 

## Environment Variables

Required in `backend/.env`:
```bash
GEMINI_API_KEY=AIzaSy...        # Your Gemini API key
MODEL_TO_USE=gemini-2.0-flash   # AI model 
SLACK_BOT_TOKEN=xoxb-...        # Your Slack bot token
SLACK_SIGNING_SECRET=...        # Your Slack signing secret
SUPABASE_URL=...                # Supabase project URL (optional)
SUPABASE_ANON_KEY=...           # Supabase key (optional)
```


## structure!

```
nixo/
├── backend/              # Node.js + Express backend
│   ├── controllers/     # Slack event handlers
│   ├── services/        # AI classification (Gemini)
│   ├── middleware/      # Request validation
│   ├── routes/          # API endpoints
│   └── config/          # Environment config
├── frontend/            # Next.js dashboard (coming soon)
└── instructions/        # Project documentation
```

---

Built for the Nixo FDE coding challenge