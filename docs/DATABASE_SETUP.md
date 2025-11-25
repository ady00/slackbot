# Supabase Database Setup Guide

1. Go to your Supabase project: https://supabase.com/dashboard
2. Navigate to the **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy and paste the entire contents of `backend/database/schema.sql`
5. Click **Run** (or press Cmd/Ctrl + Enter)

## Database Schema Overview

### Tables

#### `tickets`
Stores **grouped** tickets representing similar customer issues.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `title` | TEXT | Auto-generated summary of the issue |
| `category` | TEXT | support, bug, feature_request, question |
| `status` | TEXT | open, in_progress, resolved, closed |
| `is_fixed` | BOOLEAN | Whether issue is resolved (toggled from frontend) |
| `group_key` | TEXT | AI-generated key for grouping similar messages |
| `similarity_summary` | TEXT | AI summary of what grouped messages are about |
| `first_channel_id` | TEXT | Slack channel of first message |
| `first_user_id` | TEXT | Slack user of first message |
| `created_at` | TIMESTAMPTZ | When ticket was created |
| `updated_at` | TIMESTAMPTZ | Last update time |
| `last_message_at` | TIMESTAMPTZ | When last message was added |

#### `messages`
Stores **individual** Slack messages, either grouped into tickets or marked irrelevant.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `ticket_id` | UUID | Foreign key to tickets (null if irrelevant) |
| `slack_ts` | TEXT | Slack message timestamp (unique) |
| `slack_channel_id` | TEXT | Slack channel ID |
| `slack_user_id` | TEXT | Slack user ID |
| `slack_thread_ts` | TEXT | Thread timestamp (if in thread) |
| `text` | TEXT | Message content |
| `category` | TEXT | Classification category |
| `is_relevant` | BOOLEAN | Whether message is FDE-relevant |
| `confidence` | DECIMAL | AI confidence score (0.0-1.0) |
| `reasoning` | TEXT | AI reasoning for classification |
| `embedding_summary` | TEXT | Summary for similarity matching |
| `created_at` | TIMESTAMPTZ | When message was received |

### Views

#### `tickets_with_counts`
Convenient view showing tickets with message counts and aggregated data.

```sql
SELECT * FROM tickets_with_counts WHERE status = 'open' ORDER BY last_message_at DESC;
```

#### `recent_activity`
Dashboard view showing recent ticket activity.

```sql
SELECT * FROM recent_activity WHERE is_fixed = false LIMIT 10;
```

## How Grouping Works

### Intelligent Deduplication

When a new relevant message arrives:

1. **AI Classification**: Gemini classifies it (bug, support, feature_request, question)
2. **Group Key Generation**: Gemini extracts core issue → generates normalized `group_key`
   - Example: "Login button broken" → `login-mobile-bug`
   - Example: "Can we export CSV?" → `csv-export-feature`
3. **Matching**: System searches for existing **open** tickets with:
   - Same `group_key`
   - Same `category`
4. **Grouping Decision**:
   - **Match found**: Add message to existing ticket ✅ (no duplicate)
   - **No match**: Create new ticket 🆕

### Example Grouping Scenario

**5 similar messages arrive:**

1. "Can we add CSV export?"
2. "Is there a way to export data to CSV?"
3. "Need CSV export feature"
4. "Would be great to have CSV download"
5. "Add CSV export please"

**Result:**
- All 5 messages grouped under **1 ticket**: "CSV Export Feature Request"
- `group_key`: `csv-export-feature`
- FDE sees 1 ticket with 5 messages (expandable to view all)
- **No duplicates!**

## API Endpoints

Once the database is set up, these endpoints will be available:

### Get All Tickets
```bash
GET http://localhost:3000/api/tickets
```

Returns all tickets with message counts, ordered by recent activity.

### Get Messages for a Ticket
```bash
GET http://localhost:3000/api/tickets/{ticket_id}/messages
```

Returns all individual messages grouped under a specific ticket.

### Update Ticket Status
```bash
PATCH http://localhost:3000/api/tickets/{ticket_id}
Content-Type: application/json

{
  "status": "resolved",
  "is_fixed": true
}
```

Marks a ticket as resolved.

## Testing the Database

After running the schema, test with SQL queries:

```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Should show: tickets, messages

-- Check table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tickets';

-- Insert test ticket
INSERT INTO tickets (title, category, group_key, similarity_summary, status)
VALUES ('Test Ticket', 'bug', 'test-bug', 'This is a test', 'open')
RETURNING *;

-- Verify insert
SELECT * FROM tickets;

-- Clean up test data
DELETE FROM tickets WHERE title = 'Test Ticket';
```

## Troubleshooting
