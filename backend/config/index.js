/**
Config management for Nixo FDE Slackbot
 */

require('dotenv').config();

const config = {
  slack: {
    botToken: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
  },
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.MODEL_TO_USE || 'gemini-2.0-flash',
  },
  server: {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
  }
};

const validateConfig = () => {
  const missing = [];
  
  if (!config.slack.botToken) missing.push('SLACK_BOT_TOKEN');
  if (!config.slack.signingSecret) missing.push('SLACK_SIGNING_SECRET');
  if (!config.gemini.apiKey) missing.push('GEMINI_API_KEY');
  
  if (missing.length > 0) {
    console.warn('⚠️  Warning: Missing environment variables:', missing.join(', '));
  }
};

validateConfig();

module.exports = config;
