const express = require('express');
const router = express.Router();
const { handleUrlVerification, handleSlackEvent } = require('../controllers/slackController');
const { verifySlackRequest } = require('../middleware/slackVerification');

/**
 * Slack Events API endpoint
 * Handles URL verification and all event subscriptions
 */
router.post('/events', verifySlackRequest, (req, res) => {
  const { type } = req.body;

  // Handle URL verification challenge
  if (type === 'url_verification') {
    return handleUrlVerification(req, res);
  }

  // Handle event callbacks
  if (type === 'event_callback') {
    return handleSlackEvent(req, res);
  }

  // Unknown event type
  res.sendStatus(200);
});

module.exports = router;
