# Deployment Guide

This guide covers the steps to deploy the Bet Square application to a production environment (e.g., Render, Railway, DigitalOcean, Heroku).

## 1. Environment Variables

You must configure the following environment variables on your validated server/platform.

### Backend (.env)
| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | The port the server listens on (usually set by host) | `3000` |
| `DB_HOST` | Database Hostname | `aws.connect.psdb.cloud` |
| `DB_USER` | Database Username | `admin` |
| `DB_PASSWORD` | Database Password | `securepassword` |
| `DB_NAME` | Database Name | `bet_square_db` |
| `JWT_SECRET` | Secret for signing tokens (Make this long & random) | `complex_random_string` |
| `PAYSTACK_SECRET_KEY` | Paystack Secret Key | `sk_live_...` |
| `FRONTEND_URL` | The URL where your frontend is deployed (CORS) | `https://betsquare.com` |
| `NODE_ENV` | Set to 'production' | `production` |

### Frontend (.env)
These must be set in your build environment (e.g., Netlify/Vercel settings).
| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Full URL to your Backend API | `https://api.betsquare.com/api` |
| `VITE_PAYSTACK_PUBLIC_KEY` | Paystack Public Key | `pk_live_...` |

> **Note:** Frontend variables must start with `VITE_` to be exposed to the browser.

## 2. Database (MySQL)
Ensure you have a seeded MySQL database accessible from your backend.
- If using a cloud provider (PlanetScale, AWS RDS), ensure you have the connection details.
- Use the `schema.sql` (if available) or migration files to create the tables.

## 3. Uploads (Important!)
By default, the application saves uploaded images to the local `uploads/` folder.
- **VPS (DigitalOcean Droplet):** This works fine.
- **PaaS (Render, Heroku, Vercel):** The filesystem is ephemeral. **Uploads will be deleted** every time you redeploy or restart.
  - **Solution:** For a persistent production app on PaaS, you should modify the upload logic to use Cloudinary or AWS S3.

## 4. Build & Run

### Backend
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the server:
   ```bash
   node server/index.js
   ```

### Frontend
1. Install dependencies:
   ```bash
   npm install
   ```
2. Build for production:
   ```bash
   npm run build
   ```
3. Serve the `dist` folder. You can use a static host (Netlify, Vercel) or serve it via Nginx/Apache.

## 5. Security Checklist
- [ ] Ensure `JWT_SECRET` is strong and secret.
- [ ] Ensure `NODE_ENV` is set to `production` (disables detailed error logs).
- [ ] Verify CORS settings in `server/index.js` allow your frontend domain.
- [ ] If using MySQL 8+ in cloud, you might need SSL. Update `server/db.js` if connection fails:
  ```javascript
  const pool = mysql.createPool({
      ...,
      ssl: { rejectUnauthorized: true }
  });
  ```
