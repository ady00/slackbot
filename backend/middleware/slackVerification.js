/**
 * Middleware to verify Slack requests
 * Note: For production, you should verify the signing secret
 * Reference: https://api.slack.com/authentication/verifying-requests-from-slack
 */

const verifySlackRequest = (req, res, next) => {
  // For now, just validate that the request has the expected structure
  // TODO: Add signature verification using crypto and SLACK_SIGNING_SECRET
  
  const { type } = req.body;
  
  if (!type) {
    return res.status(400).json({ error: 'Invalid request: missing type' });
  }
  
  next();
};

module.exports = {
  verifySlackRequest
};
