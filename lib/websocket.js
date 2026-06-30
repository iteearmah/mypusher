const WebSocket = require('ws');
const crypto = require('crypto');
const geoip = require('geoip-country');
const config = require('../config');

// Store connected clients and their subscriptions
const clients = new Map();
const channelSubscribers = new Map(); // Map<channelName, Set<socketId>>

let messagesReceived = 0;
let messagesSent = 0;
const recentEvents = [];
const MAX_RECENT_EVENTS = 20;

function addEvent(type, details) {
  recentEvents.unshift({
    time: new Date().toISOString(),
    type,
    details
  });
  if (recentEvents.length > MAX_RECENT_EVENTS) {
    recentEvents.pop();
  }
}

function initWebSocketServer(server) {
  const wss = new WebSocket.Server({ 
    server,
    verifyClient: (info, callback) => {
      const origin = info.origin;
      const reqUrl = info.req.url;
      
      console.log(`Incoming WebSocket connection: Origin=${origin}, URL=${reqUrl}`);

      // Basic path check for Pusher protocol
      if (!reqUrl.includes('/app/') && !reqUrl.includes('protocol=')) {
        console.warn(`Blocked connection with invalid path: ${reqUrl}`);
        return callback(false, 400, 'Invalid Path');
      }

      // Allow connections with no origin (like from a mobile app or server-side client)
      if (!origin) {
        return callback(true);
      }

      // If no allowed origins are configured, allow all connections
      if (!config.allowedOrigins || config.allowedOrigins.length === 0) {
        return callback(true);
      }

      try {
        const url = new URL(origin);
        const hostname = url.hostname;

        // Check if hostname matches any allowed origin (including wildcards)
        const isAllowed = config.allowedOrigins.some(pattern => {
          // Handle protocol-inclusive patterns if any
          let targetPattern = pattern;
          if (pattern.includes('://')) {
            try {
              targetPattern = new URL(pattern).hostname;
            } catch (e) {}
          }

          // If the pattern starts with *., handle as wildcard
          if (targetPattern.startsWith('*.')) {
            const rootDomain = targetPattern.slice(2);
            return hostname === rootDomain || hostname.endsWith('.' + rootDomain);
          }
          // Exact match
          return hostname === targetPattern;
        });

        if (isAllowed) {
          return callback(true);
        }
      } catch (err) {
        console.error('Error parsing origin:', err);
      }
      
      console.warn(`Blocked connection from unauthorized origin: ${origin}`);
      return callback(false, 403, 'Unauthorized Origin');
    }
  });

  wss.on('connection', (ws, req) => {
    const socketId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
    
    // Get IP address from request
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const geo = geoip.lookup(ip);
    const country = geo ? geo.country : 'Unknown';

    clients.set(socketId, { ws, channels: new Set(), ip, country });
    addEvent('connect', `ID: ${socketId}, Country: ${country}`);

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
          addEvent('subscribe', `ID: ${socketId}, Channel: ${channel}`);
          
          ws.send(JSON.stringify({
            event: 'pusher_internal:subscription_succeeded',
            channel: channel,
            data: '{}'
          }));
          console.log(`Client ${socketId} subscribed to ${channel}`);
        } else if (event === 'pusher:ping') {
          ws.send(JSON.stringify({ event: 'pusher:pong', data: '{}' }));
          messagesSent++;
        }
        messagesReceived++;
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
      addEvent('disconnect', `ID: ${socketId}`);
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
        messagesSent++;
      }
    });
  }

  console.log(`Event "${event}" triggered on channel "${channel}". Sent to ${recipientCount} clients.`);
  addEvent('broadcast', `Event: ${event}, Channel: ${channel}, Recipients: ${recipientCount}`);
  return recipientCount;
}

function getStats() {
  const stats = {
    totalClients: clients.size,
    totalChannels: channelSubscribers.size,
    channels: {},
    countries: {},
    messagesReceived: messagesReceived || 0,
    messagesSent: messagesSent || 0,
    recentEvents,
    uptime: process.uptime(),
    memory: process.memoryUsage()
  };

  channelSubscribers.forEach((subscribers, channelName) => {
    const channelCountries = new Set();
    subscribers.forEach(socketId => {
      const client = clients.get(socketId);
      if (client && client.country) {
        channelCountries.add(client.country);
      }
    });
    stats.channels[channelName] = {
      count: subscribers.size,
      countries: Array.from(channelCountries)
    };
  });

  clients.forEach((client) => {
    const country = client.country || 'Unknown';
    stats.countries[country] = (stats.countries[country] || 0) + 1;
  });

  return stats;
}

module.exports = {
  initWebSocketServer,
  broadcast,
  getStats
};
