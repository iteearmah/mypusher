# Deploying to Render

This guide provides instructions on how to deploy your custom Pusher-compatible server to [Render](https://render.com/).

## Method 1: Blueprint Deployment (Recommended)

1. Push your code to a GitHub, GitLab, or Bitbucket repository.
2. Log in to your Render dashboard.
3. Click **Blueprint** in the top navigation or **New > Blueprint**.
4. Connect your repository.
5. Render will automatically detect the `render.yaml` file and configure the service.
6. Click **Apply** to deploy.

## Method 2: Manual Deployment

1. Log in to your Render dashboard.
2. Click **New > Web Service**.
3. Connect your repository.
4. Use the following settings:
   - **Name**: `mypusher` (or your preferred name)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Click **Advanced** to add environment variables if needed (the app defaults to port 10000 on Render).
6. Click **Create Web Service**.

## WebSocket Support

Render natively supports WebSockets. No additional configuration is required. Your server will be available at `https://your-app-name.onrender.com`.

When connecting your Pusher client, use:
- **Host**: `your-app-name.onrender.com` (Do NOT include `https://`)
- **Port**: `443` (for HTTPS/WSS)
- **Use TLS**: `true`
- **Force TLS**: `true` (Recommended for Render)

Example configuration for `pusher-js`:
```javascript
const pusher = new Pusher('any-key', {
  wsHost: 'your-app-name.onrender.com',
  wsPort: 443,
  wssPort: 443,
  forceTLS: true,
  enabledTransports: ['ws', 'wss']
});
```

## Preventing Spin Down (Free Instance)

Render's free tier spins down services after 15 minutes of inactivity. To keep your server awake and avoid the ~50s "cold start" delay, you can use one of the following methods:

### Method 1: Self-Pinging (Easiest)

Add the following environment variable to your Render service:
- **Key**: `SELF_PING_URL`
- **Value**: `https://your-app-name.onrender.com/ping`

The server will automatically ping itself every 14 minutes to stay active.

### Method 2: External Pinger

Use a free service like [Cron-job.org](https://cron-job.org/) or [UptimeRobot](https://uptimerobot.com/) to ping your `/ping` endpoint every 5-10 minutes.
- **URL**: `https://your-app-name.onrender.com/ping`

## Security: Configuring Allowed Origins on Render

Since `allowed_origins.json` is ignored by Git, you should use an environment variable to define your allowed domains on Render.

1. In your Render Dashboard, go to your Web Service.
2. Click **Environment**.
3. Add a new Environment Variable:
   - **Key**: `ALLOWED_ORIGINS`
   - **Value**: `localhost, *.onrender.com, your-custom-domain.com` (comma-separated list)
4. Save Changes. Render will automatically redeploy your service with the new settings.
