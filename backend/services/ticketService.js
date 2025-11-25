const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config');
const { supabase } = require('./supabaseClient');

const genAI = new GoogleGenerativeAI(config.gemini.apiKey);

/**
 * Generate a group key and summary for a message
 * Optimized for speed - single AI call with concise prompt
 */
const generateGroupingMetadata = async (messageText, category) => {
  try {
    const model = genAI.getGenerativeModel({ model: config.gemini.model });

    // Concise prompt for faster response
    const prompt = `Extract core issue. Respond JSON only:
{"group_key": "short-kebab-case", "summary": "brief summary"}

Message: "${messageText}"
Category: ${category}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let jsonText = response.text().trim();
    
    // Clean markdown
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    const metadata = JSON.parse(jsonText);
    return metadata;

  } catch (error) {
    console.error('Error generating grouping metadata:', error.message);
    // Fallback: deterministic group key from first words
    const normalized = messageText.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2)
      .slice(0, 4)
      .join('-');
    
    return {
      group_key: normalized || 'unknown-issue',
      summary: messageText.substring(0, 100)
    };
  }
};

/**
 * Calculate similarity score between two group keys using Jaccard similarity
 * @param {string} key1 - First group key
 * @param {string} key2 - Second group key
 * @returns {number} - Similarity score between 0 and 1
 */
const calculateSimilarity = (key1, key2) => {
  const words1 = new Set(key1.split('-').filter(w => w.length > 2));
  const words2 = new Set(key2.split('-').filter(w => w.length > 2));
  
  if (words1.size === 0 || words2.size === 0) return 0;
  
  // Jaccard similarity: intersection / union
  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
};

/**
 * Find an existing ticket that matches this message
 * Uses multi-level matching strategy:
 * 1. Exact match on group_key + category
 * 2. Fuzzy match using Jaccard similarity (threshold: 0.6)
 * 3. Summary text similarity for edge cases
 */
const findMatchingTicket = async (groupKey, category, summary) => {
  try {
    // Level 1: Exact match
    const { data: exactMatch, error: exactError } = await supabase
      .from('tickets')
      .select('*')
      .eq('group_key', groupKey)
      .eq('category', category)
      .in('status', ['open', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (exactError) throw exactError;
    if (exactMatch) {
      console.log('✅ Exact match found:', exactMatch.group_key);
      return exactMatch;
    }

    // Level 2: Fuzzy match on group_key (Jaccard similarity)
    const keyWords = groupKey.split('-').filter(w => w.length > 2);
    
    if (keyWords.length >= 2) {
      const { data: candidates, error: fuzzyError } = await supabase
        .from('tickets')
        .select('*')
        .eq('category', category)
        .in('status', ['open', 'in_progress'])
        .limit(20); // Increased for better fuzzy matching

      if (fuzzyError) throw fuzzyError;

      // Find best matching ticket using Jaccard similarity
      let bestMatch = null;
      let bestScore = 0;
      const SIMILARITY_THRESHOLD = 0.6; // 60% similarity required

      for (const ticket of candidates) {
        const score = calculateSimilarity(groupKey, ticket.group_key);
        
        if (score >= SIMILARITY_THRESHOLD && score > bestScore) {
          bestScore = score;
          bestMatch = ticket;
        }
      }

      if (bestMatch) {
        console.log(`🔍 Fuzzy match found (${(bestScore * 100).toFixed(0)}% similar):`, 
                    bestMatch.group_key, '≈', groupKey);
        return bestMatch;
      }
    }

    // Level 3: Summary text similarity (fallback for very short group keys)
    if (summary && summary.length > 20) {
      const { data: summaryMatches, error: summaryError } = await supabase
        .from('tickets')
        .select('*')
        .eq('category', category)
        .in('status', ['open', 'in_progress'])
        .textSearch('similarity_summary', summary.split(' ').slice(0, 5).join(' & '))
        .limit(3);

      if (!summaryError && summaryMatches && summaryMatches.length > 0) {
        // Return the most recent summary match
        console.log('📝 Summary match found:', summaryMatches[0].group_key);
        return summaryMatches[0];
      }
    }

    console.log('🆕 No matching ticket found - will create new');
    return null;
  } catch (error) {
    console.error('Error finding matching ticket:', error.message);
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
 * Prevents duplicates via unique constraint on slack_ts
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
      // Duplicate message already processed
      if (error.code === '23505') {
        console.log('⚠️  Duplicate message ignored:', messageData.ts);
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error storing message:', error.message);
    throw error;
  }
};

/**
 * Main function: Group and store a classified message
 * Optimized for minimal latency and API calls
 */
const groupAndStoreMessage = async (messageData, classification) => {
  try {
    // If irrelevant, store without ticket creation
    if (!classification.isRelevant) {
      await storeMessage(messageData, classification, null);
      console.log('📝 Stored irrelevant message');
      return { ticket: null, message: 'stored', grouped: false };
    }

    // Generate grouping metadata (single AI call)
    const { group_key, summary } = await generateGroupingMetadata(
      messageData.text,
      classification.category
    );

    console.log('🔍 Group key:', group_key);

    // Find matching ticket (fuzzy matching enabled)
    let ticket = await findMatchingTicket(group_key, classification.category, summary);

    if (ticket) {
      // Existing ticket found - group message
      console.log('🎯 Matched to existing ticket:', ticket.id);
      await storeMessage(messageData, classification, ticket.id);
      return { ticket, message: 'grouped', grouped: true };
    } else {
      // No match - create new ticket
      ticket = await createTicket(messageData, classification, group_key, summary);
      await storeMessage(messageData, classification, ticket.id);
      return { ticket, message: 'new_ticket', grouped: false };
    }

  } catch (error) {
    console.error('Error in groupAndStoreMessage:', error.message);
    
    // Fallback: store message without grouping
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
