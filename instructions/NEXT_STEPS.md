# Next Steps - Nixo FDE Slackbot

## Immediate Next Steps

### 1. Set Up Environment Variables
```bash
cd backend
cp .env.example .env
# Edit .env with your credentials:
# - SLACK_BOT_TOKEN (from Slack App settings)
# - SLACK_SIGNING_SECRET (from Slack App settings)
```

### 2. Test the Backend Locally
```bash
cd backend
npm install
npm run dev

# In another terminal, test the classifier:
node test-classifier.js
```

### 3. Set Up ngrok for Slack Events
```bash
# Install ngrok if you haven't
brew install ngrok  # macOS

# Start ngrok
ngrok http 3000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Add to Slack App Event Subscriptions:
#   Request URL: https://abc123.ngrok.io/slack/events
```

### 4. Configure Slack App
In your Slack App settings (api.slack.com/apps):

**OAuth & Permissions** - Add Bot Token Scopes:
- `channels:history` - View messages in public channels
- `channels:read` - View basic channel info
- `chat:write` - Send messages
- `groups:history` - View messages in private channels (if needed)
- `im:history` - View messages in DMs (if needed)

**Event Subscriptions**:
- Enable Events
- Request URL: `https://YOUR-NGROK-URL.ngrok.io/slack/events`
- Subscribe to bot events:
  - `message.channels` - Listen to messages in channels

**Install App** to your workspace and copy the Bot Token

## Next Development Tasks

### Phase 1: Database Integration (2-3 hours)
- [ ] Set up Supabase project
- [ ] Create `tickets` table schema
- [ ] Create `messages` table schema
- [ ] Add Supabase client to backend
- [ ] Update `slackController.js` to store classified messages
- [ ] Add deduplication logic

**Supabase Schema:**
```sql
-- tickets table
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL,
  confidence DECIMAL,
  first_message_ts TEXT,
  last_message_ts TEXT,
  channel_id TEXT,
  thread_ts TEXT,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID REFERENCES tickets(id),
  text TEXT,
  user_id TEXT,
  channel_id TEXT,
  message_ts TEXT UNIQUE,
  thread_ts TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Phase 2: Message Grouping (3-4 hours)
- [ ] Implement thread-based grouping (same `thread_ts`)
- [ ] Implement temporal grouping (messages within 5-10 mins)
- [ ] Add simple text similarity (keyword overlap)
- [ ] Optional: Use embeddings for semantic similarity
- [ ] Create grouping service in `services/messageGrouping.js`

### Phase 3: Frontend Dashboard (4-5 hours)
- [ ] Initialize Next.js app in `frontend/`
- [ ] Create ticket list component
- [ ] Create ticket detail view
- [ ] Add real-time updates (WebSocket or SSE)
- [ ] Style with Tailwind CSS
- [ ] Add filters (category, status, date)

**Next.js Setup:**
```bash
cd frontend
npx create-next-app@latest . --typescript --tailwind --app
npm install @supabase/supabase-js
```

### Phase 4: Real-time Updates (2-3 hours)
- [ ] Add WebSocket server or Server-Sent Events
- [ ] Emit events when new tickets are created
- [ ] Frontend listens for updates
- [ ] Update UI without refresh

### Phase 5: Polish & Testing (2-3 hours)
- [ ] Add Slack signature verification
- [ ] Improve error handling
- [ ] Add logging (Winston or Pino)
- [ ] Write integration tests
- [ ] Update README with complete setup instructions
- [ ] Create demo video/screenshots

## Time Estimate
- Database: 2-3 hours
- Grouping: 3-4 hours
- Frontend: 4-5 hours
- Real-time: 2-3 hours
- Polish: 2-3 hours
**Total: ~13-18 hours** (within your 15-20 hour budget)

## Testing Checklist
Before submission, test these scenarios:

1. **Bug Report**: "The login button doesn't work on mobile"
   - ✓ Should appear in dashboard as "bug"
   
2. **Feature Request**: "Can you add export to CSV?"
   - ✓ Should appear as "feature_request"
   
3. **Grouped Messages**: Two related messages in different times
   - ✓ Should group together in UI
   
4. **Irrelevant**: "Thanks!" or "See you tomorrow"
   - ✓ Should NOT appear in dashboard
   
5. **Latency**: Send message in Slack
   - ✓ Should appear in dashboard within 10 seconds

## Quick Commands Reference

```bash
# Backend
cd backend && npm run dev        # Start with auto-reload
cd backend && npm start          # Start production
cd backend && node test-classifier.js  # Run tests

# Frontend (after setup)
cd frontend && npm run dev       # Start Next.js dev server

# ngrok
ngrok http 3000                  # Expose local server

# Git
git status                       # Check changes
git add .                        # Stage all changes
git commit -m "message"         # Commit
git push                         # Push to remote
```
