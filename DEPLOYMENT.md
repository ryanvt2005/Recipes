# Deployment Guide

This document explains the CI/CD workflow for the Recipe Management App.

## Overview

The deployment process is designed to be simple and reliable:

1. **Development & Testing** - Work on feature branches locally
2. **Integration Testing** - Merge to `develop` for integration testing (no deployment)
3. **Production Deployment** - Merge to `main` triggers automated deployment to Lightsail

## Workflow Structure

```
feature/your-feature
  ↓
develop (tests & linting only)
  ↓
main (tests + automated deployment to Lightsail)
```

## Branch Strategy

### Feature Branches
- Create from: `develop`
- Naming: `feature/your-feature-name`
- Purpose: Individual feature development
- CI/CD: Runs linting and tests only

### Develop Branch
- Purpose: Integration testing
- CI/CD: Runs linting and tests only
- **Does NOT deploy** to any environment

### Main Branch
- Purpose: Production-ready code
- CI/CD: Runs linting, tests, **and deploys to Lightsail**
- Protected branch (requires PR approval recommended)

## Local Development Workflow

### 1. Start a New Feature

```bash
# Ensure you're on develop and up to date
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/your-feature-name
```

### 2. Develop Locally

```bash
# Make your changes
# Test locally using Docker Compose
docker-compose up

# Or use the local deployment script
./scripts/deploy-local.sh
```

### 3. Test Your Changes

Before committing, ensure everything works:

```bash
# Run linting
cd backend && npm run lint
cd ../frontend && npm run lint

# Run formatting
cd backend && npm run format
cd ../frontend && npm run format

# Run tests
cd backend && npm test
```

### 4. Commit and Push

```bash
# Add your changes
git add .

# Commit with clear message
git commit -m "Add your feature description"

# Push to GitHub
git push origin feature/your-feature-name
```

This will trigger CI checks (linting + tests) but **won't deploy**.

### 5. Merge to Develop

```bash
# Create PR to develop branch
gh pr create --base develop --title "Your Feature Title"

# Or merge directly if working solo
git checkout develop
git merge feature/your-feature-name
git push origin develop
```

This will run CI checks again but **still won't deploy**.

### 6. Deploy to Production

When ready to deploy:

```bash
# Merge develop into main
git checkout main
git pull origin main
git merge develop

# Push to trigger deployment
git push origin main
```

**This triggers automatic deployment to Lightsail!**

## GitHub Actions Workflow

### On All Branches (feature/*, develop, main)

When you push to any branch:
1. ✅ Code checkout
2. ✅ Lint checks (ESLint)
3. ✅ Format checks (Prettier)
4. ✅ Unit tests
5. ✅ Test coverage report

### On Main Branch Only

When you push to `main`:
1. ✅ All the above checks
2. 🚀 **Automated deployment to Lightsail**:
   - Pull latest code on Lightsail
   - Build Docker images on Lightsail
   - Stop old containers
   - Start new containers
   - Run database migrations
   - Health checks

## Deployment Script

The local deployment script lets you test the full deployment locally before pushing to main.

### Usage

```bash
# Ensure you have a .env file
cp .env.example .env
# Edit .env with your secrets

# Run deployment
./scripts/deploy-local.sh
```

### What It Does

1. Loads environment variables from `.env`
2. Stops existing containers
3. Builds fresh Docker images
4. Starts database, backend, frontend
5. Runs migrations
6. Performs health checks
7. Shows you the URLs

### Expected Output

```
======================================
✅ Local Deployment Successful!
======================================

🌐 Application: http://localhost:3001
🔧 API: http://localhost:3000
```

## Environment Variables

### Required Secrets (GitHub)

These must be set in GitHub repository secrets:

- `ANTHROPIC_API_KEY` - Claude API key for recipe extraction
- `JWT_SECRET` - Secret key for JWT tokens
- `DB_PASSWORD` - PostgreSQL password

### Local Development (.env)

Create a `.env` file in the project root:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=recipeapp
DB_USER=recipeuser
DB_PASSWORD=your_secure_password

# Authentication
JWT_SECRET=your_jwt_secret_key

# External APIs
ANTHROPIC_API_KEY=your_anthropic_api_key

# Application
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3001
VITE_API_URL=http://localhost:3000
```

## Troubleshooting

### Deployment Fails on Main

**Check the GitHub Actions logs:**
1. Go to https://github.com/YOUR_USERNAME/Recipes/actions
2. Click on the failed workflow
3. Review the error messages

**Common issues:**
- Database migration failures → Check migration SQL syntax
- Docker build errors → Test build locally first
- Health check failures → Check container logs on Lightsail
- Out of memory → Lightsail instance may need restart

### Self-Hosted Runner Offline

If deployment gets stuck waiting for runner:

```bash
# SSH into Lightsail
ssh ubuntu@100.25.44.113

