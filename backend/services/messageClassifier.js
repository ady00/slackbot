/**
 * Classify whether a message is relevant to FDE (Forward-Deployed Engineer)
 * Categories: support, bug, feature_request, question, irrelevant
 */

const IRRELEVANT_PATTERNS = [
  /^(thanks?|thank you|ty|thx|tysm)!*$/i,
  /^(ok|okay|sounds good|perfect|great|awesome|cool)!*$/i,
  /^(hi|hello|hey|morning|afternoon|evening)!*$/i,
  /^(bye|goodbye|see you|ttyl|cya|later)!*$/i,
  /(lunch|dinner|coffee|meeting|calendar|social)/i,
  /^(lol|haha|hehe|😂|👍|🎉|💯)$/i,
  /^(np|no problem|you're welcome|yw|anytime)!*$/i,
  /^(got it|will do|on it|roger|copy|ack|acknowledged)!*$/i
];

const SUPPORT_PATTERNS = [
  /\b(help|assist|support|issue|problem|not working|doesn't work|can't|unable to)\b/i,
  /\b(how do i|how can i|stuck|confused)\b/i
];

const BUG_PATTERNS = [
  /\b(bug|crash|crashed|fail|failed|error|exception|broken|glitch)\b/i,
  /\b(500|404|timeout|not responding|down)\b/i,
  /\b(unexpected|incorrect|wrong|misbehaving)\b/i,
  /\b(clicked|pressed|selected).+(crash|error|fail|broke|stopped)/i
];

const FEATURE_REQUEST_PATTERNS = [
  /\b(feature|enhancement|improvement|suggestion|would be nice|wish|want)\b/i,
  /\b(can we|could we|is it possible|add|implement)\b/i,
  /\b(should have|need to have|missing)\b/i
];

const QUESTION_PATTERNS = [
  /\?$/,
  /^(what|when|where|why|who|which|whose)\b/i,
  /\b(is there|are there|does|do|will|would|could)\b/i,
  /^how (do|can|should|to|does)\b/i,
  /\bhow (do|can|should) (i|we|you)\b/i
];

/**
 * Classify a message and determine if it's relevant to FDE
 * @param {Object} messageData - Message data from Slack
 * @returns {Object} - Classification result
 */
const classifyMessage = async (messageData) => {
  const { text } = messageData;

  // Check if message is irrelevant (casual conversation)
  if (isIrrelevant(text)) {
    return {
      isRelevant: false,
      category: 'irrelevant',
      confidence: 0.9
    };
  }

  // Check for specific categories
  const categories = [];
  let highestConfidence = 0;
  let primaryCategory = 'question'; // default

  // Check for bug reports
  if (matchesPatterns(text, BUG_PATTERNS)) {
    categories.push('bug');
    highestConfidence = Math.max(highestConfidence, 0.85);
    primaryCategory = 'bug';
  }

  // Check for feature requests
  if (matchesPatterns(text, FEATURE_REQUEST_PATTERNS)) {
    categories.push('feature_request');
    const confidence = 0.8;
    if (confidence > highestConfidence) {
      highestConfidence = confidence;
      primaryCategory = 'feature_request';
    }
  }

  // Check for support questions
  if (matchesPatterns(text, SUPPORT_PATTERNS)) {
    categories.push('support');
    const confidence = 0.8;
    if (confidence > highestConfidence) {
      highestConfidence = confidence;
      primaryCategory = 'support';
    }
  }

  // Check for general questions
  if (matchesPatterns(text, QUESTION_PATTERNS)) {
    categories.push('question');
    if (highestConfidence === 0) {
      highestConfidence = 0.7;
      primaryCategory = 'question';
    }
  }

  // If no patterns matched, consider it potentially relevant if it's substantive
  const isSubstantive = isSubstantiveMessage(text);
  const isRelevant = categories.length > 0 || isSubstantive;

  // If not substantive and no categories matched, mark as irrelevant
  if (!isSubstantive && categories.length === 0) {
    return {
      isRelevant: false,
      category: 'irrelevant',
      categories: [],
      confidence: 0.9,
      text: text.substring(0, 200)
    };
  }

  return {
    isRelevant,
    category: primaryCategory,
    categories,
    confidence: highestConfidence || (isRelevant ? 0.5 : 0.1),
    text: text.substring(0, 200) // Store preview
  };
};

/**
 * Check if message matches irrelevant patterns
 */
const isIrrelevant = (text) => {
  if (!text || text.trim().length < 2) return true;
  
  const normalizedText = text.trim().toLowerCase();
  
  return IRRELEVANT_PATTERNS.some(pattern => pattern.test(normalizedText));
};

/**
 * Check if text matches any of the given patterns
 */
const matchesPatterns = (text, patterns) => {
  return patterns.some(pattern => pattern.test(text));
};

/**
 * Determine if message is substantive enough to be relevant
 */
const isSubstantiveMessage = (text) => {
  // Must be at least 15 characters and contain some meaningful words
  if (text.length < 15) return false;
  
  // Check for substantive words (not just greetings/acknowledgments)
  const words = text.toLowerCase().split(/\s+/);
  const meaningfulWords = words.filter(word => 
    word.length > 3 && 
    !['the', 'and', 'that', 'this', 'with', 'from'].includes(word)
  );
  
  return meaningfulWords.length >= 3;
};

module.exports = {
  classifyMessage
};
