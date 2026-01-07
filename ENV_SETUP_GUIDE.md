# Environment Variables Setup Guide - PERMANENT FIX

## Problem
Environment variables are not persisting in Lightsail, causing repeated login errors and other issues.

## Root Cause
The `.env` file either:
1. Doesn't exist in the correct location
2. Isn't being read by Docker Compose
3. Is missing required variables

## Permanent Solution

### Option 1: Automated Setup (RECOMMENDED)

SSH into Lightsail and run the automated setup script:

```bash
cd ~/Recipes
./scripts/setup-env.sh
```

This will:
- Create a `.env` file with all required variables
- Generate a secure JWT_SECRET automatically
- Prompt you for your Anthropic API key
- Validate the configuration

After setup completes, restart Docker:

```bash
docker-compose down
docker-compose up -d
sleep 10
curl http://localhost:3000/health
```

### Option 2: Manual Setup

If you prefer manual setup:

#### Step 1: Create .env File

```bash
cd ~/Recipes
nano .env
```

#### Step 2: Add These Variables

```bash
# Database Configuration
DB_NAME=recipeapp
DB_USER=recipeuser
DB_PASSWORD=MySecurePassword123!

# JWT Configuration - CRITICAL - Generate with: openssl rand -hex 32
JWT_SECRET=REPLACE_WITH_OUTPUT_FROM_OPENSSL_COMMAND

# Anthropic API
ANTHROPIC_API_KEY=sk-ant-api03-YOUR_ACTUAL_KEY_HERE

# Server Configuration
NODE_ENV=production
PORT=3000
FRONTEND_URL=http://98.86.116.176:3001
```

#### Step 3: Generate JWT Secret

```bash
# Generate a secure random string
openssl rand -hex 32
```

Copy the output and replace `REPLACE_WITH_OUTPUT_FROM_OPENSSL_COMMAND` in your `.env` file.

#### Step 4: Save and Restart

Save the file (Ctrl+X, Y, Enter) and restart:

```bash
docker-compose down
docker-compose up -d
sleep 10
```

---

## Verification

After setup, verify everything is working:

```bash
cd ~/Recipes
./scripts/verify-env.sh
```

This will check:
- ✅ .env file exists
- ✅ JWT_SECRET is set and long enough
- ✅ ANTHROPIC_API_KEY is set
- ✅ DB_PASSWORD is set
- ✅ Backend is responding

You should see all green checkmarks.

---

## Why Environment Variables Are Not Persisting

### Understanding the Issue

Docker Compose reads the `.env` file **from the same directory as docker-compose.yml** when you run `docker-compose up`. The file must:

1. **Be named exactly `.env`** (not `.env.example` or `.env.production`)
2. **Be in the root directory** (`~/Recipes/.env`)
3. **Have proper format** (KEY=VALUE, no spaces around =)
4. **Not have quotes** around values (unless the value contains spaces)

### Common Mistakes

❌ **Wrong location**:
```
~/Recipes/backend/.env  (WRONG - too deep)
```

✅ **Correct location**:
```
~/Recipes/.env  (CORRECT - same level as docker-compose.yml)
```

❌ **Wrong format**:
```bash
JWT_SECRET = "mykey"  (WRONG - spaces and quotes)
```

✅ **Correct format**:
```bash
JWT_SECRET=mykey  (CORRECT - no spaces, no quotes)
```

---

## Persistent vs Temporary Variables

### What Persists
- ✅ `.env` file contents (permanent across restarts)
- ✅ Docker volumes (database data)
- ✅ Container restart policies

### What Doesn't Persist
- ❌ Shell environment variables (`export JWT_SECRET=...`)
- ❌ Variables set during container creation (unless in .env)
- ❌ Temporary files in /tmp

**IMPORTANT**: Never set environment variables with `export` in the shell. Always use the `.env` file.

---

## GitHub Actions and .env

The GitHub Actions deployment workflow **does NOT** manage your `.env` file because:

1. Environment variables contain secrets (API keys, passwords)
2. Secrets should never be committed to git
3. Each deployment environment needs different values

