const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config');
const { supabase } = require('./supabaseClient');

const genAI = new GoogleGenerativeAI(config.gemini.apiKey);

/**
 * Generate a group key and summary for a message
 * This determines which ticket the message should be grouped with
 */
const generateGroupingMetadata = async (messageText, category) => {
  try {
    const model = genAI.getGenerativeModel({ model: config.gemini.model });

    const prompt = `Extract the core issue/request from this ${category} message. Create a normalized group key that can match similar requests.

MESSAGE: "${messageText}"

Respond in JSON format:
{
  "group_key": "short-kebab-case-key-describing-core-issue",
  "summary": "Brief 1-sentence summary of what user wants/needs"
}

Examples:
- "Login button broken on mobile" → {"group_key": "login-mobile-bug", "summary": "Login functionality not working on mobile devices"}
- "Can we export to CSV?" → {"group_key": "csv-export-feature", "summary": "Request for CSV export functionality"}
- "Add dark mode please" → {"group_key": "dark-mode-feature", "summary": "Request for dark mode theme"}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let jsonText = response.text().trim();
    
    // Clean up markdown
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '');
    }
    
    const metadata = JSON.parse(jsonText);
    return metadata;

  } catch (error) {
    console.error('Error generating grouping metadata:', error);
    // Fallback: use first 5 words as group key
    const words = messageText.toLowerCase().split(/\s+/).slice(0, 5).join('-');
    return {
      group_key: words.replace(/[^a-z0-9-]/g, ''),
      summary: messageText.substring(0, 100)
    };
  }
};

/**
 * Find an existing ticket that matches this message
 * Uses exact group_key match and category match
 */
const findMatchingTicket = async (groupKey, category) => {
  try {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('group_key', groupKey)
      .eq('category', category)
      .eq('status', 'open') // Only match with open tickets
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      throw error;
    }

    return data; // null if not found
  } catch (error) {
    console.error('Error finding matching ticket:', error);
    return null;
  }
};

/**
 * Create a new ticket
 */
const createTicket = async (messageData, classification, groupKey, summary) => {
  try {
    const { data, error } = await supabase
      .from('tickets')
      .insert([
        {
          title: summary,
          category: classification.category,
          group_key: groupKey,
          similarity_summary: summary,
          first_channel_id: messageData.channel,
          first_user_id: messageData.user,
          status: 'open',
          is_fixed: false
        }
      ])
      .select()
      .single();

    if (error) throw error;
    console.log('✅ Created new ticket:', data.id, '-', summary);
    return data;
  } catch (error) {
    console.error('Error creating ticket:', error);
    throw error;
  }
};

/**
 * Store a message in the database
 */
const storeMessage = async (messageData, classification, ticketId = null) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert([
        {
          ticket_id: ticketId,
          slack_ts: messageData.ts,
          slack_channel_id: messageData.channel,
          slack_user_id: messageData.user,
          slack_thread_ts: messageData.thread_ts || null,
          text: messageData.text,
          category: classification.category,
          is_relevant: classification.isRelevant,
          confidence: classification.confidence,
          reasoning: classification.reasoning,
          embedding_summary: classification.reasoning
        }
      ])
      .select()
      .single();

    if (error) {
      // Handle duplicate message (already processed)
      if (error.code === '23505') { // Unique violation
        console.log('⚠️  Message already processed:', messageData.ts);
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error storing message:', error);
    throw error;
  }
};

/**
 * Main function: Group and store a classified message
 */
const groupAndStoreMessage = async (messageData, classification) => {
  try {
    // If message is irrelevant, just store it without a ticket
    if (!classification.isRelevant) {
      await storeMessage(messageData, classification, null);
      console.log('📝 Stored irrelevant message (no ticket created)');
      return { ticket: null, message: 'stored', grouped: false };
    }

    // Generate grouping metadata using AI
    const { group_key, summary } = await generateGroupingMetadata(
      messageData.text,
      classification.category
    );

    console.log('🔍 Group key:', group_key);

    // Try to find an existing ticket with the same group key
    let ticket = await findMatchingTicket(group_key, classification.category);

    if (ticket) {
      // Found existing ticket - group this message with it
      console.log('🎯 Matched to existing ticket:', ticket.id, '-', ticket.title);
      await storeMessage(messageData, classification, ticket.id);
      return { ticket, message: 'grouped', grouped: true };
    } else {
      // No matching ticket - create a new one
      ticket = await createTicket(messageData, classification, group_key, summary);
      await storeMessage(messageData, classification, ticket.id);
      return { ticket, message: 'new_ticket', grouped: false };
    }

  } catch (error) {
    console.error('Error in groupAndStoreMessage:', error);
    // Still try to store the message even if grouping fails
    try {
      await storeMessage(messageData, classification, null);
      return { ticket: null, message: 'stored_without_grouping', error: error.message };
    } catch (storageError) {
      throw storageError;
    }
  }
};

/**
 * Get all tickets with their messages
 */
const getAllTickets = async () => {
  try {
    const { data, error } = await supabase
      .from('tickets_with_counts')
      .select('*')
      .order('last_message_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching tickets:', error);
    throw error;
  }
};

/**
 * Get messages for a specific ticket
 */
const getTicketMessages = async (ticketId) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching ticket messages:', error);
    throw error;
  }
};

/**
 * Update ticket status
 */
const updateTicketStatus = async (ticketId, status, isFixed) => {
  try {
    const { data, error } = await supabase
      .from('tickets')
      .update({ status, is_fixed: isFixed })
      .eq('id', ticketId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating ticket status:', error);
    throw error;
  }
};

module.exports = {
  groupAndStoreMessage,
  getAllTickets,
  getTicketMessages,
  updateTicketStatus,
  generateGroupingMetadata,
  findMatchingTicket
};
