const WebSocket = require('ws');
const crypto = require('crypto');
const config = require('../config');

// Store connected clients and their subscriptions
const clients = new Map();
const channelSubscribers = new Map(); // Map<channelName, Set<socketId>>

function initWebSocketServer(server) {
  const wss = new WebSocket.Server({ 
    server,
    verifyClient: (info) => {
      const origin = info.origin;
      
      // Allow connections with no origin (like from a mobile app or server-side client)
      if (!origin) return true;

      // If no allowed origins are configured, allow all connections
      if (!config.allowedOrigins || config.allowedOrigins.length === 0) {
        return true;
      }

      try {
        const url = new URL(origin);
        const hostname = url.hostname;

        // Check if hostname matches any allowed origin (including wildcards)
        const isAllowed = config.allowedOrigins.some(pattern => {
          // If the pattern starts with *., handle as wildcard
          if (pattern.startsWith('*.')) {
            const rootDomain = pattern.slice(2);
            return hostname === rootDomain || hostname.endsWith('.' + rootDomain);
          }
          // Exact match (ignoring protocol)
          return hostname === pattern;
        });

        if (isAllowed) return true;
      } catch (err) {
        console.error('Error parsing origin:', err);
      }
      
      console.warn(`Blocked connection from unauthorized origin: ${origin}`);
      return false;
    }
  });

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

  return wss;
}

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

function getStats() {
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

  return stats;
}

module.exports = {
  initWebSocketServer,
  broadcast,
  getStats
};
