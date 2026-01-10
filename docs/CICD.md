# CI/CD Pipeline Documentation

This document describes the automated CI/CD pipeline for the Recipe Management Application.

## Overview

The application uses a single, unified GitHub Actions workflow ([.github/workflows/main.yml](../.github/workflows/main.yml)) that handles:

- **Code Quality Checks** - Linting and formatting validation
- **Automated Testing** - Backend test suite with PostgreSQL
- **Docker Image Building** - Build and push to GitHub Container Registry
- **Automated Deployment** - Deploy to development environment on Lightsail
- **Health Checks** - Verify deployment success

## Workflow Structure

### 1. Code Quality (`lint` job)

**Triggers on:** All branches (push, pull requests)

**What it does:**
- Checks out code
- Installs frontend and backend dependencies
- Runs ESLint on both frontend and backend
- Validates code formatting with Prettier

**Why it's important:** Ensures code quality and consistency before tests run.

### 2. Automated Testing (`test` job)

**Triggers on:** All branches (after lint passes)

**What it does:**
- Spins up a PostgreSQL test database
- Installs backend dependencies
- Runs Jest test suite
- Uploads coverage reports to Codecov (optional)

**Environment:**
- PostgreSQL 15 in GitHub Actions services
- Test database: `recipeapp_test`
- Node.js 20

**Why it's important:** Catches bugs before they reach production.

### 3. Build Docker Images (`build` job)

**Triggers on:** Only `main` and `develop` branches (after lint and test pass)

**What it does:**
- Builds Docker images for frontend and backend
- Pushes images to GitHub Container Registry (ghcr.io)
- Tags images with branch name and commit SHA
- Uses layer caching for faster builds

**Image locations:**
- Backend: `ghcr.io/ryanvt2005/recipes/backend`
- Frontend: `ghcr.io/ryanvt2005/recipes/frontend`

**Tags:**
- `develop` - Latest develop branch build
- `main` or `latest` - Latest production build
- `develop-abc123` - Specific commit on develop
- `main-abc123` - Specific commit on main

### 4. Deploy to Development (`deploy-development` job)

**Triggers on:**
- Push to `develop` branch (after build)
- Manual workflow dispatch with "development" environment selected

**What it does:**
1. Connects to AWS Lightsail instance via SSH
2. Pulls latest code from `develop` branch
3. Updates `.env` with production secrets
4. Stops existing containers
5. Builds fresh Docker images
6. Starts services with `docker compose`
7. Runs database migrations
8. Performs health checks

**Deployment URL:** http://[LIGHTSAIL_IP]:3000 (API) and http://[LIGHTSAIL_IP]:3001 (Frontend)

**Concurrency:** Only one deployment at a time (prevents conflicts)

### 5. Deploy to Production (`deploy-production` job)

**Triggers on:**
- Push to `main` branch (after build)
- Manual workflow dispatch with "production" environment selected

**Status:** Placeholder - not yet configured

**Next steps:** Configure production infrastructure (AWS ECS, K8s, etc.)

## Required GitHub Secrets

Configure these secrets in your repository settings (`Settings > Secrets and variables > Actions`):

### Required for Deployment
- `LIGHTSAIL_SSH_KEY` - Private SSH key for Lightsail instance
- `LIGHTSAIL_IP` - Public IP address of Lightsail instance
- `DB_PASSWORD` - PostgreSQL database password
- `JWT_SECRET` - Secret key for JWT token signing (32+ characters)
- `ANTHROPIC_API_KEY` - API key for Claude AI recipe extraction

### Optional
- `CODECOV_TOKEN` - Token for uploading test coverage (optional)
- `PROD_API_URL` - Production API URL for frontend builds
- `DEV_API_URL` - Development API URL for frontend builds

## Branch Strategy

### Feature Branches (`feature/*`)
- **CI runs:** ✅ Lint + Test
- **Deployment:** ❌ No deployment
- **Purpose:** Development and testing

**Workflow:**
1. Create feature branch from `develop`
2. Push commits → CI runs automatically
3. Create PR to `develop` → CI runs on PR
4. Merge to `develop` after approval

### Develop Branch (`develop`)
- **CI runs:** ✅ Lint + Test + Build + Deploy
- **Deployment:** ✅ Automatic to development environment
- **Purpose:** Integration testing

**Workflow:**
1. Merge feature branches
2. Automatic deployment to Lightsail
3. Test in development environment
4. Create PR to `main` when stable

### Main Branch (`main`)
- **CI runs:** ✅ Lint + Test + Build
- **Deployment:** 🚧 Manual (production placeholder)
- **Purpose:** Production releases

**Workflow:**
1. Merge from `develop` after thorough testing
2. Manual production deployment (when configured)
3. Tagged releases recommended

## Manual Workflows

### Manual Deployment

You can manually trigger deployments via GitHub Actions UI:

1. Go to **Actions** tab
2. Select **CI/CD Pipeline** workflow
3. Click **Run workflow**
4. Choose branch and environment:
   - `none` - Run CI only (no deployment)
   - `development` - Deploy to development
   - `production` - Deploy to production (when configured)

### Emergency Rollback

If a deployment fails:

1. **SSH to Lightsail:**
   ```bash
   ssh -i ~/.ssh/lightsail_key ec2-user@[LIGHTSAIL_IP]
   cd ~/Recipes
   ```

