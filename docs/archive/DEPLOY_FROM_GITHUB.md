# Deploy Recipe App from GitHub to AWS (No Local Machine Required)

This guide shows how to deploy directly from your GitHub repository to AWS without storing anything locally.

## 🚀 Method 1: AWS Amplify (EASIEST - Click & Deploy)

**Time:** 5 minutes
**Cost:** ~$15/month
**No CLI needed:** Everything via AWS Console

### Steps:

1. **Go to AWS Amplify Console**
   - Visit: https://console.aws.amazon.com/amplify/
   - Click "New app" → "Host web app"

2. **Connect GitHub**
   - Select "GitHub"
   - Click "Connect to GitHub" and authorize AWS Amplify
   - Select repository: `ryanvt2005/Recipes`
   - Select branch: `claude/recipe-app-backend-UoTAm`

3. **Configure Build Settings**

   Create this build spec (Amplify will detect it):

   ```yaml
   version: 1
   backend:
     phases:
       build:
         commands:
           - cd backend
           - npm ci
           - npm run migrate
   frontend:
     phases:
       build:
         commands:
           - echo "No frontend yet"
     artifacts:
       baseDirectory: /
       files:
         - '**/*'
   ```

4. **Add Environment Variables** in Amplify Console:
   - `DB_HOST` = (Amplify provides RDS)
   - `DB_NAME` = recipeapp
   - `DB_USER` = recipeuser
   - `DB_PASSWORD` = YourSecurePassword
   - `JWT_SECRET` = your-32-char-secret
   - `ANTHROPIC_API_KEY` = sk-ant-api03-YOUR-KEY
   - `NODE_ENV` = production

5. **Click "Save and Deploy"**

**Note:** Amplify is primarily for frontend apps. For backend APIs, use one of the methods below.

---

## 🎯 Method 2: GitHub Actions → AWS (RECOMMENDED)

**Time:** 10 minutes setup, then auto-deploys on every push
**Cost:** Free CI/CD + AWS costs
**Fully automated**

This creates a workflow that automatically deploys to AWS whenever you push to GitHub.

### Setup Instructions:

#### Step 1: Create AWS User for GitHub Actions

1. Go to AWS IAM Console: https://console.aws.amazon.com/iam/
2. Create new user: `github-actions-deploy`
3. Attach policies:
   - `AmazonEC2FullAccess` (for EC2 deployment)
   - `AmazonECS_FullAccess` (for ECS deployment)
   - Or create custom policy with minimal permissions

4. Create access key → Save the credentials

#### Step 2: Add Secrets to GitHub

1. Go to your GitHub repo: https://github.com/ryanvt2005/Recipes
2. Settings → Secrets and variables → Actions
3. Add these secrets:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION` (e.g., `us-east-1`)
   - `ANTHROPIC_API_KEY`
   - `JWT_SECRET`
   - `DB_PASSWORD`

#### Step 3: I'll create the GitHub Actions workflow for you

(See the workflow file I'm creating below)

---

## 🐳 Method 3: AWS CodePipeline (AWS Native CI/CD)

**Time:** 15 minutes
**Cost:** ~$1/month for pipeline + compute costs
**Fully automated, no GitHub Actions needed**

### Setup via AWS Console:

1. **Go to CodePipeline Console**
   - Visit: https://console.aws.amazon.com/codesuite/codepipeline/
   - Click "Create pipeline"

2. **Configure Source**
   - Pipeline name: `recipe-app-pipeline`
   - Source provider: `GitHub (Version 2)`
   - Click "Connect to GitHub"
   - Select repository: `ryanvt2005/Recipes`
   - Branch: `claude/recipe-app-backend-UoTAm`
   - Detection: `Start the pipeline on source code change`

3. **Add Build Stage**
   - Build provider: `AWS CodeBuild`
   - Click "Create project"
   - Project name: `recipe-app-build`
   - Environment: `Ubuntu` + `Standard` + `aws/codebuild/standard:7.0`
   - Buildspec: `Use a buildspec file` (I'll create this below)

4. **Add Deploy Stage**
   - Deploy provider: `Amazon ECS` or `AWS Elastic Beanstalk`
   - (Or skip this and manually deploy from built artifacts)

5. **Review and Create**

---

## 🖱️ Method 4: One-Click Lightsail Deploy (SIMPLEST)

**Time:** 5 minutes in AWS Console
**Cost:** $3.50-10/month
**No local machine or CLI needed**

### Steps:

1. **Create Lightsail Instance via Console**
   - Go to: https://lightsail.aws.amazon.com/
   - Click "Create instance"
   - Select: Linux/Unix → OS Only → Amazon Linux 2
   - Choose plan: $3.50/month (512MB) or $5/month (1GB)
   - Name it: `recipe-app`
   - Click "Create instance"

2. **Connect via Browser SSH**
   - Click on your instance
   - Click "Connect using SSH" button (opens browser terminal)

3. **Run Setup Commands** (paste these into the browser terminal):

```bash
# Update system
sudo yum update -y

