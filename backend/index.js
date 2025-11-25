const express = require("express");
const bodyParser = require("body-parser");
const slackRoutes = require("./routes/slack");

const app = express();

// Middleware
app.use(bodyParser.json());

// Routes
app.use("/slack", slackRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({ 
    status: "running",
    service: "Nixo FDE Slackbot",
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Nixo FDE Slackbot listening on port ${PORT}`);
  console.log(`📡 Slack events endpoint: http://localhost:${PORT}/slack/events`);
});
