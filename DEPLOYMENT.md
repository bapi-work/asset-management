# 🚀 Production Deployment Guide

Welcome! This guide will help you get your Asset Management System running in a production environment. Whether you're a seasoned sysadmin or new to deployment, these steps are designed to be straightforward and easy to follow.

---

## 🏗️ Step 1: Choose Your Database

The application requires a MongoDB database to store your assets and user data. Choose one of the following options:

### Option A: Let Docker Handle It (Recommended for Simplicity)
*The database runs automatically alongside your application on the same server.*
- **Action Required:** None! This is the default setup.

### Option B: Use a Managed Cloud Database (Recommended for Scale)
*Use a managed service like MongoDB Atlas, AWS DocumentDB, or Azure CosmosDB.*

**⚠️ Important Setup for Cloud Database:**
If you choose this option, you must tell Docker *not* to run its own local database. Open your `docker-compose.yml` (and `docker-compose.ssl.yml` if using SSL) and **delete the following three parts**:

1. **Delete the database service:** Delete everything from `mongodb:` down to its `networks:` section.
2. **Delete the dependency:** Under the `backend:` section, find and delete these two lines:
   ```yaml
       depends_on:
         - mongodb
   ```
3. **Delete the volumes:** At the very bottom of the file, delete the entire `volumes:` section.

*(Note: If you delete the mongodb service but forget to delete the `depends_on` lines, the application will crash because it is looking for a service that no longer exists!)*

---

## ⚙️ Step 2: Configure Your Environment

Before starting the application, you need to configure your environment variables.

1. **Create your `.env` file from the template:**
   ```bash
   cp .env.example .env
   ```

2. **Open the file in a text editor:**
   ```bash
   nano .env
   ```

3. **Update the essential settings:**
   - `JWT_SECRET`: Create a strong, random password. This secures user sessions.
   - `MONGODB_URI`:
     - *If using Option A (Docker):* Leave as `mongodb://admin:password@mongodb:27017/asset-management?authSource=admin` (Change the password!).
     - *If using Option B (Cloud):* Paste your cloud connection string.
   - `DOMAIN_NAME`: (Required for SSL) Enter your domain, e.g., `assets.yourcompany.com`.
   - `FRONTEND_URL`:
     - *If using SSL:* `https://assets.yourcompany.com`
     - *If NOT using SSL:* `http://<your-server-ip>:3000`

---

## 🛳️ Step 3: Launch the Application

Choose the launch method that best fits your infrastructure.

### Method 1: Docker with SSL (Production Standard) 🔒
*Use this if your server is exposed to the internet. Requires a registered domain name pointing to your server's IP. Ports 80 and 443 must be open.*

1. **Generate the SSL Certificate:**
   ```bash
   bash ssl/init-letsencrypt.sh
   ```
2. **Start the Application:**
   ```bash
   docker compose -f docker-compose.ssl.yml up -d --build
   ```
3. **Success! 🎉** Access your app securely at `https://your-domain.com`.

---

### Method 2: Docker without SSL (Internal / Testing) 🔓
*Ideal for internal company networks, VPNs, or local testing. Ports 3000 and 5000 must be open.*

1. **Start the Application:**
   ```bash
   docker compose -f docker-compose.yml up -d --build
   ```
2. **Success! 🎉** Access your app at `http://<your-server-ip>:3000`.

---

### Method 3: Direct Ubuntu Setup (No Docker) 🖥️
*If you prefer to run Node.js processes directly using process managers like PM2.*

**Prerequisites:** Ubuntu 20.04+, Node.js (v18+), and MongoDB (if local) installed.

1. **Start the Backend:**
   ```bash
   cd server
   cp .env.example .env
   nano .env # Configure your settings here
   npm install
   npm run start
   
   # Note: For production, we recommend using PM2:
   # pm2 start server.js --name "asset-backend"
   ```

2. **Build & Serve the Frontend:**
   ```bash
   cd ..
   npm install
   npm run build
   npm install -g serve
   serve -s dist -l 3000
   
   # Note: For production, we recommend using PM2:
   # pm2 serve dist 3000 --name "asset-frontend" --spa
   ```

---

## 🛠️ Helpful Commands

If you used Docker (Methods 1 or 2), these commands will help you manage your deployment:

- **View Live Logs:**
  ```bash
  docker compose logs -f
  ```
- **Restart the Application:**
  ```bash
  docker compose restart
  ```
- **Stop the Application:**
  ```bash
  docker compose down
  ```
- **Update to a New Version:**
  ```bash
  git pull
  docker compose up -d --build
  ```