# Install Docker
sudo yum install -y docker git
sudo service docker start
sudo usermod -a -G docker ec2-user

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Clone your GitHub repo
cd /home/ec2-user
git clone https://github.com/ryanvt2005/Recipes.git
cd Recipes
git checkout claude/recipe-app-backend-UoTAm

# Create .env file
cat > .env << 'EOF'
DB_NAME=recipeapp
DB_USER=recipeuser
DB_PASSWORD=YOUR_SECURE_PASSWORD_HERE
JWT_SECRET=YOUR_32_CHAR_SECRET_HERE
ANTHROPIC_API_KEY=sk-ant-api03-YOUR_KEY_HERE
NODE_ENV=production
FRONTEND_URL=http://localhost:3001
EOF

# Edit the .env file to add your real keys
nano .env
# (Edit the file, then Ctrl+X, Y, Enter to save)

# Start Docker
sudo service docker start

# Start the application
docker-compose up -d

# Wait for database
sleep 15

# Run migrations
docker-compose exec -T backend npm run migrate

# Check status
docker-compose ps
echo "API URL: http://$(curl -s ifconfig.me):3000/health"
```

4. **Open Firewall Ports**
   - In Lightsail console, click on your instance
   - Go to "Networking" tab
   - Add custom rule: `TCP`, `3000`

5. **Test Your API**
   - Get your IP from Lightsail console
   - Visit: `http://YOUR_IP:3000/health`

---

## 🔄 Method 5: AWS CloudShell (No Local Install)

**Time:** 10 minutes
**Cost:** Free (CloudShell is free)
**Browser-based AWS CLI**

### Steps:

1. **Open AWS CloudShell**
   - Log into AWS Console: https://console.aws.amazon.com/
   - Click the CloudShell icon (>_) in the top navigation bar
   - Wait for shell to initialize

2. **Run Deployment Commands** (in CloudShell):

```bash
# Clone your repo
git clone https://github.com/ryanvt2005/Recipes.git
cd Recipes
git checkout claude/recipe-app-backend-UoTAm

# Create Lightsail instance
INSTANCE_NAME="recipe-app-$(date +%s)"
aws lightsail create-instances \
  --instance-names "$INSTANCE_NAME" \
  --availability-zone us-east-1a \
  --blueprint-id amazon_linux_2 \
  --bundle-id nano_2_0 \
  --region us-east-1

# Wait for it to be ready
aws lightsail wait instance-running \
  --instance-name "$INSTANCE_NAME" \
  --region us-east-1

# Open ports
aws lightsail open-instance-public-ports \
  --port-info fromPort=3000,toPort=3000,protocol=tcp \
  --instance-name "$INSTANCE_NAME" \
  --region us-east-1

# Get the IP
INSTANCE_IP=$(aws lightsail get-instance \
  --instance-name "$INSTANCE_NAME" \
  --region us-east-1 \
  --query 'instance.publicIpAddress' \
  --output text)

echo "Instance created: $INSTANCE_NAME"
echo "Public IP: $INSTANCE_IP"
echo ""
echo "Next: Connect via browser SSH and run the setup commands from Method 4"
```

3. **Connect and Setup**
   - Go to Lightsail console
   - Click "Connect using SSH"
   - Run the setup commands from Method 4

---

## 🎬 My Recommendation for You

Since you don't have anything local, here's the **absolute easiest path**:

### ⭐ Quick Start (5 minutes):

1. **Open AWS CloudShell** (browser-based, no install)
   - https://console.aws.amazon.com/cloudshell/

2. **Run this one command**:
```bash
bash <(curl -s https://raw.githubusercontent.com/ryanvt2005/Recipes/claude/recipe-app-backend-UoTAm/deploy-lightsail-setup.sh)
```

Wait, that won't work since you need to create the instance first. Let me create a single script...

---

## 📋 Comparison Table

| Method | Ease of Use | Time | Auto-Deploy | Cost |
|--------|-------------|------|-------------|------|
| **Lightsail Console** ⭐ | Very Easy | 5 min | No | $3.50/mo |
| **GitHub Actions** | Medium | 10 min | Yes | Free CI + AWS |
| **AWS CodePipeline** | Medium | 15 min | Yes | $1/mo + AWS |
| **CloudShell** | Easy | 10 min | No | Free + AWS |
| **AWS Amplify** | Very Easy | 5 min | Yes | $15/mo |

---

## 🎯 Recommended Approach

**For immediate testing:**
1. Use Lightsail Console (Method 4) - no local machine needed
2. Takes 5 minutes
3. Costs $3.50/month

**For production with auto-deploy:**
1. Set up GitHub Actions (Method 2) - deploys automatically on every push
2. One-time 10-minute setup
3. Then it's completely automated

Would you like me to create the GitHub Actions workflow and CodeBuild buildspec files?