**You must manually create the `.env` file once on each deployment environment** (Lightsail, local machine, etc.)

---

## Troubleshooting

### Issue: Backend starts but crashes immediately

**Check logs**:
```bash
docker-compose logs backend | tail -50
```

**Look for**: "JWT_SECRET is not defined" or similar errors

**Fix**: Ensure `.env` file exists and has JWT_SECRET set

---

### Issue: .env file exists but variables still not loaded

**Verify Docker Compose can read it**:
```bash
cd ~/Recipes
docker-compose config | grep JWT_SECRET
```

If you see `JWT_SECRET: null` or nothing, Docker Compose isn't reading the file.

**Fix**:
```bash
# Ensure .env is in the right directory
ls -la ~/Recipes/.env

# Check file permissions
chmod 600 ~/Recipes/.env

# Restart with fresh read
docker-compose down
docker-compose up -d
```

---

### Issue: Variables work after restart but disappear later

This means the `.env` file is being deleted or overwritten.

**Fix**: Check if any scripts or automated processes are modifying the directory.

---

## Security Best Practices

1. **Never commit .env to git**
   - Already in .gitignore
   - Contains sensitive secrets

2. **Use strong JWT_SECRET**
   - Minimum 32 characters
   - Generated with cryptographically secure random function
   - Use: `openssl rand -hex 32`

3. **Restrict .env permissions**
   ```bash
   chmod 600 ~/Recipes/.env
   ```
   This makes it readable only by the owner.

4. **Rotate secrets periodically**
   - Change JWT_SECRET every few months
   - Users will need to re-login after change

5. **Different secrets per environment**
   - Production, staging, development should have different JWT secrets
   - Never reuse production secrets in development

---

## Quick Reference

### Check if .env exists
```bash
ls -la ~/Recipes/.env
```

### View .env contents (masked)
```bash
cat ~/Recipes/.env | sed 's/=.*/=***MASKED***/g'
```

### Verify variables in container
```bash
docker-compose exec backend env | grep JWT_SECRET
```

### Full diagnostic
```bash
cd ~/Recipes
./scripts/verify-env.sh
```

### Restart everything
```bash
cd ~/Recipes
docker-compose down
docker-compose up -d
sleep 10
curl http://localhost:3000/health
```

---

## Template .env File

Save this as `~/Recipes/.env` and fill in your values:

```bash
# Database Configuration
DB_NAME=recipeapp
DB_USER=recipeuser
DB_PASSWORD=YOUR_SECURE_DB_PASSWORD

# JWT Configuration - Generate with: openssl rand -hex 32
JWT_SECRET=YOUR_64_CHAR_RANDOM_HEX_STRING

# Anthropic API - Get from: https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-api03-YOUR_KEY_HERE

# Server Configuration
NODE_ENV=production
PORT=3000
FRONTEND_URL=http://98.86.116.176:3001
```

---

## Expected Working State

When everything is configured correctly:

1. **File exists**:
   ```bash
   $ ls -la ~/Recipes/.env
   -rw------- 1 ubuntu ubuntu 412 Jan 7 12:00 .env
   ```

2. **Variables loaded in container**:
   ```bash
   $ docker-compose exec backend env | grep JWT_SECRET
   JWT_SECRET=8f4a9e2b7c1d6e3f5a8b9c2d7e4f1a6b...
   ```

3. **Backend healthy**:
   ```bash
   $ curl http://localhost:3000/health
   {"status":"healthy","timestamp":"2026-01-07T12:00:00.000Z"}
   ```

4. **Login works** in the frontend without 500 errors

---

## Need Help?

If you've followed this guide and still have issues:

1. Run the diagnostic script:
   ```bash
   cd ~/Recipes
   ./scripts/verify-env.sh
   ```

2. Check backend logs:
   ```bash
   docker-compose logs backend | tail -100
   ```

3. Verify Docker Compose version:
   ```bash
   docker-compose --version
   ```
   Should be 2.x or higher.

4. Check if .env file has correct line endings (Unix, not Windows):
   ```bash
   file ~/Recipes/.env
   ```
   Should show "ASCII text" not "ASCII text, with CRLF line terminators"
