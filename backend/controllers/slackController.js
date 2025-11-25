const { classifyMessage } = require('../services/messageClassifier');

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
  
  console.log('='.repeat(80) + '\n');

  // TODO: Store in Supabase if relevant
  // if (classification.isRelevant) {
  //   await storeTicket(event, classification);
  // }
};

module.exports = {
  handleUrlVerification,
  handleSlackEvent
};
