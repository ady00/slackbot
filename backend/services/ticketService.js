const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config');
const { supabase } = require('./supabaseClient');

const genAI = new GoogleGenerativeAI(config.gemini.apiKey);

/**
 * Generate a group key and summary for a message
 * Uses ULTRA-BROAD grouping - focuses on single core concept
 */
const generateGroupingMetadata = async (messageText, category) => {
  try {
    const model = genAI.getGenerativeModel({ model: config.gemini.model });

    // Ultra-simple prompt - forces broad, consistent grouping
    const prompt = `Analyze this Slack message and provide:
1. group_key: 1-2 words in kebab-case identifying the CORE RESOURCE (e.g., "supabase-access", "vercel-deploy")
2. summary: A CLEAR TICKET TITLE (5-10 words) - THIS IS REQUIRED!

CRITICAL RULES:
- group_key: Use the SAME key for ALL messages about the same resource
- summary: MUST be a professional ticket title, NEVER empty, NEVER just "brief"

Examples:
"Can you add export to CSV?" → {"group_key": "csv-export", "summary": "Feature request: Add CSV export functionality"}
"The login page is broken" → {"group_key": "login-issue", "summary": "Login page not working correctly"}
"I don't see a button for it" → {"group_key": "ui-missing", "summary": "Missing UI button or element"}
"Who has access to Vercel?" → {"group_key": "vercel-access", "summary": "Request for Vercel deployment access"}

Message: "${messageText}"

Respond with valid JSON only (no markdown, no code blocks):
{"group_key": "resource-topic", "summary": "Clear descriptive ticket title"}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let jsonText = response.text().trim();
    
    // Clean markdown
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').replace(/```/g, '');
    
    const metadata = JSON.parse(jsonText);
    
    // Force simplification: max 2 words
    if (metadata.group_key) {
      const parts = metadata.group_key.toLowerCase().split('-').filter(w => w.length > 2);
      metadata.group_key = parts.slice(0, 2).join('-') || 'general-issue';
    }

    // CRITICAL: Ensure summary is a proper title, not empty or placeholder
    const invalidSummaries = ['brief', 'summary', 'title', 'n/a', 'na', 'none', ''];
    if (!metadata.summary || 
        metadata.summary.trim() === '' || 
        invalidSummaries.includes(metadata.summary.toLowerCase().trim()) ||
        metadata.summary.length < 5) {
      // Generate a proper title from the message
      const cleanMessage = messageText.replace(/[!?.,]+/g, '').trim();
      metadata.summary = cleanMessage.length > 60 
        ? cleanMessage.substring(0, 60) + '...'
        : cleanMessage;
    }
    
    console.log(`Generated: key="${metadata.group_key}" | title="${metadata.summary}"`);
    return metadata;

    

  } catch (error) {
    console.error('Error generating grouping metadata:', error.message);
    // Fallback: use first 2 significant words
    const words = messageText.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3);
    
    const groupKey = words.slice(0, 2).join('-') || 'unknown';
    
    return {
      group_key: groupKey,
      summary: messageText.substring(0, 100)
    };
  }
};

/**
 * Calculate similarity - VERY aggressive matching
 * Requires just ONE common word to match
 */
const calculateSimilarity = (key1, key2) => {
  const words1 = new Set(key1.split('-').filter(w => w.length > 2));
  const words2 = new Set(key2.split('-').filter(w => w.length > 2));
  
  if (words1.size === 0 || words2.size === 0) return 0;
  
  // Semantic keyword groups - if ANY match, boost heavily
  const semanticGroups = [
    new Set(['api', 'key', 'token', 'credential', 'password', 'secret', 'access', 'auth']),
    new Set(['supabase', 'database', 'db', 'postgres', 'sql']),
    new Set(['login', 'authentication', 'signin', 'signup', 'session']),
    new Set(['deploy', 'deployment', 'production', 'staging', 'build']),
    new Set(['error', 'bug', 'issue', 'problem', 'broken', 'failing', 'crash']),
    new Set(['setup', 'config', 'configuration', 'install', 'init']),
    new Set(['gpt', 'openai', 'ai', 'model', 'llm']),
  ];
  
  // Check for shared words from same semantic group
  let semanticBoost = 0;
  for (const group of semanticGroups) {
    const has1 = [...words1].some(w => group.has(w));
    const has2 = [...words2].some(w => group.has(w));
    
    if (has1 && has2) {
      semanticBoost = 0.5; // HUGE boost if same semantic category
      break;
    }
  }
  
  // Direct word overlap
  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);
  
  const jaccardScore = intersection.size / union.size;
  
  // If ANY word matches, we're at least 33% similar
  const hasAnyMatch = intersection.size > 0 ? 0.33 : 0;
  
  // Return maximum of all scores
  return Math.min(1.0, Math.max(jaccardScore, hasAnyMatch, semanticBoost));
};

