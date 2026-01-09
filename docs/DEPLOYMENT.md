# Deployment Guide

This guide covers deploying the Recipe Management Application to various environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Development](#local-development)
- [Development Environment (Lightsail)](#development-environment-lightsail)
- [Production Deployment](#production-deployment)

## Prerequisites

- Docker and Docker Compose installed
- Node.js 20+ (for local development)
- PostgreSQL 15+ (if running without Docker)
- Git

## Local Development

### Quick Start

1. Clone the repository:
```bash
git clone <repository-url>
cd Recipes
```

2. Copy environment file:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Start development environment:
```bash
./start-dev.sh
# Or on Windows:
start-dev.bat
```

4. Access the application:
- Frontend: http://localhost:3001
- Backend API: http://localhost:3000
- Health check: http://localhost:3000/health

### Development with Docker Compose

Use the development compose file for hot-reloading:

```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

### Running Migrations

```bash
docker-compose exec backend npm run migrate
```

## Development Environment (Lightsail)

Deployments to the development environment are automated via GitHub Actions when pushing to the `develop` branch.

### Manual Deployment

If you need to deploy manually:

```bash
# SSH into your Lightsail instance
ssh -i /path/to/key.pem ec2-user@<lightsail-ip>

# Navigate to repository
cd ~/Recipes

# Pull latest changes
git pull origin develop

# Update environment variables
nano .env

# Restart services
docker-compose down
docker-compose up -d --build

# Run migrations
docker-compose exec -T backend npm run migrate
```

### GitHub Actions Deployment

The CI/CD pipeline automatically:
1. Runs code quality checks (linting, formatting)
2. Runs tests
3. Builds Docker images
4. Deploys to Lightsail
5. Runs health checks

Required GitHub Secrets:
- `LIGHTSAIL_SSH_KEY` - SSH private key for Lightsail instance
- `LIGHTSAIL_IP` - Public IP of Lightsail instance
- `ANTHROPIC_API_KEY` - Anthropic API key
- `JWT_SECRET` - JWT signing secret
- `DB_PASSWORD` - Database password

## Production Deployment

Production deployment options will be configured based on your infrastructure choice:

- AWS ECS Fargate
- AWS Elastic Beanstalk
- DigitalOcean App Platform
- Other container orchestration platforms

### Environment Variables for Production

Ensure these are set in your production environment:

```bash
DB_HOST=<production-db-host>
DB_PORT=5432
DB_NAME=recipeapp
DB_USER=recipeuser
DB_PASSWORD=<strong-password>
JWT_SECRET=<strong-secret-min-32-chars>
ANTHROPIC_API_KEY=<your-api-key>
NODE_ENV=production
FRONTEND_URL=<your-production-url>
LOG_LEVEL=warn
```

## Troubleshooting

### Container won't start

Check logs:
```bash
docker-compose logs backend
docker-compose logs db
```

### Database connection issues

Verify database is healthy:
```bash
docker-compose ps
```

Ensure backend can reach database:
```bash
docker-compose exec backend ping db
```

### Migration failures

Check if migrations already ran:
```bash
docker-compose exec backend npm run migrate
```

## Health Checks

- Backend health: `http://<host>:3000/health`
- Database connection is verified on startup
- Docker health checks configured for production

## Backup and Restore

### Backup Database

```bash
docker-compose exec db pg_dump -U recipeuser recipeapp > backup.sql
```

### Restore Database

```bash
cat backup.sql | docker-compose exec -T db psql -U recipeuser recipeapp
```

## Monitoring

Consider setting up:
- Application logging (Winston is configured)
- Database monitoring
- Container health monitoring
- API uptime monitoring
