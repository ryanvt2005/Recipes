# Local Development Setup - Complete Stack

This guide will get you set up to run **the entire application locally** on your machine. This is the recommended workflow for active development.

## Why Local Development?

**Remote Backend (Lightsail) - Current Setup:**
- ❌ Every change requires commit → push → deploy
- ❌ Debugging requires SSH and Docker logs
- ❌ Environment variables keep breaking
- ❌ CORS issues between localhost frontend and remote backend
- ❌ Slow iteration cycle (5+ minutes per change)

**Local Stack - Recommended:**
- ✅ Changes take effect instantly
- ✅ Easy debugging with console logs
- ✅ Environment variables persist
- ✅ No CORS issues
- ✅ Fast iteration cycle (seconds per change)
- ✅ Work offline
- ✅ Use Lightsail only for stable releases

---

## Prerequisites

Make sure you have installed:
- ✅ Docker Desktop (for Windows/Mac) or Docker Engine (for Linux)
- ✅ Node.js 20+
- ✅ Git

**Check if Docker is installed:**

```bash
docker --version
docker-compose --version
```

If not installed:
- **Windows/Mac**: Download [Docker Desktop](https://www.docker.com/products/docker-desktop)
- **Linux**: Follow [Docker Engine installation](https://docs.docker.com/engine/install/)

---

## One-Time Setup (15 minutes)

### Step 1: Clone Repository (if not already done)

```bash
cd ~
git clone https://github.com/ryanvt2005/Recipes.git
cd Recipes
```

### Step 2: Set Up Backend Environment Variables

```bash
# Create .env file for local backend
cp .env.example .env
```

Edit `.env` and set your values:

```bash
# On Windows
notepad .env

# On Mac/Linux
nano .env
```

**Minimal required configuration:**

```env
# Database Configuration
DB_NAME=recipeapp
DB_USER=recipeuser
DB_PASSWORD=localdevpassword

# JWT Configuration - Generate with: openssl rand -hex 32
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-long-change-this-to-random-string

# Anthropic API
ANTHROPIC_API_KEY=sk-ant-api03-YOUR_ACTUAL_KEY_HERE

# Server Configuration
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3001
```

**Generate a secure JWT_SECRET:**

```bash
# Run this and copy the output
openssl rand -hex 32
```

Paste the output as your `JWT_SECRET` value.

### Step 3: Set Up Frontend Environment Variables

```bash
cd frontend

# Create .env.local for frontend
cat > .env.local << 'EOF'
VITE_API_URL=http://localhost:3000
EOF

cd ..
```

### Step 4: Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

---

## Daily Development Workflow

### Start the Full Stack

From the `Recipes` directory, run these commands in **separate terminal windows**:

**Terminal 1 - Backend (Database + API):**

```bash
cd ~/Recipes

# Start database and backend
docker-compose up
```

Wait for: `Server running on port 3000`

**Terminal 2 - Frontend:**

```bash
cd ~/Recipes/frontend

# Start frontend dev server
npm run dev
```

Wait for: `Local: http://localhost:3001`

### Access the Application

Open your browser to: **http://localhost:3001**

The frontend will communicate with the local backend at `http://localhost:3000`.

---

## Making Changes

### Backend Changes (API, Database, etc.)

1. Edit files in `backend/src/`
2. Backend will **auto-restart** when you save (if using nodemon)
3. If changes don't appear, restart backend:
   ```bash
   # In Terminal 1, press Ctrl+C, then:
   docker-compose up
   ```

### Frontend Changes (UI, React components)

1. Edit files in `frontend/src/`
2. Frontend will **auto-reload** when you save (Vite HMR)
3. Changes appear instantly in browser

### Database Schema Changes

1. Edit `backend/src/config/migrations/schema.sql`
2. Rebuild database:
   ```bash
   docker-compose down
   docker volume rm recipes_postgres_data
   docker-compose up -d
   sleep 10
   docker-compose exec backend npm run migrate
   ```

---

## Common Tasks

### View Backend Logs

```bash
docker-compose logs -f backend
```

### View Database Logs

```bash
docker-compose logs -f db
```

### Connect to Database

```bash
docker-compose exec db psql -U recipeuser -d recipeapp
```

Common SQL commands:
```sql
-- List all tables
\dt

-- View users
SELECT * FROM users;

-- View recipes
SELECT id, title, created_at FROM recipes;

-- Exit
\q
```

### Check Backend Health

```bash
curl http://localhost:3000/health
```

Should return: `{"status":"healthy",...}`

### Reset Everything (Nuclear Option)

```bash
# Stop everything
docker-compose down

# Remove database (deletes all data)
docker volume rm recipes_postgres_data

# Start fresh
docker-compose up -d
sleep 10
docker-compose exec backend npm run migrate
```

---

## Troubleshooting

### Port 3000 Already in Use

**Error:** `bind: address already in use`

**Fix:**

```bash
# Find what's using port 3000
lsof -i :3000

# Kill the process (replace PID with actual process ID)
kill -9 PID

# Or use different port in .env
PORT=3001
```

### Port 5432 Already in Use (PostgreSQL)

**Error:** `port is already allocated`

**Fix:**

```bash
# Stop local PostgreSQL if running
# Windows:
net stop postgresql

# Mac:
brew services stop postgresql

# Linux:
sudo systemctl stop postgresql
```

### Backend Can't Connect to Database

**Error:** `ECONNREFUSED` or `connection refused`

**Fix:**

```bash
# Check if database is running
docker-compose ps

# Restart database
docker-compose restart db
sleep 5
docker-compose restart backend
```

### Frontend Shows CORS Error

**Error:** `blocked by CORS policy`

**Fix:**

Ensure `frontend/.env.local` has:
```
VITE_API_URL=http://localhost:3000
```

And `backend/.env` has:
```
FRONTEND_URL=http://localhost:3001
```

Restart both frontend and backend.

### Changes Not Appearing

**Backend:**
```bash
docker-compose restart backend
```

**Frontend:**
```bash
# In frontend terminal, press Ctrl+C, then:
npm run dev
```

---

## Development with Backend Auto-Reload

To enable backend auto-restart on file changes, update `backend/package.json`:

```json
{
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "migrate": "node src/config/migrations/run.js"
  }
}
```

Add nodemon dependency:

```bash
cd backend
npm install --save-dev nodemon
```

Update `docker-compose.yml` to use dev mode:

```yaml
backend:
  # ... existing config ...
  command: npm run dev
  volumes:
    - ./backend:/app
    - /app/node_modules
```

Now backend will auto-restart when you edit files!

---

## When to Deploy to Lightsail

Deploy to Lightsail **only when**:
- ✅ Feature is complete and tested locally
- ✅ You want to share with others
- ✅ You want to test on production environment

**Don't deploy for every small change during development!**

### Deploy to Lightsail

When ready to deploy:

```bash
git add .
git commit -m "Description of changes"
git push origin claude/recipe-app-backend-UoTAm
```

GitHub Actions will automatically deploy, or manually on Lightsail:

```bash
# SSH into Lightsail
ssh -i /path/to/key.pem ubuntu@98.86.116.176

cd ~/Recipes
git pull origin claude/recipe-app-backend-UoTAm
docker-compose build backend
docker-compose up -d
```

---

## Recommended Workflow

### Daily Development

1. **Morning**: Start local stack
   ```bash
   # Terminal 1
   cd ~/Recipes && docker-compose up

   # Terminal 2
   cd ~/Recipes/frontend && npm run dev
   ```

2. **During the day**: Make changes, test locally, iterate rapidly

3. **Evening**: Commit working features
   ```bash
   git add .
   git commit -m "Add feature X"
   git push
   ```

4. **Deploy to Lightsail** once a day or when you have stable changes

### Benefits

- 🚀 **10x faster iteration** (seconds vs minutes)
- 🐛 **Easier debugging** (console logs right in terminal)
- 💰 **Reduced API costs** (test locally before hitting Anthropic API)
- 🔒 **More stable** (no environment variable issues)
- ✅ **Better testing** (test thoroughly before deploying)

---

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│           Your Local Machine                │
│                                             │
│  ┌──────────────┐      ┌─────────────────┐ │
│  │   Browser    │─────▶│  Frontend       │ │
│  │ localhost:   │      │  (Vite)         │ │
│  │   3001       │      │  localhost:3001 │ │
│  └──────────────┘      └─────────────────┘ │
│         │                      │            │
│         │                      ▼            │
│         │              ┌─────────────────┐  │
│         └─────────────▶│  Backend        │  │
│                        │  (Express)      │  │
│                        │  localhost:3000 │  │
│                        └─────────────────┘  │
│                               │             │
│                               ▼             │
│                        ┌─────────────────┐  │
│                        │  PostgreSQL     │  │
│                        │  (Docker)       │  │
│                        │  localhost:5432 │  │
│                        └─────────────────┘  │
└─────────────────────────────────────────────┘

Everything runs locally!
No need to deploy for every change.
```

---

## Quick Reference

```bash
# Start stack
docker-compose up                    # Backend + DB
cd frontend && npm run dev          # Frontend (separate terminal)

# Stop stack
docker-compose down                 # Stop backend + DB
# Ctrl+C in frontend terminal       # Stop frontend

# View logs
docker-compose logs -f backend      # Backend logs
docker-compose logs -f db           # Database logs

# Health checks
curl http://localhost:3000/health   # Backend health
curl http://localhost:3001          # Frontend (in browser)

# Database access
docker-compose exec db psql -U recipeuser -d recipeapp

# Reset database
docker-compose down
docker volume rm recipes_postgres_data
docker-compose up -d && sleep 10
docker-compose exec backend npm run migrate

# Deploy to Lightsail (when ready)
git add . && git commit -m "message" && git push
```

---

## Next Steps

1. **Stop the remote setup**: You can keep Lightsail running, but don't use it for active development
2. **Start local stack**: Follow the Daily Development Workflow above
3. **Develop locally**: Make changes, test, iterate quickly
4. **Deploy occasionally**: Push to Lightsail when features are complete

This setup will make development **much faster and more stable**. You'll only need to deal with Lightsail deployment issues once a day instead of every 5 minutes!
