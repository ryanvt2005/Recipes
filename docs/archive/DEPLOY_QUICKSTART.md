# 🚀 Quick Start: Deploy from GitHub to AWS (5 Minutes)

**No local machine required. Everything done via web browser.**

## Option A: Manual Lightsail (Fastest - 5 min) ⭐ RECOMMENDED

### Step 1: Create Instance (2 minutes)
1. Go to https://lightsail.aws.amazon.com/
2. Click "Create instance"
3. Select: **Amazon Linux 2**
4. Choose plan: **$5/month** (1GB RAM)
5. Name it: `recipe-app`
6. Click **"Create instance"**
7. **Save the public IP** (you'll see it in 30 seconds)

### Step 2: Open Port (30 seconds)
1. Click your instance name
2. Go to "Networking" tab
3. Click "Add rule"
4. Custom TCP, Port: `3000`
5. Click "Create"

### Step 3: Setup Server (2 minutes)
1. Click **"Connect using SSH"** (opens browser terminal)
2. **Copy and paste this entire block** into the terminal:

```bash
# Install everything
sudo yum update -y && \
sudo yum install -y docker git && \
sudo service docker start && \
sudo usermod -a -G docker ec2-user && \
sudo systemctl enable docker && \
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose && \
sudo chmod +x /usr/local/bin/docker-compose && \
cd /home/ec2-user && \
git clone https://github.com/ryanvt2005/Recipes.git && \
cd Recipes && \
git checkout claude/recipe-app-backend-UoTAm && \
echo "✅ Installation complete! Now edit .env file..."
```

3. **Edit .env file** (still in the terminal):
```bash
cat > .env << 'EOF'
DB_NAME=recipeapp
DB_USER=recipeuser
DB_PASSWORD=MySecurePassword123!
JWT_SECRET=change-this-to-a-random-32-character-string-here
ANTHROPIC_API_KEY=sk-ant-api03-YOUR_KEY_HERE
NODE_ENV=production
FRONTEND_URL=http://localhost:3001
EOF
```

Replace `YOUR_KEY_HERE` with your actual Anthropic API key.

4. **Start the app:**
```bash
docker-compose up -d && \
sleep 15 && \
docker-compose exec -T backend npm run migrate && \
echo "✅ App is running!"
```

### Step 4: Test (30 seconds)
```bash
# In the terminal, run:
curl http://$(curl -s ifconfig.me):3000/health

# You should see: {"status":"healthy",...}
```

**Your API is live at: `http://YOUR_IP:3000`**

---

## Option B: Automated with GitHub Actions (15 min setup, then auto-deploy forever)

### Why Use This?
- ✅ Push code to GitHub → Automatically deploys
- ✅ No manual SSH needed after setup
- ✅ Professional CI/CD pipeline
- ✅ Perfect for ongoing development

### Setup Steps:

1. **Follow Option A above** (create Lightsail instance)

2. **Download SSH Key:**
   - In Lightsail console, click "Account" (top right)
   - Go to "SSH keys" tab
   - Download your region's default key (`.pem` file)

3. **Add Secrets to GitHub:**
   - Go to: https://github.com/ryanvt2005/Recipes/settings/secrets/actions
   - Click "New repository secret" and add these:

   | Name | Value |
   |------|-------|
   | `LIGHTSAIL_IP` | Your instance IP (e.g., 54.123.45.67) |
   | `LIGHTSAIL_SSH_KEY` | Full contents of .pem file |
   | `ANTHROPIC_API_KEY` | Your Claude API key |
   | `JWT_SECRET` | Random 32 chars (use `openssl rand -base64 32`) |
   | `DB_PASSWORD` | Random password (use `openssl rand -base64 24`) |

4. **Enable GitHub Actions:**
   - Go to: https://github.com/ryanvt2005/Recipes/actions
   - Click "I understand my workflows, go ahead and enable them"

5. **Trigger First Deployment:**
   - Click "Deploy to Lightsail (Simple)" workflow
   - Click "Run workflow"
   - Select branch: `claude/recipe-app-backend-UoTAm`
   - Click green "Run workflow" button

6. **Watch It Deploy:**
   - Click on the running workflow
   - Expand "Deploy to Lightsail" to see logs
   - Wait ~2 minutes

**Done! Now every push to GitHub automatically deploys! 🎉**

---

## Option C: AWS CloudShell (No local install, but uses CLI)

### Step 1: Open CloudShell
1. Log into AWS Console: https://console.aws.amazon.com/
2. Click the terminal icon `>_` in the top bar
3. Wait for CloudShell to load

### Step 2: Create Instance
```bash
# Create Lightsail instance
INSTANCE_NAME="recipe-app"
aws lightsail create-instances \
  --instance-names "$INSTANCE_NAME" \
  --availability-zone us-east-1a \
  --blueprint-id amazon_linux_2 \
  --bundle-id small_2_0 \
  --region us-east-1

# Wait for it to start
aws lightsail wait instance-running \
  --instance-name "$INSTANCE_NAME" \
  --region us-east-1

# Open port
aws lightsail open-instance-public-ports \
  --port-info fromPort=3000,toPort=3000,protocol=tcp \
  --instance-name "$INSTANCE_NAME" \
  --region us-east-1

# Get IP
aws lightsail get-instance \
  --instance-name "$INSTANCE_NAME" \
  --query 'instance.publicIpAddress' \
  --output text
```

### Step 3: Connect and Setup
- Go to Lightsail console
- Click "Connect using SSH"
- Follow Step 3 from Option A

---

## 🎯 Which Option Should I Choose?

| If You Want... | Use This |
|----------------|----------|
| **Quickest test** | Option A (5 min) |
| **Auto-deploy on every push** | Option B (15 min setup) |
| **No browser SSH, prefer CLI** | Option C |

---

## ✅ Verify It Works

After deployment, test these endpoints:

```bash
# 1. Health check
curl http://YOUR_IP:3000/health

# 2. Register a user
curl -X POST http://YOUR_IP:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!",
    "firstName": "Test"
  }'

# You should get back a user object and JWT token
```

---

## 🆘 Troubleshooting

**Can't connect to API:**
- Check port 3000 is open in Lightsail firewall
- Run: `docker-compose ps` to see if containers are running
- Check logs: `docker-compose logs backend`

**Database errors:**
- Run migrations: `docker-compose exec backend npm run migrate`
- Restart: `docker-compose restart`

**API returns 500 errors:**
- Check ANTHROPIC_API_KEY is set correctly
- View logs: `docker-compose logs -f backend`

---

## 💰 Cost

- **Lightsail:** $5/month (1GB instance)
- **Total:** $5/month

**Stop instance when not testing:**
- Go to Lightsail console
- Click instance → "Stop"
- Won't be charged while stopped
- Start again anytime

---

## 🎉 You're Done!

Your Recipe Management API is now live at:
- **Health:** `http://YOUR_IP:3000/health`
- **API Docs:** See main README.md for all endpoints

### What's Next?

1. **Test the API** - Try extracting recipes from URLs
2. **Build the Frontend** - React app connecting to this API
3. **Add a Domain** - Point your domain to the IP
4. **Enable HTTPS** - Use Let's Encrypt for SSL

**Happy cooking! 👨‍🍳**
