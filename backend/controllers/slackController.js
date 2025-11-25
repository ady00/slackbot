const { classifyMessage } = require('../services/messageClassifier');
const { groupAndStoreMessage } = require('../services/ticketService');

/**
 * Handle Slack URL verification challenge
 */
const handleUrlVerification = (req, res) => {
  const { challenge } = req.body;
  console.log('✓ Slack URL verification successful');
  return res.json({ challenge });
};

/**
 * Handle incoming Slack events
 */
const handleSlackEvent = async (req, res) => {
  const { event } = req.body;

  // Acknowledge receipt immediately (Slack requires response within 3 seconds)
  res.sendStatus(200);

  // Process event asynchronously
  try {
    await processEvent(event);
  } catch (error) {
    console.error('Error processing Slack event:', error);
  }
};

/**
 * Process different types of Slack events
 */
const processEvent = async (event) => {
  if (!event) return;

  // Handle message events
  if (event.type === 'message' && !event.subtype) {
    await handleMessageEvent(event);
  }

  // Handle other event types as needed
  // if (event.type === 'app_mention') { ... }
};

/**
 * Handle message events - classify and filter for FDE relevance
 */
const handleMessageEvent = async (event) => {
  const { text, user, channel, ts, thread_ts } = event;

  // Skip bot messages
  if (event.bot_id) {
    return;
  }

  console.log('\n' + '='.repeat(80));
  console.log('📨 NEW SLACK MESSAGE');
  console.log('='.repeat(80));
  console.log('Message:', text);
  console.log('User:', user);
  console.log('Channel:', channel);
  console.log('-'.repeat(80));

  // Classify the message
  const classification = await classifyMessage({
    text,
    user,
    channel,
    ts,
    thread_ts
  });

  // Print classification result
  if (classification.isRelevant) {
    console.log('🚩 FLAGGED AS RELEVANT');
    console.log('Category:', classification.category.toUpperCase());
    console.log('Confidence:', (classification.confidence * 100).toFixed(0) + '%');
    console.log('Reasoning:', classification.reasoning);
  } else {
    console.log('⚪ IRRELEVANT (filtered out)');
    console.log('Reasoning:', classification.reasoning);
  }
  
  console.log('-'.repeat(80));

  // Group and store in Supabase
  try {
    const result = await groupAndStoreMessage(event, classification);
    
    if (result.grouped) {
      console.log('🎯 GROUPED with existing ticket:', result.ticket.title);
      console.log('Ticket ID:', result.ticket.id);
    } else if (result.ticket) {
      console.log('🆕 NEW TICKET created:', result.ticket.title);
      console.log('Ticket ID:', result.ticket.id);
    } else {
      console.log('📝 Message stored (no ticket - irrelevant)');
    }
  } catch (error) {
    console.error('❌ Error storing message:', error.message);
  }
  
  console.log('='.repeat(80) + '\n');
};

module.exports = {
  handleUrlVerification,
  handleSlackEvent
};