# Check runner status
sudo ~/actions-runner/svc.sh status

# Restart if needed
bash /tmp/restart-runner.sh
```

Or restart the Lightsail instance via AWS Console.

### Local Deployment Issues

**Build fails:**
```bash
# Check Docker is running
docker ps

# Clean up and retry
docker system prune -a
./scripts/deploy-local.sh
```

**Database connection errors:**
```bash
# Check database is running
docker logs recipe-app-db

# Restart database
docker restart recipe-app-db
```

**Frontend not loading:**
```bash
# Check frontend logs
docker logs recipe-app-frontend

# Rebuild frontend
docker build -t recipe-app-frontend:latest ./frontend
docker restart recipe-app-frontend
```

## Rollback Procedure

If a deployment breaks production:

### Option 1: Revert the Commit

```bash
# On main branch
git revert HEAD
git push origin main
```

This triggers a new deployment with the previous code.

### Option 2: Manual Rollback on Lightsail

```bash
# SSH into Lightsail
ssh ubuntu@100.25.44.113

# Go to app directory
cd ~/Recipes

# Checkout previous commit
git log --oneline -10  # Find the commit hash
git checkout <previous-commit-hash>

# Rebuild and restart
docker-compose down
docker-compose up -d --build
```

## Best Practices

### Before Merging to Main

1. ✅ Test locally using `./scripts/deploy-local.sh`
2. ✅ Ensure all tests pass
3. ✅ Run linting and formatting
4. ✅ Test the feature in develop branch
5. ✅ Review the diff: `git diff main`

### Commit Messages

Use clear, descriptive commit messages:

```bash
# Good
git commit -m "Add recipe notes feature with CRUD operations"
git commit -m "Fix memory leak in recipe extraction service"
git commit -m "Update frontend Dockerfile to optimize build performance"

# Bad
git commit -m "fix stuff"
git commit -m "updates"
git commit -m "wip"
```

### Pull Requests

When creating PRs:
- Include description of what changed
- Link to any related issues
- Test locally before submitting
- Request review if working with a team

## Monitoring

### Check Deployment Status

```bash
# View recent deployments
gh run list --branch main

# View specific deployment
gh run view <run-id>
```

### Check Application Health

```bash
# Backend health
curl http://100.25.44.113:3000/health

# Frontend
curl http://100.25.44.113:3001
```

### View Logs

```bash
# SSH into Lightsail
ssh ubuntu@100.25.44.113

# View backend logs
docker logs -f recipe-app-backend

# View frontend logs
docker logs -f recipe-app-frontend

# View database logs
docker logs -f recipe-app-db
```

## Quick Reference

| Task | Command |
|------|---------|
| Start new feature | `git checkout -b feature/name` |
| Test locally | `./scripts/deploy-local.sh` |
| Run linting | `npm run lint` (in backend/frontend) |
| Run formatting | `npm run format` |
| Run tests | `npm test` (in backend) |
| Push to develop | `git push origin develop` |
| Deploy to production | `git push origin main` |
| View deployments | `gh run list --branch main` |
| Restart runner | `bash /tmp/restart-runner.sh` |
| View app logs | `docker logs -f recipe-app-backend` |

## Architecture Diagram

```
┌─────────────────┐
│  Developer      │
│  Local Machine  │
└────────┬────────┘
         │
         │ git push
         ▼
┌─────────────────┐
│  GitHub         │
│  - Code Storage │
│  - CI/CD        │
└────────┬────────┘
         │
         │ on push to main
         ▼
┌─────────────────────────┐
│  GitHub Actions         │
│  (Self-Hosted Runner)   │
│  - Runs on Lightsail    │
│  - Linting & Tests      │
│  - Build Images         │
│  - Deploy Containers    │
└────────┬────────────────┘
         │
         ▼
┌──────────────────────────┐
│  AWS Lightsail           │
│  ┌────────────────────┐  │
│  │  Docker Containers │  │
│  │  - Frontend (Nginx)│  │
│  │  - Backend (Node)  │  │
│  │  - Database (PG)   │  │
│  └────────────────────┘  │
│  100.25.44.113          │
└─────────────────────────┘
```

## Next Steps

1. Set up branch protection rules for `main`
2. Configure PR templates
3. Add integration tests
4. Set up monitoring/alerting
5. Configure backup strategy for database
