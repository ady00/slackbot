const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(config.gemini.apiKey);

/**
 * Classify a message using Gemini AI to determine if it's relevant to FDE
 * @param {Object} messageData - Message data from Slack
 * @returns {Object} - Classification result
 */
const classifyMessage = async (messageData) => {
  const { text } = messageData;

  if (!text || text.trim().length === 0) {
    return {
      isRelevant: false,
      category: 'irrelevant',
      confidence: 1.0,
      reasoning: 'Empty message'
    };
  }

  try {
    const model = genAI.getGenerativeModel({ model: config.gemini.model });

    // Concise prompt for faster response
    const prompt = `Classify Slack message for FDE system.

Categories:
- support: help requests, troubleshooting
- bug: errors, crashes, broken functionality
- feature_request: enhancement suggestions
- question: product/deployment questions
- irrelevant: greetings, thanks, casual chat

Message: "${text}"

Respond JSON only:
{"category": "support|bug|feature_request|question|irrelevant", "confidence": 0.0-1.0, "reasoning": "brief reason"}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let jsonText = response.text().trim();
    
    // Clean markdown
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    const classification = JSON.parse(jsonText);

    const isRelevant = classification.category !== 'irrelevant';

    return {
      isRelevant,
      category: classification.category,
      confidence: classification.confidence,
      reasoning: classification.reasoning,
      text: text.substring(0, 200)
    };

  } catch (error) {
    console.error('Gemini classification error:', error.message);
    
    // Fallback: if message is very short or common phrases, mark irrelevant
    const shortPhrases = /^(thanks?|ty|ok|okay|hi|hello|hey|bye|lol|haha)$/i;
    if (text.length < 10 || shortPhrases.test(text.trim())) {
      return {
        isRelevant: false,
        category: 'irrelevant',
        confidence: 0.8,
        reasoning: 'Fallback: short casual message',
        error: error.message
      };
    }

    // Default to potentially relevant if we can't classify
    return {
      isRelevant: true,
      category: 'question',
      confidence: 0.5,
      reasoning: 'Fallback: classification error, defaulting to relevant',
      error: error.message
    };
  }
};

module.exports = {
  classifyMessage
};
