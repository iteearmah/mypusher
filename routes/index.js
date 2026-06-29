const express = require('express');
const path = require('path');
const { broadcast, getStats } = require('../lib/websocket');

const router = express.Router();

router.get('/', (req, res) => {
  res.send('Custom Pusher-compatible Realtime Server is running');
});

// Keep-alive endpoint
router.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

// Monitor dashboard
router.get('/monitor', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'monitor.html'));
});

// Monitor stats API
router.get('/monitor/stats', (req, res) => {
  res.json(getStats());
});

// Endpoint to trigger events (Broadcast to local clients)
router.post('/message', (req, res) => {
  const { channel, event, data } = req.body;
  broadcast(channel, event, data);
  res.status(200).send({ message: 'Message sent' });
});

// Standard Pusher REST API endpoint for triggering events
router.post('/apps/:appId/events', (req, res) => {
  const { name: event, channels, channel, data } = req.body;
  const targetChannels = channels || [channel];
  
  targetChannels.forEach(chan => {
    broadcast(chan, event, data);
  });

  res.status(200).send({});
});

// Mock authentication endpoint
router.post('/pusher/auth', (req, res) => {
  const socketId = req.body.socket_id;
  const channel = req.body.channel_name;
  // In a real app, you'd check user sessions here
  const auth = {
    auth: `local-key:${Math.random().toString(36).substring(7)}`
  };
  res.send(auth);
});

module.exports = router;
