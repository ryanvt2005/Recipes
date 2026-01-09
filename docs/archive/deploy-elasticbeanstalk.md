# Deploy to AWS Elastic Beanstalk

Elastic Beanstalk is great for automatic scaling and integrated with AWS services. It supports Docker Compose directly.

## Prerequisites

1. AWS CLI installed and configured: `aws configure`
2. EB CLI installed: `pip install awsebcli`

## Quick Deployment Steps

### 1. Initialize Elastic Beanstalk

```bash
cd /home/user/Recipes

# Initialize EB application
eb init recipe-app --platform docker --region us-east-1

# This will create .elasticbeanstalk/config.yml
```

### 2. Create Environment Variables File

Create `.ebextensions/environment.config`:

```yaml
option_settings:
  aws:elasticbeanstalk:application:environment:
    DB_NAME: recipeapp
    DB_USER: recipeuser
    DB_PASSWORD: YourSecurePassword123!
    JWT_SECRET: your-super-secret-jwt-key-min-32-chars-long
    ANTHROPIC_API_KEY: sk-ant-api03-YOUR_KEY_HERE
    NODE_ENV: production
    FRONTEND_URL: http://your-eb-domain.elasticbeanstalk.com
```

### 3. Create Elastic Beanstalk Configuration

Create `Dockerrun.aws.json` in the root:

```json
{
  "AWSEBDockerrunVersion": 2,
  "containerDefinitions": [
    {
      "name": "db",
      "image": "postgres:15-alpine",
      "essential": true,
      "memory": 512,
      "environment": [
        {
          "name": "POSTGRES_DB",
          "value": "recipeapp"
        },
        {
          "name": "POSTGRES_USER",
          "value": "recipeuser"
        },
        {
          "name": "POSTGRES_PASSWORD",
          "value": "YourSecurePassword123!"
        }
      ],
      "mountPoints": [
        {
          "sourceVolume": "postgres_data",
          "containerPath": "/var/lib/postgresql/data"
        }
      ]
    },
    {
      "name": "backend",
      "image": "recipe-app-backend",
      "essential": true,
      "memory": 512,
      "portMappings": [
        {
          "hostPort": 80,
          "containerPort": 3000
        }
      ],
      "links": ["db"],
      "environment": [
        {
          "name": "DB_HOST",
          "value": "db"
        },
        {
          "name": "DB_PORT",
          "value": "5432"
        },
        {
          "name": "PORT",
          "value": "3000"
        }
      ]
    }
  ],
  "volumes": [
    {
      "name": "postgres_data",
      "host": {
        "sourcePath": "/var/app/postgres_data"
      }
    }
  ]
}
```

### 4. Deploy

```bash
# Create environment and deploy
eb create recipe-app-prod --instance-type t3.small

# This will:
# - Create an EC2 instance
# - Set up load balancer
# - Deploy your Docker containers
# - Provide a public URL

# Check status
eb status

# View logs
eb logs

# Open in browser
eb open
```

### 5. Update Environment Variables

```bash
# Set environment variables
eb setenv \
  ANTHROPIC_API_KEY=sk-ant-api03-YOUR_KEY_HERE \
  JWT_SECRET=your-random-32-char-secret \
  DB_PASSWORD=YourSecurePassword123!

# Deploy updates
eb deploy
```

## Pros and Cons

### Elastic Beanstalk Pros:
- ✅ Auto-scaling
- ✅ Load balancing included
- ✅ Easy updates with `eb deploy`
- ✅ CloudWatch monitoring built-in
- ✅ Free tier eligible
- ✅ Easy SSL/HTTPS setup

### Elastic Beanstalk Cons:
- ❌ More complex than Lightsail
- ❌ Higher cost for production (~$15-30/month minimum)
- ❌ Docker Compose support is limited (better to use ECS)

## Monitoring

```bash
# View logs
eb logs

# SSH into instance
eb ssh

# Check health
eb health
```

## Cleanup

```bash
# Terminate environment (stops billing)
eb terminate recipe-app-prod
```

## Cost Estimate

- t3.small instance: ~$15/month
- Load balancer: ~$18/month
- **Total: ~$33/month**

For cheaper testing, use t3.micro (~$7.50/month) or AWS Lightsail instead.
