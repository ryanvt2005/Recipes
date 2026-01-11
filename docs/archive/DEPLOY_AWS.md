# AWS Deployment Guide - Recipe Management App

Choose the deployment method that best fits your needs:

## 🚀 Option 1: AWS Lightsail (FASTEST & CHEAPEST)

**Best for:** Testing, development, small-scale production
**Time:** ~10 minutes
**Cost:** $3.50-10/month
**Difficulty:** ⭐ Easy

### Quick Start

1. **Install AWS CLI** (if not already installed):
   ```bash
   # macOS
   brew install awscli

   # Linux
   curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
   unzip awscliv2.zip
   sudo ./aws/install

   # Windows
   # Download and run: https://awscli.amazonaws.com/AWSCLIV2.msi
   ```

2. **Configure AWS credentials**:
   ```bash
   aws configure
   # Enter your AWS Access Key ID
   # Enter your AWS Secret Access Key
   # Default region: us-east-1
   # Default output format: json
   ```

3. **Deploy using the script**:
   ```bash
   chmod +x deploy-lightsail.sh
   ./deploy-lightsail.sh
   ```

4. **SSH into the instance** (use the IP from step 3):
   ```bash
   # Get SSH access details
   aws lightsail get-instance-access-details --instance-name <instance-name> --region us-east-1

   # Or use AWS Console browser SSH
   ```

5. **Run setup on the instance**:
   ```bash
   # Upload and run the setup script
   # Copy the deploy-lightsail-setup.sh content and run it

   # Or manually:
   curl -o setup.sh https://raw.githubusercontent.com/ryanvt2005/Recipes/claude/recipe-app-backend-UoTAm/deploy-lightsail-setup.sh
   chmod +x setup.sh
   ./setup.sh
   ```

6. **Update environment variables**:
   ```bash
   cd Recipes
   nano .env
   # Add your ANTHROPIC_API_KEY
   # Save with Ctrl+X, then Y, then Enter

   docker-compose up -d
   docker-compose exec backend npm run migrate
   ```

7. **Test your API**:
   ```bash
   curl http://<YOUR-IP>:3000/health
   ```

### Lightsail Management

```bash
# View instance details
aws lightsail get-instance --instance-name <name> --region us-east-1

# Create static IP (optional, for permanent IP)
aws lightsail allocate-static-ip --static-ip-name recipe-app-ip --region us-east-1
aws lightsail attach-static-ip --static-ip-name recipe-app-ip --instance-name <name> --region us-east-1

# Stop instance (to save money when not testing)
aws lightsail stop-instance --instance-name <name> --region us-east-1

# Start instance
aws lightsail start-instance --instance-name <name> --region us-east-1

# Delete instance (stop billing)
aws lightsail delete-instance --instance-name <name> --region us-east-1
```

---

## 🏗️ Option 2: AWS EC2 (Manual but Flexible)

**Best for:** Full control, custom configurations
**Time:** ~15 minutes
**Cost:** $7-15/month
**Difficulty:** ⭐⭐ Medium

### Quick Start

1. **Launch EC2 instance**:
   ```bash
   # Create key pair
   aws ec2 create-key-pair --key-name recipe-app-key --query 'KeyMaterial' --output text > recipe-app-key.pem
   chmod 400 recipe-app-key.pem

   # Launch instance (Amazon Linux 2)
   INSTANCE_ID=$(aws ec2 run-instances \
     --image-id ami-0c55b159cbfafe1f0 \
     --count 1 \
     --instance-type t3.small \
     --key-name recipe-app-key \
     --security-group-ids <your-security-group> \
     --query 'Instances[0].InstanceId' \
     --output text)

   echo "Instance ID: $INSTANCE_ID"
   ```

2. **Configure security group**:
   ```bash
   # Allow HTTP, HTTPS, SSH, and API port
   aws ec2 authorize-security-group-ingress --group-id <sg-id> --protocol tcp --port 22 --cidr 0.0.0.0/0
   aws ec2 authorize-security-group-ingress --group-id <sg-id> --protocol tcp --port 80 --cidr 0.0.0.0/0
   aws ec2 authorize-security-group-ingress --group-id <sg-id> --protocol tcp --port 443 --cidr 0.0.0.0/0
   aws ec2 authorize-security-group-ingress --group-id <sg-id> --protocol tcp --port 3000 --cidr 0.0.0.0/0
   ```

3. **SSH and setup** (same as Lightsail setup script)

---

## ☁️ Option 3: AWS Elastic Beanstalk (Auto-Scaling)

**Best for:** Production, auto-scaling needs
**Time:** ~20 minutes
**Cost:** $15-50/month
**Difficulty:** ⭐⭐⭐ Advanced

See [deploy-elasticbeanstalk.md](./deploy-elasticbeanstalk.md) for detailed instructions.

Quick version:
```bash
pip install awsebcli
eb init recipe-app --platform docker --region us-east-1
eb create recipe-app-prod --instance-type t3.small
eb setenv ANTHROPIC_API_KEY=sk-ant-api03-YOUR_KEY_HERE JWT_SECRET=your-secret
```

---

## 🐳 Option 4: AWS ECS with Fargate (Container-Native)

**Best for:** Microservices, containerized workloads
**Time:** ~25 minutes
**Cost:** $20-40/month
**Difficulty:** ⭐⭐⭐ Advanced

### Quick Start with ECS

