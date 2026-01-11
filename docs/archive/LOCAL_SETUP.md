# Local Development Setup - Recipe Manager

Complete guide to set up the Recipe Manager on your local machine from scratch.

## Prerequisites

Before starting, you need:
- [ ] A computer (Mac, Windows, or Linux)
- [ ] Internet connection
- [ ] 30 minutes of time

We'll install everything else as we go!

---

## Part 1: Install Required Software

### Step 1: Install Git

**Check if you have Git:**
```bash
git --version
```

If you see a version number, skip to Step 2. Otherwise, install Git:

**Mac:**
```bash
# Using Homebrew (recommended)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install git

# Or download from: https://git-scm.com/download/mac
```

**Windows:**
- Download from: https://git-scm.com/download/win
- Run installer, use all default settings
- Open "Git Bash" for terminal commands

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install git
```

**Verify installation:**
```bash
git --version
# Should show: git version 2.x.x
```

### Step 2: Install Node.js

**Check if you have Node.js:**
```bash
node --version
```

If version is 18 or higher, skip to Step 3. Otherwise:

**Mac:**
```bash
# Using Homebrew
brew install node

# Or download from: https://nodejs.org/
```

**Windows:**
- Download from: https://nodejs.org/
- Choose "LTS" version
- Run installer with default settings

**Linux:**
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Or use nvm (recommended):
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
```

**Verify installation:**
```bash
node --version  # Should be v18.x or higher
npm --version   # Should be 9.x or higher
```

### Step 3: Install a Code Editor (Optional but Recommended)

**VS Code (recommended):**
- Download from: https://code.visualstudio.com/
- Install with default settings

