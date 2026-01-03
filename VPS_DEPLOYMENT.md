# VPS Deployment Guide (Ubuntu + Nginx + MySQL)

Since you are hosting multiple apps on the same VPS, follow these steps to ensure **Bet Square** runs uniquely without conflicts.

## 1. Avoid Port Conflicts 🔌
Your existing app is likely using a port (e.g., 3000 or 8080).
*   **Action:** Choose a distinct port for Bet Square's backend, e.g., **3005**.
*   **Method:** In your `.env` file on the server, set:
    ```bash
    PORT=3005
    ```

## 2. Database Isolation 🗄️
Don't use the `root` user or the same database name as your other app.
*   **Action:** Create a dedicated database and user.
    ```sql
    CREATE DATABASE bet_square_prod;
    CREATE USER 'betsquare'@'localhost' IDENTIFIED BY 'your_strong_password';
    GRANT ALL PRIVILEGES ON bet_square_prod.* TO 'betsquare'@'localhost';
    FLUSH PRIVILEGES;
    ```
*   **Update `.env`:**
    ```bash
    DB_NAME=bet_square_prod
    DB_USER=betsquare
    DB_PASSWORD=your_strong_password
    ```

## 3. Unique Process Name (PM2) 🚀
Use **PM2** to run your Node server. It keeps the app running and handles restarts.
*   **Action:** Give it a unique name so you distinguish it from your other app.
    ```bash
    # Instead of just 'server', name it:
    pm2 start server/index.js --name "bet-square-api"
    ```

## 4. Frontend Build 🏗️
Since Nginx handles static files efficiently:
1.  Run `npm run build` locally or on the server.
2.  Move the generated `dist` folder to a unique directory:
    ```bash
    sudo mkdir -p /var/www/bet-square
    sudo cp -r dist/* /var/www/bet-square/
    ```

## 5. Nginx Configuration (The Traffic Cop) 🚦
You need a **unique domain** or **subdomain** (e.g., `bets.yourdomain.com`) OR a specific path. A **Subdomain** is safest and cleanest.

### Create Config: `/etc/nginx/sites-available/bet-square`

```nginx
server {
    listen 80;
    server_name bets.yourdomain.com;  # <--- YOUR SUBDOMAIN HERE

    # 1. Serve Frontend
    location / {
        root /var/www/bet-square;
        index index.html;
        try_files $uri $uri/ /index.html;  # Critical for Vue Router
    }

    # 2. Proxy API Requests to Backend (Port 3005)
    location /api/ {
        proxy_pass http://localhost:3005;  # Match your PORT env var
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # 3. Serve Uploaded Images from Backend Folder
    # Assuming your repo is at /home/user/bet-square-ui
    location /uploads/ {
        alias /home/user/bet-square-ui/uploads/;
        autoindex off;
    }
}
```

### Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/bet-square /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Summary of Unique Identifiers
| Item | Your Value |
|------|------------|
| **Port** | `3005` (Example) |
| **System Service** | `pm2 start ... --name "bet-square-api"` |
| **Database** | `bet_square_prod` |
| **Domain** | `bets.yourdomain.com` |
| **Files** | `/var/www/bet-square` |

Follow this structure, and your new app will happily coexist with your existing one!
