# GitHub Actions Automated Deployment Setup

This guide shows you how to set up **fully automated deployments** from GitHub to AWS - no local machine required!

## 🎯 What This Does

Every time you push code to GitHub, it automatically:
1. ✅ Builds your Docker image
2. ✅ Deploys to AWS Lightsail
3. ✅ Runs database migrations
4. ✅ Restarts the application
5. ✅ Tests the health endpoint

**Zero local configuration needed!**

---

## 📋 One-Time Setup (15 minutes)

### Step 1: Create a Lightsail Instance (via AWS Console)

1. **Go to AWS Lightsail Console**
   - Visit: https://lightsail.aws.amazon.com/
   - Click "Create instance"

2. **Configure Instance**
   - Platform: Linux/Unix
   - Blueprint: OS Only → Amazon Linux 2
   - Plan: $5/month (1GB RAM - recommended) or $3.50/month (512MB)
   - Name: `recipe-app-prod`
   - Click "Create instance"

3. **Wait for Instance to Start** (about 1 minute)

4. **Get Instance IP Address**
   - Click on your instance
   - Copy the "Public IP" (you'll need this)

5. **Open Ports**
   - Click "Networking" tab
   - Under "IPv4 Firewall", add rule:
     - Application: Custom
     - Protocol: TCP
     - Port: 3000
   - Click "Create"

6. **Download SSH Key**
   - Click "Account" (top right)
   - Click "Account" → "SSH keys"
   - Download the default key for your region
   - Keep this file safe - you'll need it

---

### Step 2: Setup the Instance (One Time)

1. **Connect via Browser SSH**
   - Go back to your Lightsail instance
   - Click "Connect using SSH" (opens browser terminal)

2. **Run Initial Setup Commands** (paste into browser SSH):

```bash
# Update system
sudo yum update -y

# Install Docker
sudo yum install -y docker git
sudo service docker start
sudo usermod -a -G docker ec2-user

# Enable Docker on boot
sudo systemctl enable docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Clone repository
cd /home/ec2-user
git clone https://github.com/ryanvt2005/Recipes.git
cd Recipes
git checkout claude/recipe-app-backend-UoTAm

# Create initial .env (GitHub Actions will update this)
cat > .env << 'EOF'
DB_NAME=recipeapp
DB_USER=recipeuser
DB_PASSWORD=PLACEHOLDER
JWT_SECRET=PLACEHOLDER
ANTHROPIC_API_KEY=PLACEHOLDER
NODE_ENV=production
FRONTEND_URL=http://localhost:3001
EOF

# Make ec2-user owner
sudo chown -R ec2-user:ec2-user /home/ec2-user/Recipes

echo "✅ Initial setup complete!"
```

3. **Important: Enable Password-less Git Pull**
```bash
# Configure git to use HTTPS and cache credentials
cd ~/Recipes
git config --global credential.helper store
git config --global user.email "github-actions@automated.com"
git config --global user.name "GitHub Actions"

# Make the repo accessible
git remote set-url origin https://github.com/ryanvt2005/Recipes.git
```

---

### Step 3: Add Secrets to GitHub

1. **Go to Your GitHub Repository**
   - Visit: https://github.com/ryanvt2005/Recipes

2. **Navigate to Secrets**
   - Click "Settings" tab
   - Click "Secrets and variables" → "Actions"
   - Click "New repository secret"

3. **Add These Secrets** (one by one):

| Secret Name | Value | How to Get |
|------------|-------|------------|
| `LIGHTSAIL_IP` | Your instance IP | From Lightsail console (e.g., 54.123.45.67) |
| `LIGHTSAIL_SSH_KEY` | SSH private key | Contents of downloaded .pem file |
| `ANTHROPIC_API_KEY` | Your Claude API key | From https://console.anthropic.com/ |
| `JWT_SECRET` | Random 32+ chars | Run: `openssl rand -base64 32` |
| `DB_PASSWORD` | Strong password | Run: `openssl rand -base64 24` |

**For `LIGHTSAIL_SSH_KEY`:**
- Open the downloaded `.pem` file in a text editor
- Copy the **entire contents** (including `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----`)
- Paste into GitHub Secret

---

### Step 4: Enable GitHub Actions

1. **Go to Actions Tab**
   - Click "Actions" in your GitHub repo
   - If disabled, click "I understand my workflows, go ahead and enable them"

2. **The Workflow is Already There!**
   - The workflow file is at `.github/workflows/deploy-lightsail-simple.yml`
   - It will run automatically on every push to `claude/recipe-app-backend-UoTAm`

---

## 🚀 Testing the Deployment

### Option 1: Make a Test Commit

1. **Edit README in GitHub Web UI**
   - Go to your repo on github.com
   - Click on `README.md`
   - Click the pencil icon (Edit)
   - Add a line: `<!-- Test deployment -->`
   - Click "Commit changes"

2. **Watch the Deployment**
   - Go to "Actions" tab
   - You'll see a workflow running
   - Click on it to see live logs

### Option 2: Manual Trigger

1. **Go to Actions Tab**
   - Click "Deploy to Lightsail (Simple)"
   - Click "Run workflow" button
   - Select branch: `claude/recipe-app-backend-UoTAm`
   - Click "Run workflow"

---

## 📊 What Happens on Each Push

```mermaid
Push to GitHub
    ↓
GitHub Actions Triggers
    ↓
SSH into Lightsail
    ↓
Git Pull Latest Code
    ↓
Update .env with Secrets
    ↓
Rebuild Docker Containers
    ↓
Run Database Migrations
    ↓
Health Check
    ↓
✅ Deployment Complete
```

---

## 🔍 Monitoring & Debugging

### View Deployment Logs

1. **In GitHub:**
   - Go to "Actions" tab
   - Click on the latest workflow run
   - Click on "Deploy to Lightsail" job
   - Expand steps to see detailed logs

2. **On Server:**
```bash
# SSH into Lightsail (browser SSH or terminal)
cd ~/Recipes
docker-compose logs -f backend
```

### Common Issues

**Problem: SSH Connection Failed**
- Solution: Make sure `LIGHTSAIL_SSH_KEY` secret contains the full private key
- Check that the instance IP is correct

**Problem: Git Pull Fails**
- Solution: Make sure the repo is public, or set up deploy keys

**Problem: Docker Compose Fails**
- Solution: Check environment variables are set correctly
- View logs: `docker-compose logs backend`

**Problem: Migration Fails**
- Solution: Database might not be ready yet
- SSH in and run manually: `docker-compose exec backend npm run migrate`

---

## 🎉 Success!

After setup, your deployment workflow:

1. ✅ **Completely Automated** - Push to GitHub, automatically deploys
2. ✅ **No Local Machine** - Everything runs in GitHub Actions
3. ✅ **Live in 2 Minutes** - From push to production
4. ✅ **Always Up-to-Date** - Latest code is always running
5. ✅ **Free CI/CD** - GitHub Actions is free for public repos

**Your API is now live at:** `http://YOUR_LIGHTSAIL_IP:3000`

### Test It:
```bash
curl http://YOUR_LIGHTSAIL_IP:3000/health
```

---

## 🔒 Security Best Practices

1. **Never Commit Secrets** - Always use GitHub Secrets
2. **Use Strong Passwords** - Generate with `openssl rand -base64 32`
3. **Restrict SSH Access** - In Lightsail firewall, limit SSH to your IP
4. **Enable HTTPS** - Use Certbot for SSL certificates (see below)
5. **Regular Updates** - Keep dependencies updated

---

## 🌐 Optional: Add HTTPS

Once deployed, you can add SSL:

```bash
# SSH into Lightsail
sudo yum install -y certbot
sudo certbot certonly --standalone -d yourdomain.com

# Update docker-compose.yml to use SSL
# Add nginx reverse proxy with SSL
```

---

## 📈 Next Steps

Now that you have automated deployments:

1. **Add a Domain Name**
   - Buy domain in Route 53 or Namecheap
   - Point A record to your Lightsail IP
   - Set up HTTPS

2. **Scale Up**
   - Upgrade Lightsail plan if needed
   - Or migrate to Elastic Beanstalk for auto-scaling

3. **Add Monitoring**
   - Set up CloudWatch alerts
   - Add Sentry for error tracking

4. **Build the Frontend**
   - Deploy React app to same workflow
   - Or use Vercel/Netlify for frontend

---

## 💡 Pro Tips

- **Branch Protection:** Set up branch protection rules to require successful deployment before merging
- **Staging Environment:** Create a second Lightsail instance for staging
- **Database Backups:** Set up automated snapshots in Lightsail
- **Cost Monitoring:** Set up AWS billing alerts

---

## 🆘 Need Help?

If something doesn't work:

1. Check GitHub Actions logs (most detailed)
2. SSH into Lightsail and check Docker logs
3. Verify all secrets are set correctly
4. Make sure ports are open in Lightsail firewall

Common fixes are usually:
- Wrong IP address in secret
- SSH key not properly formatted
- Firewall blocking port 3000
- Environment variables not set

---

## ✅ Verification Checklist

After completing setup, verify:

- [ ] Lightsail instance is running
- [ ] Port 3000 is open in firewall
- [ ] All GitHub Secrets are added
- [ ] GitHub Actions is enabled
- [ ] First deployment succeeded
- [ ] Health endpoint returns 200: `http://YOUR_IP:3000/health`
- [ ] Can create a user via API
- [ ] Can extract a recipe via API

**You're now deploying like a pro! 🎉**