**Or use your preferred editor:**
- Sublime Text
- Atom
- WebStorm
- vim/nano (if you're comfortable with terminal editors)

---

## Part 2: Clone the Repository

### Step 1: Open Terminal

**Mac:**
- Press `Cmd + Space`, type "Terminal", press Enter

**Windows:**
- Open "Git Bash" (installed with Git)

**Linux:**
- Press `Ctrl + Alt + T`

### Step 2: Choose a Folder

```bash
# Go to your home directory
cd ~

# Or create a projects folder
mkdir -p ~/projects
cd ~/projects
```

### Step 3: Clone the Repository

```bash
git clone https://github.com/ryanvt2005/Recipes.git
cd Recipes
```

### Step 4: Switch to the Correct Branch

```bash
git checkout claude/recipe-app-backend-UoTAm
```

### Step 5: Verify Files

```bash
ls
# You should see: backend/ frontend/ README.md docker-compose.yml etc.
```

**🎉 Repository is now on your local machine!**

---

## Part 3: Set Up the Frontend (Easiest to Start With)

The frontend can connect to your deployed backend on Lightsail, so you don't need to run the backend locally!

### Step 1: Navigate to Frontend

```bash
cd frontend
```

### Step 2: Install Dependencies

```bash
npm install
```

This will take 2-3 minutes. You'll see a progress bar.

### Step 3: Configure Backend URL

```bash
# Create .env file from example
cp .env.example .env
```

**Edit the .env file:**

**Mac/Linux:**
```bash
nano .env
# Or: open .env  (opens in default editor)
```

**Windows:**
```bash
notepad .env
```

**Change the content to:**
```
VITE_API_URL=http://YOUR_LIGHTSAIL_IP:3000
```

Replace `YOUR_LIGHTSAIL_IP` with your actual Lightsail IP address (e.g., `54.123.45.67`)

**Save and close:**
- nano: `Ctrl + X`, then `Y`, then `Enter`
- notepad: `File` → `Save`, then close

### Step 4: Start the Frontend

```bash
npm run dev
```

You should see:
```
VITE v6.x.x  ready in 500 ms

➜  Local:   http://localhost:3001/
➜  Network: use --host to expose
```

### Step 5: Test in Browser

1. Open your browser
2. Go to: **http://localhost:3001**
3. You should see the Recipe Manager homepage!

**🎉 Frontend is running!**

Try:
1. Click "Sign Up" and create an account
2. Add a recipe from a URL
3. Browse your recipes

---

## Part 4: Set Up the Backend Locally (Optional)

If you want to run the full stack locally (instead of using Lightsail backend):

### Option A: Using Docker (Easiest)

**Step 1: Install Docker Desktop**

**Mac:**
- Download from: https://www.docker.com/products/docker-desktop
- Install and start Docker Desktop

**Windows:**
- Download from: https://www.docker.com/products/docker-desktop
- Install and start Docker Desktop

**Linux:**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install docker.io docker-compose
sudo usermod -aG docker $USER
# Log out and back in
```

**Step 2: Create .env File**

```bash
cd ~/projects/Recipes
cp .env.example .env
```

**Edit .env:**
```bash
nano .env
# Or: notepad .env (Windows)
# Or: open .env (Mac)
```

**Add your API key:**
```
DB_NAME=recipeapp
DB_USER=recipeuser
DB_PASSWORD=MySecurePassword123!
JWT_SECRET=your-random-32-character-secret-here
ANTHROPIC_API_KEY=sk-ant-api03-YOUR_ACTUAL_KEY_HERE
NODE_ENV=development
FRONTEND_URL=http://localhost:3001
```

**Get Anthropic API Key:**
1. Go to: https://console.anthropic.com/
2. Sign up or log in
3. Go to API Keys
4. Create a new key
5. Copy and paste into .env file

**Step 3: Start Everything**

```bash
cd ~/projects/Recipes

# Start backend + database
docker-compose up -d

# Wait 10 seconds for database to start
sleep 10

# Run database migrations
docker-compose exec backend npm run migrate
```

**Step 4: Verify Backend is Running**

```bash
curl http://localhost:3000/health
```

You should see: `{"status":"healthy",...}`

**Step 5: Update Frontend .env**

```bash
cd frontend
nano .env
```

Change to:
```
VITE_API_URL=http://localhost:3000
```

**Step 6: Restart Frontend**

```bash
# Stop the running dev server (Ctrl + C)
npm run dev
```

**🎉 Full stack is running locally!**

### Option B: Without Docker (Manual Setup)

**Step 1: Install PostgreSQL**

**Mac:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Windows:**
- Download from: https://www.postgresql.org/download/windows/
- Install with default settings
- Remember the password you set!

**Linux:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Step 2: Create Database**

```bash
# Mac/Linux
psql postgres

# Windows (in psql terminal)
# Run: psql -U postgres
```

In the PostgreSQL prompt:
```sql
CREATE DATABASE recipeapp;
CREATE USER recipeuser WITH PASSWORD 'MySecurePassword123!';
GRANT ALL PRIVILEGES ON DATABASE recipeapp TO recipeuser;
\q
```

**Step 3: Install Backend Dependencies**

```bash
cd ~/projects/Recipes/backend
npm install
```

**Step 4: Create Backend .env**

```bash
cd ~/projects/Recipes/backend
cp .env.example .env
nano .env
```

**Edit with your settings:**
```
DATABASE_URL=postgresql://recipeuser:MySecurePassword123!@localhost:5432/recipeapp
DB_HOST=localhost
DB_PORT=5432
DB_NAME=recipeapp
DB_USER=recipeuser
DB_PASSWORD=MySecurePassword123!
JWT_SECRET=your-random-32-character-secret-change-this
ANTHROPIC_API_KEY=sk-ant-api03-YOUR_KEY_HERE
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3001
```

**Step 5: Run Migrations**

```bash
npm run migrate
```

**Step 6: Start Backend**

```bash
npm run dev
```

Backend runs on: http://localhost:3000

---

## Part 5: Making Changes & Testing

### Edit Code

**Using VS Code:**
```bash
# From the Recipes folder
code .
```

This opens the entire project in VS Code.

**Project structure:**
```
Recipes/
├── backend/          # Node.js API
│   ├── src/
│   └── package.json
├── frontend/         # React app
│   ├── src/
│   └── package.json
├── docker-compose.yml
└── README.md
```

### Common Commands

**Frontend:**
```bash
cd frontend

# Start dev server
npm run dev

# Build for production
npm run build

# Install new package
npm install package-name
```

**Backend:**
```bash
cd backend

# Start dev server (with auto-reload)
npm run dev

# Run migrations
npm run migrate

# Install new package
npm install package-name
```

**Docker:**
```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f backend

# Restart after code changes
docker-compose restart backend
```

### Pushing Changes to GitHub

```bash
# Check what files changed
git status

# Add files to commit
git add .

# Commit with message
git commit -m "Description of changes"

# Push to GitHub
git push origin claude/recipe-app-backend-UoTAm
```

The GitHub Actions will automatically deploy to Lightsail!

---

## Troubleshooting

### "Command not found"

**Problem:** Terminal doesn't recognize `git`, `node`, or `npm`

**Solution:**
- Close and reopen terminal after installing software
- Verify installation: `which git`, `which node`
- Add to PATH (advanced, Google for your OS)

### Port already in use

**Problem:** `Error: listen EADDRINUSE: address already in use :::3000`

**Solution:**
```bash
# Find what's using port 3000
lsof -ti:3000

# Kill it
kill -9 $(lsof -ti:3000)

# Or use a different port
PORT=3001 npm run dev
```

### Cannot connect to backend

**Problem:** Frontend shows network errors

**Solution:**
1. Check backend is running: `curl http://localhost:3000/health`
2. Check `.env` has correct URL
3. Check CORS is enabled on backend
4. Restart both frontend and backend

### npm install fails

**Problem:** Errors during `npm install`

**Solution:**
```bash
# Clear cache
npm cache clean --force

# Delete and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Database connection error

**Problem:** Backend can't connect to database

**Solution:**
```bash
# Verify PostgreSQL is running
docker-compose ps  # If using Docker

# Or
pg_isready  # If installed locally

# Check credentials in .env match database
```

---

## Quick Reference

### Start Everything (Docker)

```bash
cd ~/projects/Recipes

# Backend + DB
docker-compose up -d
docker-compose exec backend npm run migrate

# Frontend (in new terminal)
cd frontend
npm run dev
```

### Start Everything (Manual)

```bash
# Terminal 1: Backend
cd ~/projects/Recipes/backend
npm run dev

# Terminal 2: Frontend
cd ~/projects/Recipes/frontend
npm run dev
```

### URLs

- **Frontend:** http://localhost:3001
- **Backend:** http://localhost:3000
- **API Docs:** http://localhost:3000/health
- **Database:** localhost:5432 (via psql or pgAdmin)

---

## Next Steps

Now that you're set up:

1. ✅ **Test the app** - Create account, add recipes
2. ✅ **Make changes** - Edit frontend code and see live updates
3. ✅ **Provide feedback** - What works? What doesn't?
4. ✅ **Add features** - Request new functionality

---

## Need Help?

**I'm stuck at installation:**
- Share which step failed
- Copy the exact error message
- Tell me your operating system

**Something isn't working:**
- What command did you run?
- What error did you get?
- Are both frontend and backend running?

**I want to make changes:**
- What feature do you want to add?
- Which file should I edit?
- How do I test my changes?

Let me know where you need help!
