# CI/CD Process

## Overview

The Recipe Management App uses a modern CI/CD pipeline that ensures code quality and automatic deployments.

## Workflow Stages

### 1. Code Quality (2-3 min)
**Runs on:** Every push and pull request

**Checks:**
- ESLint linting (backend & frontend)
- Code formatting compliance
- Build compilation

**Purpose:** Catch errors before they reach production

### 2. Automated Tests (2-3 min)
**Runs on:** Every push and pull request

**Checks:**
- Backend unit tests with PostgreSQL
- Code coverage reporting
- Integration tests

**Purpose:** Ensure functionality works as expected

### 3. Docker Image Build (3-5 min)
**Runs on:** Push to `main` or `develop` branches

**Actions:**
- Builds optimized Docker images
- Uses layer caching for speed
- Creates multi-stage production builds

**Purpose:** Prepare deployable artifacts

### 4. Deployment to Development (2-3 min)
**Runs on:** Push to `develop` branch

**Process:**
1. SSH into Lightsail instance
2. Pull latest code from `develop` branch
3. Reset to exact commit from GitHub (`git reset --hard`)
4. Rebuild Docker images from source (`--no-cache`)
5. Restart all containers
6. Run database migrations
7. Health check verification

**Purpose:** Deploy latest code to live development environment

### 5. Deployment to Production (Manual)
**Runs on:** Push to `main` branch (when ready)

**Currently:** Placeholder for production deployment
**Future:** ECS, Elastic Beanstalk, or other production platform

## Branch Strategy

### `develop` Branch
- **Purpose:** Development and testing
- **Auto-deploys to:** Lightsail development environment
- **URL:** http://100.27.46.252:3001
- **Requirements:** All quality checks must pass

### `main` Branch
- **Purpose:** Production-ready code
- **Auto-deploys to:** Not configured yet
- **Requirements:** Code review + all checks passing

### Feature Branches
- **Purpose:** Individual features or fixes
- **Auto-deploys to:** None (only runs quality checks)
- **Merge to:** `develop` via pull request

## Ensuring Code Sync

### The Problem We Solved
Previously, Lightsail would use cached Docker images, meaning:
- Code changes weren't always deployed
- Frontend might have old code
- Backend API could be out of sync

### The Solution
Our CI/CD workflow now:

1. **Hard resets to exact commit:**
   ```bash
   git reset --hard origin/develop
   ```

2. **Forces fresh builds:**
   ```bash
   docker-compose build --no-cache
   ```

3. **Logs deployed commit:**
   ```bash
   echo "📊 Deploying commit: $(git log -1 --oneline)"
   ```

### Verification
After deployment, check:
- GitHub Actions log shows the deployed commit hash
- Lightsail shows matching commit in git log
- Features match what's in the code

## Deployment Guarantees

✅ **What's deployed matches git exactly**
- Uses `git reset --hard origin/develop`
- No local modifications allowed
- Commit hash is logged

✅ **Code is always rebuilt from source**
- `--no-cache` flag forces fresh build
- No stale Docker layers
- All dependencies reinstalled

✅ **Database stays in sync**
- Migrations run automatically
- Idempotent (safe to re-run)
- Errors don't block deployment

✅ **Environment variables are correct**
- Generated fresh on each deploy
- Uses GitHub Secrets
- Includes correct IP addresses

## Manual Deployment

If you need to deploy manually:

```bash
# SSH into Lightsail
ssh -i ~/.ssh/lightsail_key ec2-user@100.27.46.252

# Navigate to repository
cd ~/Recipes

# Pull latest code
git fetch origin
git checkout develop
git reset --hard origin/develop

# View what's being deployed
git log -1 --oneline

# Update environment (if needed)
nano .env

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Run migrations
docker-compose exec -T backend npm run migrate

# Check status
docker-compose ps
docker-compose logs backend --tail=50
```

## Troubleshooting

### Deployment fails with "old code"

**Problem:** Lightsail has cached Docker images

**Solution:**
```bash
docker-compose build --no-cache
```

### API endpoints return 404

**Problem:** Backend code hasn't been rebuilt

**Solution:**
1. Check git commit on Lightsail: `git log -1 --oneline`
2. Rebuild backend: `docker-compose build --no-cache backend`
3. Restart: `docker-compose up -d`

### Frontend shows old UI

**Problem:** Frontend Docker image wasn't rebuilt with new code

**Solution:**
```bash
docker-compose build --no-cache frontend
docker-compose up -d
```

### CORS errors

**Problem:** Frontend built with wrong API URL

**Solution:**
1. Check `.env` has `VITE_API_URL=http://100.27.46.252:3000`
2. Rebuild frontend: `docker-compose build --no-cache frontend`

## Best Practices

### Before Pushing Code

1. **Test locally:**
   ```bash
   cd backend && npm run lint && npm test
   cd ../frontend && npm run lint && npm run build
   ```

2. **Check Docker builds:**
   ```bash
   docker-compose build
   docker-compose up
   ```

3. **Commit with clear messages:**
   ```bash
   git commit -m "Add feature: shopping list consolidation"
   ```

### After Pushing Code

1. **Monitor GitHub Actions:**
   - Go to https://github.com/ryanvt2005/Recipes/actions
   - Watch workflow complete
   - Check for failures

2. **Verify deployment:**
   - Wait for "Deploy to Development" to complete
   - Check health: http://100.27.46.252:3000/health
   - Test feature in browser

3. **If deployment fails:**
   - Check GitHub Actions logs
   - SSH into Lightsail and check `docker-compose logs`
   - Manual deploy if needed

## Future Improvements

### Recommended Additions

1. **Automated rollback:**
   - Tag successful deployments
   - Quick revert on failure

2. **Staging environment:**
   - Separate from development
   - Final testing before production

3. **Blue-green deployments:**
   - Zero-downtime deployments
   - Run old and new versions simultaneously

4. **Health check gates:**
   - Don't complete deployment if health check fails
   - Automatic rollback on errors

5. **Deployment notifications:**
   - Slack/Discord notifications
   - Email on deployment success/failure

6. **Performance monitoring:**
   - Track deployment times
   - Monitor application performance

## Security Notes

- ✅ Secrets stored in GitHub Secrets (encrypted)
- ✅ SSH keys never committed to git
- ✅ Environment files generated on deployment
- ✅ Production uses strong passwords
- ⚠️  Consider using AWS Secrets Manager for production
- ⚠️  Enable branch protection on `main` branch

## Monitoring Deployments

### GitHub Actions Dashboard
https://github.com/ryanvt2005/Recipes/actions

### Check Current Deployment
```bash
ssh -i ~/.ssh/lightsail_key ec2-user@100.27.46.252 \
  'cd ~/Recipes && git log -1 --oneline && docker-compose ps'
```

### View Logs
```bash
# Backend logs
ssh -i ~/.ssh/lightsail_key ec2-user@100.27.46.252 \
  'cd ~/Recipes && docker-compose logs backend --tail=100'

# Frontend logs
ssh -i ~/.ssh/lightsail_key ec2-user@100.27.46.252 \
  'cd ~/Recipes && docker-compose logs frontend --tail=100'
```

## Summary

Your CI/CD pipeline now guarantees:
- ✅ Code on Lightsail matches git exactly
- ✅ Docker images are always rebuilt from source
- ✅ No stale code or cached images
- ✅ Automated quality checks before deployment
- ✅ Health verification after deployment

Every push to `develop` triggers a full, clean deployment with the exact code from GitHub.
