# Nixo FDE Slackbot 🤖


Built by **Advay** | November 2025

## 🎯 What It Does

automatically:
- **Listens** to Slack messages in real-time
- **Classifies** messages using Gemini AI (support, bug, feature request, question, irrelevant)
- **Groups** similar messages into unified tickets to prevent duplicates
- **Stores** everything in Supabase with full history
- **Exposes** REST API for frontend dashboards
- **Processes** messages in **<1.5 seconds** end-to-end
---

## 🚀 Quick Start

### Prerequisites

- **Node.js 16+** 
- **Supabase Account** 
- **Gemini API Key** 
- **ngrok** 


**1Clone and install dependencies**

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
   ✅ Classified: bug (confidence: 0.95)
   🔍 Group key: upload-error-500
   ✅ Created new ticket: 1 - Upload error with 500 status
   ```

4. **Query the API**:
   ```bash
   curl http://localhost:3000/api/tickets
   ```

---

## How It Works

### 1. Message Reception

Slack sends webhook to `/slack/events` when message posted.

### 2. AI Classification

Gemini 2.0 Flash analyzes message:

```javascript
{
  "category": "bug",           // support | bug | feature_request | question | irrelevant
  "confidence": 0.92,           // 0.0 - 1.0
  "reasoning": "User reporting error",
  "isRelevant": true
}
```

**Irrelevant messages** are stored but don't create tickets.

### 3. Group Key Generation

AI extracts core issue into kebab-case key:

```
Input:  "Can't upload PDF files, getting 413 error"
Output: "upload-pdf-413-error"
```

### 4. Fuzzy Matching

System finds existing tickets using **3-level strategy**:

**Level 1: Exact Match**
- Same group key + category

**Level 2: Jaccard Similarity**
- Calculates word overlap: `intersection / union`
- Threshold: 60%
- Example: `upload-pdf-error` ≈ `pdf-upload-error` → **Grouped**

**Level 3: Summary Text Search**
- PostgreSQL full-text search on summaries
- Fallback for short group keys

### 5. Storage

- **New issue** → Create ticket + store message
- **Existing issue** → Link message to ticket
- **Duplicates** → Prevented by unique constraint on `slack_ts`

---

### Benchmarks

| Operation | Target | Actual | Status |
|-----------|--------|--------|--------|
| AI Classification | <9s | ~0.5s | ✅ |
| Group Key Generation | <9s | ~0.5s | ✅ |
| Fuzzy Matching | <9s | ~0.1s | ✅ |
| Database Write | <9s | ~0.1s | ✅ |
| **Total E2E** | **<9s** | **~1.5s** | ✅ |