2. **Check container status:**
   ```bash
   docker compose ps
   docker compose logs backend
   docker compose logs frontend
   ```

3. **Rollback to previous commit:**
   ```bash
   git log --oneline -5  # Find previous working commit
   git checkout [previous-commit-hash]
   docker compose down
   docker compose up -d --build
   ```

4. **Or restore from previous Docker images:**
   ```bash
   docker compose down
   docker compose pull  # Pull last successfully built images
   docker compose up -d
   ```

## Health Checks

The workflow performs automated health checks after deployment:

### Backend Health Check
- **Endpoint:** `http://[LIGHTSAIL_IP]:3000/health`
- **Retries:** 12 attempts (60 seconds total)
- **Success criteria:** HTTP 200 response

### Frontend Check
- **Endpoint:** `http://[LIGHTSAIL_IP]:3001`
- **Check:** Verifies frontend is accessible
- **Note:** May show warning if still starting up (non-blocking)

## Troubleshooting

### Common Issues

#### 1. Lint Failures
**Error:** ESLint or Prettier errors
**Fix:**
```bash
# Backend
cd backend
npm run lint:fix
npm run format

# Frontend
cd frontend
npm run lint:fix
npm run format
```

#### 2. Test Failures
**Error:** Jest tests fail in CI
**Fix:**
- Run tests locally: `cd backend && npm test`
- Ensure database environment variables are correct
- Check for hardcoded values (ports, hostnames)

#### 3. Build Failures
**Error:** Docker build fails
**Fix:**
- Check Dockerfile syntax
- Verify all dependencies are in package.json
- Check for missing build-time environment variables

#### 4. Deployment Failures
**Error:** SSH connection fails
**Solution:** Verify `LIGHTSAIL_SSH_KEY` secret is correct

**Error:** Health check fails
**Solution:**
- SSH to server and check logs: `docker compose logs`
- Verify environment variables are correct
- Check database migrations ran successfully

**Error:** Out of disk space
**Solution:**
```bash
ssh ec2-user@[LIGHTSAIL_IP]
docker system prune -af
docker volume prune -f
```

#### 5. Migration Failures
**Error:** Database migration fails
**Solution:**
```bash
# SSH to server
docker compose exec backend npm run migrate
# Check migration logs
docker compose logs backend | grep migration
```

## Performance Optimizations

### Docker Layer Caching
- Workflow uses GitHub Actions cache for Docker layers
- Significantly speeds up builds (can reduce build time by 50-70%)
- Cache key: `type=gha`

### Parallel Jobs
- Lint and test run independently
- Both must pass before build starts
- Saves ~2-3 minutes per workflow run

### Dependency Caching
- `npm ci` dependencies cached via `setup-node` action
- Cache key based on `package-lock.json` hash
- Speeds up dependency installation

## Monitoring

### GitHub Actions Dashboard
- View all workflow runs: **Actions** tab
- Filter by branch, status, or workflow
- Click any run to see detailed logs

### Deployment Status
- Check README badge for latest status
- Green badge = All checks passing
- Red badge = Failed checks

### Production Metrics (Future)
When production is configured, consider adding:
- Application Performance Monitoring (APM)
- Error tracking (Sentry, Rollbar)
- Uptime monitoring (Pingdom, UptimeRobot)
- Log aggregation (CloudWatch, DataDog)

## Security Best Practices

### Secrets Management
- ✅ Never commit secrets to repository
- ✅ Use GitHub Secrets for sensitive values
- ✅ Rotate secrets regularly (every 90 days)
- ✅ Use different secrets for dev/prod

### SSH Security
- ✅ Use SSH keys (not passwords)
- ✅ Restrict SSH key permissions (chmod 600)
- ✅ Use `ssh-keyscan` to prevent MITM attacks
- ✅ Consider using a bastion host for production

### Container Security
- ✅ Use official base images
- ✅ Run as non-root user
- ✅ Keep dependencies updated
- ✅ Scan images for vulnerabilities (future: add Trivy/Snyk)

## Future Enhancements

### Planned Improvements
- [ ] Add integration tests
- [ ] Add E2E tests with Playwright/Cypress
- [ ] Container vulnerability scanning
- [ ] Performance testing
- [ ] Automated database backups
- [ ] Blue-green deployments
- [ ] Canary deployments
- [ ] Production environment setup (AWS ECS/Fargate)
- [ ] CDN integration for frontend assets
- [ ] Monitoring and alerting setup

### Nice to Have
- [ ] Slack/Discord notifications
- [ ] Deployment approval gates for production
- [ ] Automatic PR comments with test results
- [ ] Performance regression detection
- [ ] Visual regression testing

## Getting Help

### Issues
- Check workflow logs in GitHub Actions
- Review this documentation
- Check container logs on server: `docker compose logs`

### Resources
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Documentation](https://docs.docker.com/)
- [AWS Lightsail Documentation](https://docs.aws.amazon.com/lightsail/)

## Changelog

### 2026-01-10 - Initial Release
- Created unified CI/CD workflow
- Configured lint, test, build, and deploy jobs
- Added development environment deployment
- Implemented health checks
- Archived old workflows
- Added CI/CD documentation
