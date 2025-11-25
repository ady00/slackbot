export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export type TicketCategory = 'support' | 'bug' | 'feature_request' | 'question' | 'irrelevant';

export interface Ticket {
  id: string;
  title: string;
  category: TicketCategory;
  group_key: string;
  similarity_summary: string;
  first_channel_id: string;
  first_user_id: string;
  status: TicketStatus;
  is_fixed: boolean;
  created_at: string;
  updated_at: string;
  message_count?: number;
  last_message_at?: string;
}

export interface Message {
  id: string;
  ticket_id: string | null;
  slack_ts: string;
  slack_channel_id: string;
  slack_user_id: string;
  slack_thread_ts: string | null;
  text: string;
  category: TicketCategory;
  is_relevant: boolean;
  confidence: number;
  reasoning: string;
  embedding_summary: string;
  created_at: string;
}

export interface WebSocketEvent {
  ticketId?: string;
  ticket?: Ticket;
  action: 'message_added' | 'status_changed' | 'created';
  status?: TicketStatus;
  is_fixed?: boolean;
  timestamp: string;
}
