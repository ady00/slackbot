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

    const prompt = `You are a classifier for a Forward-Deployed Engineer (FDE) support system. Analyze this Slack message and determine if it's critical/relevant.

RELEVANT CATEGORIES (respond with one):
- support: Help requests, "how do I", troubleshooting, stuck on something
- bug: Error reports, crashes, things broken/not working, unexpected behavior
- feature_request: Enhancement suggestions, "can we add", "would be nice to have"
- question: Product/deployment questions, clarifications about functionality
- irrelevant: Greetings, thanks, acknowledgments, casual chat, social plans

MESSAGE: "${text}"

Respond in JSON format only:
{
  "category": "support|bug|feature_request|question|irrelevant",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();
    
    // Extract JSON from response (handle markdown code blocks)
    let jsonText = responseText.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '');
    }
    
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
    console.error('Gemini classification error:', error);
    
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
