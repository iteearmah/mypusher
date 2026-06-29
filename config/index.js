const path = require('path');
const fs = require('fs');

const config = {
  port: process.env.PORT || 3000,
  pusher: {
    appId: process.env.PUSHER_APP_ID || 'YOUR_APP_ID',
    key: process.env.PUSHER_APP_KEY || 'YOUR_APP_KEY',
    secret: process.env.PUSHER_APP_SECRET || 'YOUR_APP_SECRET',
    cluster: process.env.PUSHER_APP_CLUSTER || 'mt1',
  },
  selfPing: {
    url: process.env.SELF_PING_URL,
    interval: parseInt(process.env.SELF_PING_INTERVAL) || 14 * 60 * 1000,
  },
  allowedOrigins: []
};

// Load allowed origins
if (process.env.ALLOWED_ORIGINS) {
  config.allowedOrigins = process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim());
  console.log('Allowed origins loaded from ALLOWED_ORIGINS environment variable:', config.allowedOrigins);
} else {
  const configPath = path.join(process.cwd(), 'allowed_origins.json');
  const exampleConfigPath = path.join(process.cwd(), 'allowed_origins.json.example');

  try {
    if (fs.existsSync(configPath)) {
      const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      config.allowedOrigins = fileConfig.allowedOrigins || [];
      console.log('Allowed origins loaded from allowed_origins.json:', config.allowedOrigins);
    } else if (fs.existsSync(exampleConfigPath)) {
      const fileConfig = JSON.parse(fs.readFileSync(exampleConfigPath, 'utf8'));
      config.allowedOrigins = fileConfig.allowedOrigins || [];
      console.log('allowed_origins.json not found. Loaded defaults from allowed_origins.json.example:', config.allowedOrigins);
    } else {
      console.log('No allowed_origins.json or allowed_origins.json.example found. WebSocket origin check is disabled.');
    }
  } catch (err) {
    console.error('Error loading allowed origins config:', err);
  }
}

module.exports = config;
