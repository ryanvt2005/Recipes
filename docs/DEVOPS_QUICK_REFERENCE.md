# DevOps Quick Reference

Quick commands and procedures for common DevOps tasks.

## Table of Contents
- [Local Development](#local-development)
- [CI/CD Operations](#cicd-operations)
- [Server Management](#server-management)
- [Database Operations](#database-operations)
- [Troubleshooting](#troubleshooting)

---

## Local Development

### Start Development Environment
```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop all services
docker compose down

# Rebuild and restart
docker compose up -d --build
```

### Run Database Migrations
```bash
# Run migrations
docker compose exec backend npm run migrate

# Check migration status
docker compose exec -T db psql -U recipeuser -d recipeapp -c "\dt"
```

### Code Quality
```bash
# Lint backend
cd backend && npm run lint

# Fix linting issues
cd backend && npm run lint:fix

# Format code
cd backend && npm run format

# Lint frontend
cd frontend && npm run lint && npm run format
```

### Testing
```bash
# Run backend tests
cd backend && npm test

# Run tests in watch mode
cd backend && npm run test:watch

# Run tests with coverage
cd backend && npm test -- --coverage
```

---

## CI/CD Operations

### Trigger Manual Deployment
1. Go to [GitHub Actions](https://github.com/ryanvt2005/Recipes/actions)
2. Click **CI/CD Pipeline**
3. Click **Run workflow**
4. Select branch and environment
5. Click **Run workflow**

### View Workflow Status
```bash
# Using GitHub CLI
gh run list --workflow=main.yml

# View latest run
gh run view

# Watch a run in real-time
gh run watch
```

### Check Deployment Status
```bash
# Check health endpoints
curl http://[LIGHTSAIL_IP]:3000/health
curl http://[LIGHTSAIL_IP]:3001

# SSH to server and check containers
ssh -i ~/.ssh/lightsail_key ec2-user@[LIGHTSAIL_IP]
docker compose ps
```

---

## Server Management

### SSH to Lightsail
```bash
ssh -i ~/.ssh/lightsail_key ec2-user@[LIGHTSAIL_IP]
```

### Check Container Status
```bash
# View running containers
docker compose ps

# View container resource usage
docker stats

# View logs
docker compose logs backend --tail 100
docker compose logs frontend --tail 100
docker compose logs db --tail 100

# Follow logs in real-time
docker compose logs -f backend
```

### Restart Services
```bash
# Restart a specific service
docker compose restart backend

# Restart all services
docker compose restart

# Stop and remove containers
docker compose down

# Start fresh (rebuild)
docker compose up -d --build
```

### System Maintenance
```bash
# Check disk space
df -h

# Clean up Docker resources
docker system prune -af
docker volume prune -f

# View Docker disk usage
docker system df

# Remove old images (keep last 24h)
docker image prune -af --filter "until=24h"
```

### Update Application Code
```bash
# Pull latest code
cd ~/Recipes
git fetch origin
git pull origin develop

# Rebuild and restart
docker compose down
docker compose up -d --build

# Run migrations
docker compose exec backend npm run migrate
```

---

## Database Operations

### Access Database
```bash
# Connect to database
docker compose exec db psql -U recipeuser -d recipeapp

# Run single query
docker compose exec -T db psql -U recipeuser -d recipeapp -c "SELECT COUNT(*) FROM recipes;"
```

### Backup Database
```bash
# Create backup
docker compose exec -T db pg_dump -U recipeuser recipeapp > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
cat backup_YYYYMMDD_HHMMSS.sql | docker compose exec -T db psql -U recipeuser -d recipeapp
```

### Common Queries
```bash
# Count recipes
docker compose exec -T db psql -U recipeuser -d recipeapp -c "SELECT COUNT(*) FROM recipes;"

# List tables
docker compose exec -T db psql -U recipeuser -d recipeapp -c "\dt"

# View recent recipes
docker compose exec -T db psql -U recipeuser -d recipeapp -c "SELECT id, title, created_at FROM recipes ORDER BY created_at DESC LIMIT 10;"

# Check database size
docker compose exec -T db psql -U recipeuser -d recipeapp -c "SELECT pg_size_pretty(pg_database_size('recipeapp'));"
```

### Run Migrations Manually
```bash
# From local machine
docker compose exec backend npm run migrate

# From server
ssh ec2-user@[LIGHTSAIL_IP]
cd ~/Recipes
docker compose exec backend npm run migrate
```

---

## Troubleshooting

### Application Won't Start

**Check logs:**
```bash
docker compose logs backend
docker compose logs frontend
docker compose logs db
```

**Common issues:**
- Database not ready → Wait 10-15 seconds and restart
- Port already in use → Stop other services or change ports
- Environment variables missing → Check `.env` file

### Database Connection Issues

**Verify database is running:**
```bash
docker compose ps db
docker compose exec db pg_isready -U recipeuser
```

**Test connection:**
```bash
docker compose exec backend node -e "
const { Pool } = require('pg');
const pool = new Pool({
  host: 'db',
  port: 5432,
  database: 'recipeapp',
  user: 'recipeuser',
  password: process.env.DB_PASSWORD
});
pool.query('SELECT NOW()').then(r => console.log('✅', r.rows[0])).catch(e => console.error('❌', e.message));
"
```

### Health Check Failures

**Check backend health:**
```bash
curl -v http://localhost:3000/health
```

**Check frontend:**
```bash
curl -v http://localhost:3001
```

**Verify environment variables:**
```bash
docker compose exec backend printenv | grep -E "DB_|JWT_|ANTHROPIC"
```

### Deployment Failed

**1. Check workflow logs:**
- Go to GitHub Actions
- Click failed workflow run
- Review error messages

**2. SSH to server:**
```bash
ssh ec2-user@[LIGHTSAIL_IP]
cd ~/Recipes
git status
docker compose ps
docker compose logs
```

**3. Manual deployment:**
```bash
# On server
cd ~/Recipes
git pull origin develop
docker compose down
docker compose up -d --build
docker compose exec backend npm run migrate
```

### Out of Disk Space

**Check disk usage:**
```bash
df -h
du -sh ~/Recipes/*
docker system df
```

**Clean up:**
```bash
# Remove unused Docker resources
docker system prune -af
docker volume prune -f

# Remove old log files
find ~/Recipes -name "*.log" -type f -mtime +7 -delete

# Remove old backups
find ~/Recipes -name "backup_*.sql" -type f -mtime +30 -delete
```

### Port Conflicts

**Find what's using a port:**
```bash
# Check what's on port 3000
sudo lsof -i :3000

# Or using netstat
sudo netstat -tulpn | grep :3000

# Kill process on port
sudo kill -9 [PID]
```

### Migration Failures

**Check migration history:**
```bash
docker compose exec -T db psql -U recipeuser -d recipeapp -c "SELECT * FROM schema_migrations ORDER BY version DESC;"
```

**Manually run specific migration:**
```bash
# Edit and run a specific migration file
docker compose exec backend node -e "
const pool = require('./src/config/database');
const fs = require('fs');
const sql = fs.readFileSync('./src/config/migrations/XXX_migration_name.sql', 'utf8');
pool.query(sql).then(() => console.log('✅ Done')).catch(e => console.error('❌', e));
"
```

### Container Keeps Restarting

**Check container logs:**
```bash
docker compose logs backend --tail 100
```

**Check container exit code:**
```bash
docker compose ps
```

**Common causes:**
- Application crashes on startup
- Missing environment variables
- Database not accessible
- Port binding issues

**Debug interactively:**
```bash
# Start container with shell
docker compose run --rm backend sh

# Or attach to running container
docker compose exec backend sh
```

---

## Emergency Procedures

### Complete System Reset

**⚠️ Warning: This will delete all data**

```bash
# Stop everything
docker compose down -v

# Remove all containers, images, volumes
docker system prune -af
docker volume prune -f

# Fresh start
docker compose up -d --build
docker compose exec backend npm run migrate

# Create test user (if needed)
# Access app and register
```

### Rollback Deployment

**Option 1: Git rollback**
```bash
ssh ec2-user@[LIGHTSAIL_IP]
cd ~/Recipes
git log --oneline -10  # Find last good commit
git checkout [commit-hash]
docker compose down
docker compose up -d --build
```

**Option 2: Database rollback**
```bash
# Restore from backup
cat backup_YYYYMMDD_HHMMSS.sql | docker compose exec -T db psql -U recipeuser -d recipeapp
docker compose restart
```

### Force Redeploy

**From GitHub Actions:**
1. Go to Actions tab
2. Click "CI/CD Pipeline"
3. Click "Re-run all jobs"

**From server:**
```bash
ssh ec2-user@[LIGHTSAIL_IP]
cd ~/Recipes
git pull --force origin develop
docker compose down
docker compose up -d --build --force-recreate
docker compose exec backend npm run migrate
```

---

## Useful Aliases

Add these to your `~/.bashrc` or `~/.zshrc`:

```bash
# Docker Compose shortcuts
alias dc='docker compose'
alias dcp='docker compose ps'
alias dcl='docker compose logs'
alias dclf='docker compose logs -f'
alias dcr='docker compose restart'
alias dcd='docker compose down'
alias dcu='docker compose up -d'
alias dcb='docker compose up -d --build'

# SSH to server
alias ssh-recipe='ssh -i ~/.ssh/lightsail_key ec2-user@[LIGHTSAIL_IP]'

# Database shortcuts
alias recipe-db='docker compose exec -T db psql -U recipeuser -d recipeapp'
alias recipe-migrate='docker compose exec backend npm run migrate'

# Logs
alias logs-backend='docker compose logs -f backend'
alias logs-frontend='docker compose logs -f frontend'
alias logs-db='docker compose logs -f db'
```

---

## Monitoring Commands

### Real-time Monitoring
```bash
# Watch container status
watch -n 2 'docker compose ps'

# Watch resource usage
docker stats

# Watch logs
docker compose logs -f --tail 50

# Watch specific service
docker compose logs -f backend --tail 100
```

### Health Status Dashboard
```bash
#!/bin/bash
# Save as check-health.sh

echo "=== Application Health Status ==="
echo ""
echo "Backend Health:"
curl -s http://localhost:3000/health | jq '.' 2>/dev/null || echo "❌ Backend unavailable"
echo ""
echo "Frontend Status:"
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001
echo ""
echo "Database Status:"
docker compose exec -T db pg_isready -U recipeuser
echo ""
echo "Container Status:"
docker compose ps
```

---

**Last Updated:** 2026-01-10
**Maintainer:** DevOps Team
