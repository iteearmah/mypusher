# Custom Pusher-compatible Realtime Server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen.svg)](https://nodejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

A custom-built, lightweight WebSocket server that implements the Pusher protocol. This project allows you to use standard Pusher client libraries (like `pusher-js`) without needing an account or connection to the official Pusher service. Ideal for local development, private networks, or cost-effective real-time applications.

## 🚀 Features

- **Pusher Protocol Compatibility**: Drop-in replacement for the `pusher-js` client.
- **WebSocket Based**: High-performance, low-latency real-time communication.
- **No External Dependencies**: Run your own infrastructure without third-party services.
- **Easy Integration**: Includes ready-to-use examples for Web and Mobile (React Native).
- **Production Ready**: Includes guides for hosting on Cloudways and handling proxies.

## 🛠 Setup

### 1. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/your-username/mypusher.git
cd mypusher
npm install
```

### 2. Start the Server
```bash
node server.js
```
The server will start on port `3000` by default.

## 📱 Client Integration

### Web Client
Open `index.html` in your browser. It's pre-configured to connect to `localhost:3000`.

```javascript
const pusher = new Pusher('any-key', {
  wsHost: '127.0.0.1',
  wsPort: 3000,
  forceTLS: false,
  disableStats: true,
  enabledTransports: ['ws', 'wss']
});
```

### Mobile Client (React Native)
The `MobileApp.js` file provides a React Native component example.
1. Update `YOUR_SERVER_IP` to your computer's local IP address.
2. Ensure your mobile device is on the same network as the server.

## 📡 API Endpoints

- `POST /message`: Broadcast a message to a channel.
  - Body: `{ "channel": "my-channel", "event": "my-event", "data": { "message": "hello" } }`
- `POST /pusher/auth`: Mock authentication endpoint for private/presence channels.

## ☁️ Cloud Hosting

For detailed instructions on how to host this server on **Cloudways**, see [CLOUD_HOSTING.md](./CLOUD_HOSTING.md).

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
