# Hosting on Cloudways

Cloudways is a managed hosting platform that supports Node.js applications. Since this project uses a custom WebSocket server, there are specific steps to ensure it runs correctly.

## 1. Create a Custom PHP Application
Cloudways doesn't have a "Node.js" application type, so you typically use a **Custom PHP Application** as a container.

1.  Log in to Cloudways and launch a new server or use an existing one.
2.  Add a new Application and select **Custom PHP** as the application type.

## 2. Install Node.js
Cloudways servers usually have Node.js pre-installed. You can verify this by SSHing into your server:
```bash
node -v
npm -v
```

## 3. Deploy Your Code
You can deploy your code via Git (recommended) or SFTP.

1.  Go to **Application Settings** -> **Deployment Via Git**.
2.  Add your repository URL and deploy the code to the `public_html` folder (or a subdirectory).

## 4. Install Dependencies
SSH into your server, navigate to your application directory, and run:
```bash
npm install --production
```

## 5. Configure Port and Environment
Cloudways doesn't allow you to open arbitrary ports. You must use the port assigned or use a reverse proxy. However, for Node.js, it's common to use a high port and let Cloudways' Nginx/Varnish stack handle the requests.

Check which ports are available or use the default port `3000`. You might need to contact Cloudways support if you need a specific port opened, but typically you can run the app on a port like `3000`, `3001`, etc.

## 6. Use PM2 to Run the Server
PM2 is a process manager for Node.js that will keep your server running even if it crashes or the server reboots.

1.  Install PM2 globally:
    ```bash
    npm install pm2 -g
    ```
2.  Start your server:
    ```bash
    pm2 start server.js --name "my-pusher-server"
    ```
3.  Ensure it starts on reboot:
    ```bash
    pm2 save
    pm2 startup
    ```

## 7. Nginx Configuration for WebSockets
For WebSockets to work behind Cloudways' Nginx proxy, you need to ensure the headers are passed correctly. You can usually do this in the Cloudways Panel under **Application Settings** -> **Varnish Settings** (you might want to disable Varnish for the WebSocket paths) and potentially adding custom Nginx rules if you have a dedicated server.

If you are using a custom domain with SSL (Let's Encrypt), Nginx will handle the SSL termination.

### Nginx Directive (Example)
If you have access to edit Nginx directives:
```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

## 8. Apache (.htaccess) Hosting
If your hosting stack uses **Apache** in front of the Node.js process (common for Cloudways "Custom PHP" applications), you can use the provided `.htaccess` file to reverse-proxy both HTTP and WebSocket traffic to the server.

1.  Place the `.htaccess` file in your application's web root (e.g. `public_html`).
2.  Make sure the following Apache modules are enabled: `mod_rewrite`, `mod_proxy`, `mod_proxy_http`, and `mod_proxy_wstunnel`.
3.  The rules forward requests to the Node.js server running on `127.0.0.1:3000`. Adjust the port if your server uses a different one.

```apache
RewriteEngine On

# Forward WebSocket connections to the Node.js server.
RewriteCond %{HTTP:Upgrade} =websocket [NC]
RewriteCond %{HTTP:Connection} upgrade [NC]
RewriteRule ^/?(.*) ws://127.0.0.1:3000/$1 [P,L]

# Forward regular HTTP requests to the Node.js server.
RewriteCond %{HTTP:Upgrade} !=websocket [NC]
RewriteRule ^/?(.*) http://127.0.0.1:3000/$1 [P,L]
```

With Apache handling SSL termination, clients can connect over `wss://` on port `443` while the Node.js server keeps listening on the local port.

## 9. Client Configuration
Once hosted, update your `index.html` or `MobileApp.js`:

```javascript
const pusher = new Pusher(PUSHER_KEY, {
  cluster: PUSHER_CLUSTER,
  wsHost: 'your-app-domain.com', // Your Cloudways app domain
  wsPort: 443,                   // Use 443 for SSL (WSS)
  forceTLS: true,                // Set to true for WSS
  disableStats: true,
  enabledTransports: ['ws', 'wss']
});
```

**Note:** If you are not using SSL (not recommended), use `wsPort: 80` and `forceTLS: false`.
