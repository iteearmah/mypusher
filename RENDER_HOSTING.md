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
- **Host**: `your-app-name.onrender.com`
- **Port**: `443` (for HTTPS/WSS)
- **Use TLS**: `true`
