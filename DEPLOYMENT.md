# Application Deployment Guide

This guide covers deploying the application using Docker (with or without SSL) or via a direct Ubuntu setup.

## 🗄️ Database Options

Before deploying, configure your database connection in your environment configuration (`.env` file). We support three setups:

### Option A: Local DB (Docker-managed)
The database runs as a Docker container locally on the same server. This is the default in the Docker compose files.
```env
# .env
MONGODB_URI=mongodb://admin:password@mongodb:27017/asset-management?authSource=admin
MONGO_USER=admin
MONGO_PASSWORD=password
```

### Option B: Remote DB
You have an unmanaged MongoDB server running on a separate machine.
**Action:** Remove or comment out the `mongodb` service block from your `docker-compose.yml` or `docker-compose.ssl.yml`. Provide the remote connection string:
```env
# .env
MONGODB_URI=mongodb://user:pass@<remote-ip>:27017/asset-management?authSource=admin
```

### Option C: Managed DB (AWS, Azure, DigitalOcean)
Use a managed cloud database like AWS DocumentDB, Azure CosmosDB, or DigitalOcean Managed MongoDB.
**Action:** Remove or comment out the `mongodb` service block from your Docker Compose files. Use the connection string provided by your cloud provider.
```env
# .env (Example)
MONGODB_URI=mongodb+srv://user:pass@my-cluster.mongodb.net/asset-management?retryWrites=true&w=majority
```

---

## 🔒 1. Deploy Using Docker WITH SSL (Let's Encrypt)
Ideal for production. Requires a registered domain name pointing to your server's public IP. Ports 80 and 443 must be open.

### Step 1: Configuration
```bash
cp .env.example .env
nano .env
```
Ensure you set the following critically required fields:
- `DOMAIN_NAME` (e.g., `asset.yourdomain.com`)
- `MONGODB_URI` (Based on your chosen Database Option above)
- Security secrets (`JWT_SECRET`, etc.)

### Step 2: Request SSL Certificate
We provide an automated script to fetch SSL certificates and configure Nginx.
```bash
bash ssl/init-letsencrypt.sh
```

### Step 3: Start Application
*(Remember to remove the `mongodb` service from `docker-compose.ssl.yml` if using Option B or C)*
```bash
docker compose -f docker-compose.ssl.yml up -d --build
```
Access your application at **`https://your-domain.com`**.

---

## 🔓 2. Deploy Using Docker WITHOUT SSL
Ideal for internal networks, development, or testing. Ports 3000 and 5000 must be open.

### Step 1: Configuration
```bash
cp .env.example .env
nano .env
```
Update your `FRONTEND_URL` to point to your server's IP address (e.g., `http://<server-ip>:3000`). Make sure to configure your `MONGODB_URI` appropriately based on your Database Option.

### Step 2: Start Application
*(Remember to remove the `mongodb` service from `docker-compose.yml` if using Option B or C)*
```bash
docker compose -f docker-compose.yml up -d --build
```
Access your application at **`http://<server-ip>:3000`**.

---

## 🖥️ 3. Deploy via Ubuntu Direct Setup (Without Docker & Without SSL)
Ideal if you prefer not to use Docker and want to run Node processes directly using process managers like PM2.

### Prerequisites
- Ubuntu 20.04+ / 22.04+
- Node.js (v18+) installed
- Port 3000 and 5000 open

### Step 1: Backend Configuration & Start
```bash
cd codespaces-antigravity-react-main/server
cp .env.example .env
nano .env
```
Configure your `.env`. If using **Option A (Local DB)**, ensure you have MongoDB installed on Ubuntu and running: `sudo systemctl start mongod`. Set `MONGODB_URI=mongodb://localhost:27017/asset-management`.

Install dependencies and run:
```bash
npm install
npm run start
# For production, it is recommended to use PM2: pm2 start server.js --name "asset-backend"
```

### Step 2: Frontend Configuration & Start
```bash
cd .. # Back to the project root
npm install
npm run build
```
Serve the built frontend folder (`dist`):
```bash
npm install -g serve
serve -s dist -l 3000
# Or using PM2: pm2 serve dist 3000 --name "asset-frontend" --spa
```
Access your application at **`http://<server-ip>:3000`**.
