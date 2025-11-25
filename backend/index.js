const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const slackRoutes = require("./routes/slack");
const ticketRoutes = require("./routes/tickets");
const { testConnection } = require("./services/supabaseClient");

const app = express();

// Middleware
app.use(cors()); // Enable CORS for frontend
app.use(bodyParser.json());

// Routes
app.use("/slack", slackRoutes);
app.use("/api/tickets", ticketRoutes);

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
app.listen(PORT, async () => {
  console.log(`🚀 Nixo FDE Slackbot listening on port ${PORT}`);
  console.log(`📡 Slack events endpoint: http://localhost:${PORT}/slack/events`);
  console.log(`📊 API endpoint: http://localhost:${PORT}/api/tickets`);
  
  // Test Supabase connection
  console.log('\n🔌 Testing Supabase connection...');
  await testConnection();
  console.log('');
});
