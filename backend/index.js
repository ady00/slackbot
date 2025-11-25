const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const slackRoutes = require("./routes/slack");
const ticketRoutes = require("./routes/tickets");
const { testConnection } = require("./services/supabaseClient");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3001",
    methods: ["GET", "POST"]
  }
});

app.set('io', io);

app.use(cors()); // enable for frontend
app.use(bodyParser.json());

// Routes
app.use("/slack", slackRoutes);
app.use("/api/tickets", ticketRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({ 
    status: "running",
    service: "Nixo FDE Slackbot",
    timestamp: new Date().toISOString(),
    websocket: "enabled"
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
  console.log(`🚀 Nixo FDE Slackbot listening on port ${PORT}`);
  console.log(`📡 Slack events endpoint: http://localhost:${PORT}/slack/events`);
  console.log(`📊 API endpoint: http://localhost:${PORT}/api/tickets`);
  console.log(`WebSocket server running`);
  
  // Test Supabase connection
  console.log('\nTesting Supabase connection...');
  await testConnection();
  console.log('');
});