/**
 * Find matching ticket - VERY aggressive matching
 * 
 * GROUPING STRATEGY:
 * - Category is IGNORED when finding matches (QUESTION + SUPPORT about same resource → grouped)
 * - The ticket KEEPS its original category from the first message
 * - Each message stores its own category in the messages table
 */
const findMatchingTicket = async (groupKey, category, summary) => {
  try {
    // Level 1: Exact match on group_key (ignore category!)
    const { data: exactMatch, error: exactError } = await supabase
      .from('tickets')
      .select('*')
      .eq('group_key', groupKey)
      .in('status', ['open', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (exactError) throw exactError;
    if (exactMatch) {
      console.log('Exact match found:', exactMatch.group_key);
      return exactMatch;
    }

    // Level 2: Fuzzy match - ignore category, match by resource similarity
    const { data: candidates, error: fuzzyError } = await supabase
      .from('tickets')
      .select('*')
      .in('status', ['open', 'in_progress'])
      .limit(50);

    if (fuzzyError) throw fuzzyError;

    let bestMatch = null;
    let bestScore = 0;
    const SIMILARITY_THRESHOLD = 0.25; // Only 25% needed! (1 word out of 4)

    for (const ticket of candidates) {
      const score = calculateSimilarity(groupKey, ticket.group_key);
      
      if (score >= SIMILARITY_THRESHOLD && score > bestScore) {
        bestScore = score;
        bestMatch = ticket;
      }
    }

    if (bestMatch) {
      console.log(`Fuzzy match found (${(bestScore * 100).toFixed(0)}% similar): "${bestMatch.group_key}" ≈ "${groupKey}"`);
      return bestMatch;
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

  const safeTitle = summary && summary.trim() !== '' 
  ? summary 
  : messageData.text.substring(0, 100);
  try {
    const { data, error } = await supabase
      .from('tickets')
      .insert([
        {
          title: safeTitle,
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
    console.log('Created new ticket:', data.id, '-', summary);
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
 * Main grouping function
 */
const groupAndStoreMessage = async (messageData, classification) => {
  try {
    if (!classification.isRelevant) {
      await storeMessage(messageData, classification, null);
      console.log('�� Stored irrelevant message');
      return { ticket: null, message: 'stored', grouped: false };
    }

    const { group_key, summary } = await generateGroupingMetadata(
      messageData.text,
      classification.category
    );

    console.log('Group key:', group_key);

    let ticket = await findMatchingTicket(group_key, classification.category, summary);

    if (ticket) {
      // NOTE: Ticket keeps its ORIGINAL category from the first message
      // New message's category is stored in messages table, but ticket category is unchanged
      console.log(`Grouped into existing ticket: ${ticket.id} (${ticket.category}) - "${ticket.title}"`);
      console.log(`  └─ New message category: ${classification.category} (preserved in messages table only)`);
      await storeMessage(messageData, classification, ticket.id);
      return { ticket, message: 'grouped', grouped: true };
    } else {
      ticket = await createTicket(messageData, classification, group_key, summary);
      await storeMessage(messageData, classification, ticket.id);
      return { ticket, message: 'new_ticket', grouped: false };
    }

  } catch (error) {
    console.error('Error in groupAndStoreMessage:', error.message);
    
    try {
      await storeMessage(messageData, classification, null);
      return { ticket: null, message: 'stored_without_grouping', error: error.message };
    } catch (storageError) {
      throw storageError;
    }
  }
};

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

const deleteTicket = async (ticketId) => {
  try {
    const { error: messagesError } = await supabase
      .from('messages')
      .delete()
      .eq('ticket_id', ticketId);

    if (messagesError) throw messagesError;

    const { error: ticketError } = await supabase
      .from('tickets')
      .delete()
      .eq('id', ticketId);

    if (ticketError) throw ticketError;
    
    console.log('Deleted ticket:', ticketId);
    return true;
  } catch (error) {
    console.error('Error deleting ticket:', error);
    throw error;
  }
};

module.exports = {
  groupAndStoreMessage,
  getAllTickets,
  getTicketMessages,
  updateTicketStatus,
  deleteTicket,
  generateGroupingMetadata,
  findMatchingTicket
};
