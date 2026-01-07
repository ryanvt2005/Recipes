# Deployment Troubleshooting Guide

This guide helps you fix common deployment issues.

## 🔍 Diagnose Your Issue

### Step 1: Which deployment method did you try?

- **Option 1: Manual Lightsail** → Go to [Manual Deployment Issues](#manual-deployment-issues)
- **Option 2: GitHub Actions** → Go to [GitHub Actions Issues](#github-actions-issues)

---

## Manual Deployment Issues

### Issue: Can't create Lightsail instance

**Symptoms:**
- AWS Console shows error when creating instance
- "Service limit exceeded" error

**Solutions:**
1. Check your AWS account is verified and has billing enabled
2. Try a different region (e.g., us-west-2 instead of us-east-1)
3. Check AWS service quotas: https://console.aws.amazon.com/servicequotas/

### Issue: Docker commands fail

**Symptoms:**
```
permission denied while trying to connect to the Docker daemon socket
```

**Solution:**
```bash
# Run these commands:
sudo usermod -a -G docker ec2-user

# IMPORTANT: Exit and reconnect to SSH for this to take effect
exit

# Then reconnect and try again
```

### Issue: Git clone fails

**Symptoms:**
```
fatal: could not read Username for 'https://github.com'
```

**Solution:**
If your repo is private, use a personal access token:
```bash
# Generate token: https://github.com/settings/tokens
# Then clone with:
git clone https://YOUR_TOKEN@github.com/ryanvt2005/Recipes.git
```

Or make your repo public temporarily:
- Go to: https://github.com/ryanvt2005/Recipes/settings
- Scroll to "Danger Zone"
- Click "Change visibility" → "Public"

### Issue: docker-compose not found

**Symptoms:**
```
bash: docker-compose: command not found
```

**Solution:**
```bash
# Install docker-compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify
docker-compose --version
```

### Issue: Port 3000 not accessible

**Symptoms:**
- `curl: (7) Failed to connect to X.X.X.X port 3000: Connection refused`

**Solution:**
1. **Check Lightsail firewall:**
   - Go to Lightsail console
   - Click your instance
   - Click "Networking" tab
   - Ensure port 3000 is open (TCP, port 3000)

2. **Check Docker is running:**
   ```bash
   docker-compose ps
   # Should show backend and db containers as "Up"
   ```

3. **Check backend logs:**
   ```bash
   docker-compose logs backend
   # Look for errors
   ```

### Issue: Database connection error

**Symptoms:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:**
```bash
# Check database container is running
docker-compose ps db

# If not running, check logs
docker-compose logs db

# Restart everything
docker-compose down
docker-compose up -d

# Wait 15 seconds for DB to start
sleep 15

# Try migration again
docker-compose exec backend npm run migrate
```

### Issue: Migration fails

**Symptoms:**
```
Error: relation "users" already exists
```

**Solution:**
This is actually OK! It means migrations ran before. Your database is set up correctly.

To verify:
```bash
# Connect to database
docker-compose exec db psql -U recipeuser -d recipeapp

# List tables
\dt

# You should see: users, recipes, ingredients, etc.
# Exit with: \q
```

---

## GitHub Actions Issues

### Issue: Workflow doesn't run

**Symptoms:**
- No workflow appears in Actions tab after push
- Actions tab is empty

**Solution:**
1. **Enable GitHub Actions:**
   - Go to: https://github.com/ryanvt2005/Recipes/actions
   - If you see "Workflows disabled", click "I understand..."

2. **Check branch name:**
   - Workflow only runs on branch: `claude/recipe-app-backend-UoTAm`
   - Verify you pushed to correct branch:
     ```bash
     git branch --show-current
     ```

3. **Check workflow file syntax:**
   - Go to: https://github.com/ryanvt2005/Recipes/blob/claude/recipe-app-backend-UoTAm/.github/workflows/
   - Click on workflow file
   - GitHub will show syntax errors if any

### Issue: "Secret not found" error

**Symptoms:**
```
Error: Secret LIGHTSAIL_IP not found
```

**Solution:**
1. **Add missing secrets:**
   - Go to: https://github.com/ryanvt2005/Recipes/settings/secrets/actions
   - Click "New repository secret"
   - Add each required secret:

| Secret Name | Where to Get It |
|-------------|----------------|
| `LIGHTSAIL_IP` | Lightsail console → Your instance → Public IP |
| `LIGHTSAIL_SSH_KEY` | Download from Lightsail → Account → SSH keys |
| `ANTHROPIC_API_KEY` | https://console.anthropic.com/ |
| `JWT_SECRET` | Generate: `openssl rand -base64 32` |
| `DB_PASSWORD` | Generate: `openssl rand -base64 24` |

2. **Verify secrets are set:**
   - Go to secrets page
   - You should see all 5 secrets listed
   - Click "Update" to change a secret

### Issue: SSH connection failed

**Symptoms:**
```
Permission denied (publickey)
```

**Solution:**

**Method 1: Use the correct SSH key**

1. **Download the correct key:**
   - Go to: https://lightsail.aws.amazon.com/
   - Click "Account" (top right)
   - Click "Account" → "SSH keys" tab
   - Find your region's default key
   - Click "Download" (downloads a .pem file)

2. **Open the .pem file in a text editor**
   - It should look like this:
     ```
     -----BEGIN RSA PRIVATE KEY-----
     MIIEpAIBAAKCAQEA...
     (many lines of random characters)
     ...
     -----END RSA PRIVATE KEY-----
     ```

3. **Copy the ENTIRE contents** (including BEGIN and END lines)

4. **Update GitHub Secret:**
   - Go to: https://github.com/ryanvt2005/Recipes/settings/secrets/actions
   - Click on `LIGHTSAIL_SSH_KEY`
   - Click "Update"
   - Paste the entire key
   - Click "Update secret"

**Method 2: Create a new key pair**

If you can't find the default key:

1. **SSH into your Lightsail instance** (browser SSH)

2. **Add a new public key:**
   ```bash
   # On your local machine or CloudShell, generate a new key:
   ssh-keygen -t rsa -b 4096 -f lightsail_key -N ""

   # This creates:
   # - lightsail_key (private - add to GitHub Secret)
   # - lightsail_key.pub (public - add to Lightsail)
   ```

3. **Add public key to Lightsail:**
   ```bash
   # SSH into Lightsail (browser SSH)
   # Then run:
   mkdir -p ~/.ssh
   echo "YOUR_PUBLIC_KEY_CONTENTS" >> ~/.ssh/authorized_keys
   chmod 600 ~/.ssh/authorized_keys
   ```

4. **Add private key to GitHub Secret**

### Issue: "Recipes directory not found"

**Symptoms:**
```
❌ Recipes directory not found. Please run initial setup first.
```

**Solution:**
You need to run the initial setup on Lightsail first:

1. **SSH into your Lightsail instance** (browser SSH)

2. **Run setup:**
   ```bash
   cd /home/ec2-user
   git clone https://github.com/ryanvt2005/Recipes.git
   cd Recipes
   git checkout claude/recipe-app-backend-UoTAm
   ```

3. **Retry the GitHub Action**

### Issue: Git pull fails in workflow

**Symptoms:**
```
fatal: could not read Username for 'https://github.com'
```

**Solution:**

For **private repositories**, you need to set up authentication:

**Option A: Make repo public** (simplest):
1. Go to: https://github.com/ryanvt2005/Recipes/settings
2. Scroll to "Danger Zone"
3. Click "Change visibility" → "Public"

**Option B: Use deploy key** (for private repos):
1. **Generate a deploy key:**
   ```bash
   ssh-keygen -t ed25519 -f deploy_key -N ""
   ```

2. **Add public key to GitHub:**
   - Go to: https://github.com/ryanvt2005/Recipes/settings/keys
   - Click "Add deploy key"
   - Paste contents of `deploy_key.pub`
   - Check "Allow write access"

3. **Add private key to Lightsail:**
   ```bash
   # SSH into Lightsail
   mkdir -p ~/.ssh
   nano ~/.ssh/id_ed25519
   # Paste private key, save with Ctrl+X, Y, Enter
   chmod 600 ~/.ssh/id_ed25519
   ```

4. **Update git remote:**
   ```bash
   cd ~/Recipes
   git remote set-url origin git@github.com:ryanvt2005/Recipes.git
   ```

### Issue: Health check fails

**Symptoms:**
```
⚠️ Health check failed after 5 attempts
```

**Solution:**

1. **Wait a minute** - The app might still be starting

2. **Check manually:**
   ```bash
   # SSH into Lightsail
   curl http://localhost:3000/health
   ```

3. **If that works, the issue is firewall:**
   - Go to Lightsail → Networking
   - Ensure port 3000 is open

4. **Check Docker containers:**
   ```bash
   docker-compose ps
   # Both backend and db should show "Up"
   ```

5. **Check backend logs:**
   ```bash
   docker-compose logs --tail=50 backend
   ```

6. **Common backend errors:**

   **"ANTHROPIC_API_KEY is not set":**
   ```bash
   # Check .env file
   cat .env
   # Make sure ANTHROPIC_API_KEY is set correctly
   ```

   **"Database connection refused":**
   ```bash
   # Restart containers
   docker-compose restart
   sleep 15
   docker-compose exec backend npm run migrate
   ```

---

## Still Not Working?

### Get Detailed Logs

**From GitHub Actions:**
1. Go to: https://github.com/ryanvt2005/Recipes/actions
2. Click on the failed workflow run
3. Click on "Deploy to Lightsail" job
4. Expand each step to see detailed logs
5. Copy the error message

**From Lightsail:**
```bash
# SSH into instance
docker-compose logs --tail=100 backend
docker-compose logs --tail=100 db

# Check if containers are running
docker-compose ps

# Check if ports are listening
sudo netstat -tlnp | grep 3000

# Check environment variables
docker-compose exec backend env | grep -E 'DB_|JWT_|ANTHROPIC'
```

### Manual Verification Checklist

Run these commands on your Lightsail instance:

```bash
# 1. Docker installed?
docker --version

# 2. Docker Compose installed?
docker-compose --version

# 3. Repo cloned?
ls -la ~/Recipes

# 4. Containers running?
cd ~/Recipes && docker-compose ps

# 5. Backend accessible internally?
curl http://localhost:3000/health

# 6. Backend accessible externally?
curl http://$(curl -s ifconfig.me):3000/health

# 7. Check backend logs
docker-compose logs --tail=20 backend

# 8. Check database
docker-compose exec db psql -U recipeuser -d recipeapp -c "\dt"
```

### Create a Test Issue

If still stuck, create an issue with:

1. **Which deployment method** you tried
2. **Complete error message** (from GitHub Actions or terminal)
3. **Output of verification checklist** (above)
4. **Your Lightsail instance details:**
   - Plan size (e.g., $5/month, 1GB RAM)
   - Region (e.g., us-east-1)
   - Whether ports are open

---

## Quick Fixes Summary

| Problem | Quick Fix |
|---------|-----------|
| Permission denied | Exit and reconnect SSH after adding user to docker group |
| Docker not found | Install Docker: `sudo yum install -y docker` |
| Port not accessible | Open port 3000 in Lightsail Networking tab |
| Database error | `docker-compose restart && sleep 15` |
| Migration error | Already done? Check with `\dt` in psql |
| SSH fails (Actions) | Re-download key from Lightsail → Account → SSH keys |
| Secret not found | Add all 5 secrets to GitHub repo settings |
| Repo not found | Clone it first: `git clone https://github.com/ryanvt2005/Recipes.git` |
| Health check fails | Wait 30 seconds, check `docker-compose logs backend` |
| Private repo error | Make repo public or add deploy key |

---

## Start Fresh

If everything is broken, start completely fresh:

```bash
# On Lightsail instance:
cd ~
rm -rf Recipes
docker-compose down -v  # Remove containers and volumes

# Then follow DEPLOY_QUICKSTART.md from the beginning
```

---

## Need More Help?

Share the following info:

1. **Error message** (full text)
2. **Output of:** `docker-compose logs backend`
3. **Output of:** `docker-compose ps`
4. **GitHub Actions logs** (screenshot or text)
5. **Instance IP** (if comfortable sharing)

This will help diagnose the exact issue!
