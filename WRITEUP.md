## How it Works (the flow)

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
Message relevance is via the Gemini API. 

### Relevant Message Detection
When a Slack message arrives, Gemini AI classifies it into one of five categories:

| Category | Description | Creates Ticket? |
|----------|-------------|-----------------|
| `bug` | Error reports, broken functionality | ✅ Yes |
| `support` | Help requests, access issues | ✅ Yes |
| `feature_request` | New functionality asks | ✅ Yes |
| `question` | Product/deployment questions | ✅ Yes |
| `irrelevant` | Casual chat, greetings, thanks | ❌ No |

**Classification Prompt:**
```
Classify this Slack message for FDE relevance.
RELEVANT: support questions, bug reports, feature requests, deployment questions
IRRELEVANT: greetings, thanks, casual chat, off-topic
```
---

### 3. Grouping messages

AI extracts core issue into kebab-case key:

```
Input:  "Can't upload PDF files, getting 413 error"
Output: "upload-pdf-413-error"
```

### 4. Fuzzy Matching

System finds existing tickets using keyword matching.

There's a couple types of groupings we support: 

**Exact Match**
- Same group key + category

**Jaccard-esque Similarity**
- Calculates word overlap: `intersection / union`
- Example: `upload-pdf-error` ≈ `pdf-upload-issue` → **Grouped**

Tickets are matched by resource, not category. So Questions about Supabase credentials,
for instance, would be matched with a Support request for Supabase access, because fundamentally
they are asking for the same underlying resource. 

**Summary Text Search**
- PostgreSQL full-text search on summaries
- Fallback for short group keys
 - Used when API credits are too low to generate kebab-case summaries; very much a backup

### 5. Storage

- **New issue** → Create ticket + store message
- **Existing issue** → Link message to ticket
- **Duplicates** → Prevented by unique constraint on `slack_ts`

---

## Tech Stack

 - Backend
    - Node.js + Express - REST API server
    - Socket.io - WebSocket for real-time updates
    - Supabase - PostgreSQL database (tickets, messages)
    - Gemini 2.0 Flash - AI classification and grouping
    - ngrok - Local tunnel for Slack webhooks

 - Frontend
    - Next.js
    - Tailwind CSS
    - Shadcn

 - Other Tools
    - Slack API
    - Gemini API
    - Supabase (Postgres DB)

### Benchmarks

| Operation | Target | Actual | Status |
|-----------|--------|--------|--------|
| AI Classification | <10s | ~0.5s |✅ |
| Group Key Generation | <10s | ~0.5s |✅ |
| Fuzzy Matching | <10s | ~0.1s |✅ |
| Database Write | <10s | ~0.1s |✅ |
| **Total E2E** | **<9s** | **~1.5s** |✅ |

## Performance Stuff

**1. Gemini 2.0 Flash**
- Optimized for speed over depth
- ~500ms for classification + grouping combined
- Single API call handles both tasks

**2. Minimal Prompt Design**
```javascript
// Bad: Long, verbose prompts = slow
// Good: Concise, structured prompts
"Classify message. Return JSON only: {category, confidence, reasoning}"
```

**3. Database Optimization**
- Indexed columns: `group_key`, `status`, `created_at`
- `maybeSingle()` instead of `single()` (avoids errors on no match)
- `limit(50)` on fuzzy search to cap query time


### AI Usage

 - I used GitHub Copilot quite a lot while coding the FDE; Copilot is an effective tool for me
 and automates much of the boilerplate/basic codegen. When major issues arose (like classifying similar
 tickets) I would have to step in myself, and when creating the actual Slackbot's scopes/setting up 
 Supabase or Gemini I stepped in, but much of grunt work of the project was done with the help of AI tools. Additionally, a lot of testing and generating docs was done with the help of AI.

  - I ran into quite a few challenges, such as setting up the UI in a clean format and implementing the 
  basic ifra for a Slackbot. I have built Discord bots before, but never worked with Slack, so it was a fun challenge to get used to the new Slack setup. A lot of consulting the Slack docs happened, as well 
  as querying StackOverflow and AI tools for help whenever I hit a roadblock. The total time it took to build this site was near ~6 hours coding, and maybe ~2-3 hours in the setup and writeups. 
 


