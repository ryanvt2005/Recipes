# Fix 500 Login Error - Quick Guide

## Problem
Login fails with "500 Internal Server Error"

## Root Cause
The most common cause is a missing or improperly configured `JWT_SECRET` environment variable in the backend.

## Solution - Fix on Lightsail

### Step 1: SSH into Lightsail

```bash
# From your local machine
ssh -i /path/to/your/lightsail-key.pem ubuntu@98.86.116.176
```

### Step 2: Navigate to Project Directory

```bash
cd ~/Recipes
```

### Step 3: Check if .env File Exists

```bash
ls -la .env
```

If the file doesn't exist, create it:

```bash
cp .env.example .env
```

### Step 4: Edit .env File

```bash
nano .env
```

Ensure these critical variables are set:

```
# Database Configuration
DB_NAME=recipeapp
DB_USER=recipeuser
DB_PASSWORD=MySecurePassword123!

# JWT Configuration - THIS IS CRITICAL
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-long-change-this-to-something-random

# Anthropic API
ANTHROPIC_API_KEY=sk-ant-api03-YOUR_ACTUAL_KEY_HERE

# Server Configuration
NODE_ENV=production
FRONTEND_URL=http://98.86.116.176:3001
```

**Important**: Change `JWT_SECRET` to a random 32+ character string. Example:
```
JWT_SECRET=8f4a9e2b7c1d6e3f5a8b9c2d7e4f1a6b3c8d9e
```

**Save and exit**: Press `Ctrl + X`, then `Y`, then `Enter`

### Step 5: Restart Backend

```bash
docker-compose down
docker-compose up -d
```

Wait 10 seconds for services to start:

```bash
sleep 10
```

### Step 6: Verify Backend is Running

```bash
curl http://localhost:3000/health
```

You should see: `{"status":"healthy",...}`

### Step 7: Check Backend Logs

```bash
docker-compose logs backend | tail -50
```

Look for any errors. You should see "Server running on port 3000"

### Step 8: Test Login

Go back to your frontend at http://localhost:3001 and try logging in again.

---

## Alternative: Check if User Exists in Database

If login still fails, the user account might not exist:

```bash
# Connect to PostgreSQL
docker-compose exec db psql -U recipeuser -d recipeapp

# Check if users table has data
SELECT id, email, created_at FROM users;

# Exit psql
\q
```

If no users exist, you'll need to register again through the frontend.

---

## Alternative: Check Backend Logs for Specific Error

```bash
docker-compose logs backend | grep -i error | tail -20
```

This will show the most recent errors, which can help identify the specific problem.

---

## Still Having Issues?

### Reset Everything (Nuclear Option)

If nothing works, completely reset the database and backend:

```bash
cd ~/Recipes

# Stop everything
docker-compose down

# Remove database volume (WARNING: deletes all data)
docker volume rm recipes_postgres_data

# Start fresh
docker-compose up -d

# Wait for database to initialize
sleep 20

# Run migrations
docker-compose exec backend npm run migrate

# Check health
curl http://localhost:3000/health
```

After this, you'll need to register a new account through the frontend.

---

## Quick Reference Commands

```bash
# SSH into Lightsail
ssh -i /path/to/key.pem ubuntu@98.86.116.176

# Navigate to project
cd ~/Recipes

# Check backend status
docker-compose ps

# View backend logs
docker-compose logs backend | tail -50

# Restart backend
docker-compose restart backend

# Full restart
docker-compose down && docker-compose up -d

# Check health
curl http://localhost:3000/health

# Check environment variables
docker-compose exec backend env | grep JWT_SECRET
```

---

## Expected Working State

When everything is working correctly:

1. **Backend health check** should return:
   ```json
   {"status":"healthy","timestamp":"..."}
   ```

2. **Backend logs** should show:
   ```
   Server running on port 3000
   Connected to PostgreSQL database
   ```

3. **Docker containers** should be up:
   ```bash
   $ docker-compose ps
   NAME                COMMAND                  STATUS
   recipes-backend-1   "npm start"              Up 2 minutes
   recipes-db-1        "docker-entrypoint..."   Up 2 minutes
   ```

4. **Login should work** and return a JWT token

---

## Prevention for Future

To avoid this issue in the future, always ensure your `.env` file on Lightsail has all required variables set, especially:

- `JWT_SECRET` (32+ random characters)
- `ANTHROPIC_API_KEY` (your actual API key)
- `DB_PASSWORD` (should match docker-compose.yml)
- `FRONTEND_URL` (should point to your frontend URL)

The GitHub Actions workflow does NOT automatically update your `.env` file on Lightsail - you must set this manually once.