1. **Create ECR repositories**:
   ```bash
   aws ecr create-repository --repository-name recipe-app-backend --region us-east-1
   ```

2. **Build and push image**:
   ```bash
   # Get ECR login
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

   # Build and tag
   cd backend
   docker build -t recipe-app-backend .
   docker tag recipe-app-backend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/recipe-app-backend:latest

   # Push
   docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/recipe-app-backend:latest
   ```

3. **Create ECS cluster and service** (via AWS Console or CLI)

---

## 🎯 Comparison Table

| Method | Time | Cost/Month | Scaling | Difficulty | Best For |
|--------|------|------------|---------|------------|----------|
| **Lightsail** | 10min | $3.50-10 | Manual | ⭐ | Testing, MVP |
| **EC2** | 15min | $7-15 | Manual | ⭐⭐ | Full control |
| **Elastic Beanstalk** | 20min | $15-50 | Auto | ⭐⭐⭐ | Production |
| **ECS Fargate** | 25min | $20-40 | Auto | ⭐⭐⭐ | Containers |

---

## 📋 Pre-Deployment Checklist

Before deploying, make sure you have:

- [ ] AWS account with billing enabled
- [ ] AWS CLI installed and configured (`aws configure`)
- [ ] Anthropic API key ([Get one here](https://console.anthropic.com/))
- [ ] Git repository pushed to GitHub/GitLab
- [ ] Environment variables ready:
  - `ANTHROPIC_API_KEY`
  - `JWT_SECRET` (32+ random characters)
  - `DB_PASSWORD` (secure password)

Generate secure secrets:
```bash
# Generate JWT_SECRET
openssl rand -base64 32

# Generate DB_PASSWORD
openssl rand -base64 24
```

---

## 🔧 Post-Deployment Steps

After deployment:

1. **Run database migrations**:
   ```bash
   docker-compose exec backend npm run migrate
   ```

2. **Test the API**:
   ```bash
   # Health check
   curl http://<YOUR-IP>:3000/health

   # Register a user
   curl -X POST http://<YOUR-IP>:3000/api/v1/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "TestPass123!",
       "firstName": "Test",
       "lastName": "User"
     }'
   ```

3. **Set up domain (optional)**:
   - Buy domain in Route 53 or use external registrar
   - Point A record to your instance IP
   - Set up SSL with Let's Encrypt (see below)

4. **Enable HTTPS** (recommended):
   ```bash
   # Install Certbot
   sudo yum install -y certbot

   # Get certificate
   sudo certbot certonly --standalone -d yourdomain.com

   # Update docker-compose.yml to use HTTPS
   ```

---

## 🚨 Troubleshooting

### Connection refused
- Check security group allows port 3000
- Verify Docker containers are running: `docker-compose ps`
- Check logs: `docker-compose logs backend`

### Database connection error
- Wait 30 seconds for DB to initialize
- Check DB_HOST is set to 'db' in container
- Run migrations: `docker-compose exec backend npm run migrate`

### API returns 500 errors
- Check ANTHROPIC_API_KEY is set correctly
- View logs: `docker-compose logs -f backend`
- Verify all environment variables are set

### Out of memory
- Upgrade instance size (t3.micro → t3.small)
- Check container memory limits in docker-compose.yml

---

## 💰 Cost Optimization

To minimize costs:

1. **Use Lightsail** for testing ($3.50/month minimum)
2. **Stop instances** when not in use
3. **Use spot instances** for non-critical workloads (70% cheaper)
4. **Set up CloudWatch alarms** for unexpected charges
5. **Use AWS Free Tier** (first 12 months)
   - 750 hours/month t2.micro EC2
   - 750 hours/month RDS

---

## 📊 Monitoring

### CloudWatch Logs (for EB/ECS)
```bash
aws logs tail /aws/elasticbeanstalk/recipe-app-prod/var/log/eb-engine.log --follow
```

### Container Logs
```bash
docker-compose logs -f backend
```

### Disk Space
```bash
df -h
docker system df
docker system prune -a  # Clean up unused images
```

---

## 🗑️ Cleanup (Stop Billing)

### Lightsail
```bash
aws lightsail delete-instance --instance-name <name> --region us-east-1
```

### Elastic Beanstalk
```bash
eb terminate recipe-app-prod
```

### EC2
```bash
aws ec2 terminate-instances --instance-ids <instance-id>
```

---

## 📚 Additional Resources

- [AWS Lightsail Docs](https://lightsail.aws.amazon.com/ls/docs/)
- [Elastic Beanstalk Docker Guide](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/create_deploy_docker.html)
- [ECS Fargate Guide](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/getting-started-fargate.html)

---

## 🎉 Recommended Quick Start

For **fastest deployment and testing**:

```bash
# 1. Run the Lightsail deployment script
./deploy-lightsail.sh

# 2. SSH into the instance (get IP from output)
aws lightsail get-instance-access-details --instance-name <name> --region us-east-1

# 3. Run setup script on instance
bash <(curl -s https://raw.githubusercontent.com/ryanvt2005/Recipes/claude/recipe-app-backend-UoTAm/deploy-lightsail-setup.sh)

# 4. Update .env with your ANTHROPIC_API_KEY
nano ~/Recipes/.env

# 5. Restart and migrate
cd ~/Recipes
docker-compose restart
docker-compose exec backend npm run migrate

# 6. Test
curl http://$(curl -s ifconfig.me):3000/health
```

**Total time: ~10 minutes | Cost: $3.50/month**
