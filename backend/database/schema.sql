-- Nixo FDE Slackbot Database Schema
-- Execute this in your Supabase SQL Editor

-- =====================================================
-- TICKETS TABLE
-- Stores grouped/deduplicated tickets
-- =====================================================
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Ticket identification
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('support', 'bug', 'feature_request', 'question')),
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  is_fixed BOOLEAN NOT NULL DEFAULT false,
  
  -- Grouping metadata
  group_key TEXT NOT NULL, -- AI-generated key for grouping similar messages
  similarity_summary TEXT, -- AI-generated summary of what the grouped messages are about
  
  -- Slack context
  first_channel_id TEXT,
  first_user_id TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tickets_category ON tickets(category);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_group_key ON tickets(group_key);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at DESC);

-- =====================================================
-- MESSAGES TABLE
-- Stores individual Slack messages linked to tickets
-- =====================================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to ticket (can be null initially if message is irrelevant)
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  
  -- Slack metadata
  slack_ts TEXT NOT NULL UNIQUE, -- Slack message timestamp (unique identifier)
  slack_channel_id TEXT NOT NULL,
  slack_user_id TEXT NOT NULL,
  slack_thread_ts TEXT, -- If message is in a thread
  
  -- Message content
  text TEXT NOT NULL,
  
  -- Classification
  category TEXT NOT NULL CHECK (category IN ('support', 'bug', 'feature_request', 'question', 'irrelevant')),
  is_relevant BOOLEAN NOT NULL,
  confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  reasoning TEXT, -- AI reasoning for classification
  
  -- Grouping metadata
  embedding_summary TEXT, -- Brief summary for similarity matching
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_messages_ticket_id ON messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_messages_slack_ts ON messages(slack_ts);
CREATE INDEX IF NOT EXISTS idx_messages_category ON messages(category);
CREATE INDEX IF NOT EXISTS idx_messages_is_relevant ON messages(is_relevant);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update ticket's updated_at timestamp
CREATE OR REPLACE FUNCTION update_ticket_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE tickets
  SET 
    updated_at = NOW(),
    last_message_at = NOW()
  WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update ticket timestamp when new message is added
DROP TRIGGER IF EXISTS trigger_update_ticket_timestamp ON messages;
CREATE TRIGGER trigger_update_ticket_timestamp
  AFTER INSERT ON messages
  FOR EACH ROW
  WHEN (NEW.ticket_id IS NOT NULL)
  EXECUTE FUNCTION update_ticket_timestamp();

-- Function to update ticket's updated_at on row update
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update tickets.updated_at
DROP TRIGGER IF EXISTS trigger_tickets_updated_at ON tickets;
CREATE TRIGGER trigger_tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_modified_column();

-- =====================================================
-- VIEWS FOR EASY QUERYING
-- =====================================================

-- View: Tickets with message count
CREATE OR REPLACE VIEW tickets_with_counts AS
SELECT 
  t.*,
  COUNT(m.id) as message_count,
  ARRAY_AGG(m.text ORDER BY m.created_at) FILTER (WHERE m.text IS NOT NULL) as message_texts,
  ARRAY_AGG(m.slack_user_id) FILTER (WHERE m.slack_user_id IS NOT NULL) as users
FROM tickets t
LEFT JOIN messages m ON t.id = m.ticket_id
GROUP BY t.id;

-- View: Recent activity dashboard
CREATE OR REPLACE VIEW recent_activity AS
SELECT 
  t.id as ticket_id,
  t.title,
  t.category,
  t.status,
  t.is_fixed,
  t.created_at,
  t.last_message_at,
  COUNT(m.id) as message_count
FROM tickets t
LEFT JOIN messages m ON t.id = m.ticket_id
GROUP BY t.id
ORDER BY t.last_message_at DESC;

-- =====================================================
-- SAMPLE QUERIES (for reference)
-- =====================================================

-- Get all open tickets with messages
-- SELECT * FROM tickets_with_counts WHERE status = 'open';

-- Get all messages for a specific ticket
-- SELECT * FROM messages WHERE ticket_id = 'your-uuid-here' ORDER BY created_at;

-- Get recent unresolved tickets
-- SELECT * FROM recent_activity WHERE is_fixed = false LIMIT 10;

-- Mark ticket as resolved
-- UPDATE tickets SET status = 'resolved', is_fixed = true WHERE id = 'your-uuid-here';

COMMENT ON TABLE tickets IS 'Grouped tickets representing similar customer issues';
COMMENT ON TABLE messages IS 'Individual Slack messages, either grouped into tickets or marked irrelevant';
COMMENT ON COLUMN tickets.group_key IS 'AI-generated key for grouping similar messages together';
COMMENT ON COLUMN messages.embedding_summary IS 'Brief summary used for semantic similarity matching';
