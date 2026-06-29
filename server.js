require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const http = require('http');
const https = require('https');
const config = require('./config');
const { initWebSocketServer } = require('./lib/websocket');
const routes = require('./routes');

const app = express();
const server = http.createServer(app);

// Initialize WebSocket server
initWebSocketServer(server);

// Middleware
app.use(cors());
app.set('trust proxy', 1);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Routes
app.use('/', routes);

// Start server
server.listen(config.port, () => {
  console.log(`Server started on port ${config.port}`);
  
  // Optional self-pinging to keep Render instance awake
  if (config.selfPing.url) {
    const { url, interval } = config.selfPing;
    const protocol = url.startsWith('https') ? https : http;
    
    setInterval(() => {
      protocol.get(url, (res) => {
        console.log(`Self-ping sent to ${url}: ${res.statusCode}`);
      }).on('error', (err) => {
        console.error(`Self-ping error: ${err.message}`);
      });
    }, interval);
    console.log(`Self-pinging ${url} every ${interval / 1000 / 60} minutes`);
  }
});
