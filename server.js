require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const http = require('http');
const https = require('https');
const WebSocket = require('ws');
const crypto = require('crypto');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.set('trust proxy', 1); // Trust first proxy (Cloudways uses Nginx/Varnish)
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Store connected clients and their subscriptions
const clients = new Map();
const channelSubscribers = new Map(); // Map<channelName, Set<socketId>>

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
        
        // Add to channelSubscribers map
        if (!channelSubscribers.has(channel)) {
          channelSubscribers.set(channel, new Set());
        }
        channelSubscribers.get(channel).add(socketId);
        
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
    const clientInfo = clients.get(socketId);
    if (clientInfo) {
      // Remove from all channel sets
      clientInfo.channels.forEach(channel => {
        const subscribers = channelSubscribers.get(channel);
        if (subscribers) {
          subscribers.delete(socketId);
          if (subscribers.size === 0) {
            channelSubscribers.delete(channel);
          }
        }
      });
    }
    clients.delete(socketId);
    console.log(`Client ${socketId} disconnected`);
  });
});

app.get('/', (req, res) => {
  res.send('Custom Pusher-compatible Realtime Server is running');
});

// Keep-alive endpoint to prevent Render free instance from spinning down
app.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

// Monitor dashboard
app.get('/monitor', (req, res) => {
  res.sendFile(path.join(__dirname, 'monitor.html'));
});

// Monitor stats API
app.get('/monitor/stats', (req, res) => {
  const stats = {
    totalClients: clients.size,
    totalChannels: channelSubscribers.size,
    channels: {},
    uptime: process.uptime(),
    memory: process.memoryUsage()
  };

  channelSubscribers.forEach((subscribers, channelName) => {
    stats.channels[channelName] = subscribers.size;
  });

  res.json(stats);
});

// Endpoint to trigger events (Broadcast to local clients)
app.post('/message', (req, res) => {
  const { channel, event, data } = req.body;
  broadcast(channel, event, data);
  res.status(200).send({ message: 'Message sent' });
});

// Standard Pusher REST API endpoint for triggering events
app.post('/apps/:appId/events', (req, res) => {
  const { name: event, channels, channel, data } = req.body;
  const targetChannels = channels || [channel];
  
  targetChannels.forEach(chan => {
    broadcast(chan, event, data);
  });

  res.status(200).send({});
});

function broadcast(channel, event, data) {
  const payload = JSON.stringify({
    event: event,
    channel: channel,
    data: typeof data === 'string' ? data : JSON.stringify(data)
  });

  let recipientCount = 0;
  const subscribers = channelSubscribers.get(channel);
  
  if (subscribers) {
    subscribers.forEach((socketId) => {
      const client = clients.get(socketId);
      if (client && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(payload);
        recipientCount++;
      }
    });
  }

  console.log(`Event "${event}" triggered on channel "${channel}". Sent to ${recipientCount} clients.`);
  return recipientCount;
}

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
  
  // Optional self-pinging to keep Render instance awake
  if (process.env.SELF_PING_URL) {
    const url = process.env.SELF_PING_URL;
    const protocol = url.startsWith('https') ? https : http;
    const interval = parseInt(process.env.SELF_PING_INTERVAL) || 14 * 60 * 1000; // Default 14 mins
    
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
