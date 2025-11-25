# Nixo FDE Slackbot

Built by Advay.
Video demo [featured here](https://drive.google.com/file/d/1dGX8jz7boIY7zipXIMLwoSZa9POGbIhc/view?usp=sharing)

## What It Does

automatically:
- **Listens** to Slack messages in real-time
- **Classifies** messages using Gemini AI (support, bug, feature request, question, irrelevant)
- **Groups** similar messages into unified tickets to prevent duplicates
- **Stores** everything in Supabase with full history
- **Exposes** REST API for frontend dashboards
- **Processes** messages in **<1.5 seconds** end-to-end
---

### Prereqs!
- **Node.js 16+** 
- **Supabase Account** 
- **Gemini API Key** 
- **ngrok** 


### To set up: 

**1. Clone and install dependencies**

```bash
cd backend
npm install
```

**Set up environment variables**

Create `.env` in `/backend`:

```bash
# Slack Config stuff
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_SIGNING_SECRET=your-signing-secret-here

# Supabase Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here

# Gemini AI
GEMINI_API_KEY=your-gemini-api-key-here
MODEL_TO_USE=gemini-2.0-flash

# Server stuff
PORT=3000
```

**Create Supabase database**

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Create new project (if needed)
3. Navigate to **SQL Editor**
4. Copy contents of `backend/database/schema.sql`
5. Run the SQL

**Start the backend**

```bash
npm run dev
```

**ngrok exposure!**


```bash
ngrok http 3000
```

## Testing the bot out

### Trigger a Test Message

1. **Invite bot to a channel**:
   ```
   /invite @Nixo FDE Bot
   ```

2. **Send test messages**:
   ```
   Getting 500 error when uploading files
   ```
   ```
   Can you add dark mode?
   ```
   ```
   How do I reset my password?
   ```

3. **Check backend logs**:
   ```
   📨 Received message: "Getting 500 error when uploading files"
   Classified: bug (confidence: 0.95)
   Group key: upload-error-500
   Created new ticket: 1 - Upload error with 500 status
   ```

4. **Query the API**:
   ```bash
   curl http://localhost:3000/api/tickets
   ```

---

Check out the WRITEUP file for more info on the methodology behind the app. 
