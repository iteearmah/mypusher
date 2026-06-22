require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.set('trust proxy', 1); // Trust first proxy (Cloudways uses Nginx/Varnish)
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Store connected clients and their subscriptions
const clients = new Map();

wss.on('connection', (ws) => {
  const socketId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
  clients.set(socketId, { ws, channels: new Set() });

  // 1. Send connection established
  ws.send(JSON.stringify({
    event: 'pusher:connection_established',
    data: JSON.stringify({
      socket_id: socketId,
      activity_timeout: 120
    })
  }));

  ws.on('message', (message) => {
    try {
      const parsed = JSON.parse(message);
      const { event, data } = parsed;

      if (event === 'pusher:subscribe') {
        const { channel } = typeof data === 'string' ? JSON.parse(data) : data;
        clients.get(socketId).channels.add(channel);
        
        ws.send(JSON.stringify({
          event: 'pusher_internal:subscription_succeeded',
          channel: channel,
          data: '{}'
        }));
        console.log(`Client ${socketId} subscribed to ${channel}`);
      } else if (event === 'pusher:ping') {
        ws.send(JSON.stringify({ event: 'pusher:pong', data: '{}' }));
      }
    } catch (err) {
      console.error('Error handling message:', err);
    }
  });

  ws.on('close', () => {
    clients.delete(socketId);
    console.log(`Client ${socketId} disconnected`);
  });
});

app.get('/', (req, res) => {
  res.send('Custom Pusher-compatible Realtime Server is running');
});

// Endpoint to trigger events (Broadcast to local clients)
app.post('/message', (req, res) => {
  const { channel, event, data } = req.body;
  const payload = JSON.stringify({
    event: event,
    channel: channel,
    data: typeof data === 'string' ? data : JSON.stringify(data)
  });

  let recipientCount = 0;
  clients.forEach((clientInfo) => {
    if (clientInfo.channels.has(channel)) {
      clientInfo.ws.send(payload);
      recipientCount++;
    }
  });

  console.log(`Event "${event}" triggered on channel "${channel}". Sent to ${recipientCount} clients.`);
  res.status(200).send({ message: 'Message sent', recipients: recipientCount });
});

// Mock authentication endpoint
app.post('/pusher/auth', (req, res) => {
  const socketId = req.body.socket_id;
  const channel = req.body.channel_name;
  // In a real app, you'd check user sessions here
  const auth = {
    auth: `local-key:${Math.random().toString(36).substring(7)}`
  };
  res.send(auth);
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
