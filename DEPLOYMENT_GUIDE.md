# Deployment to Lightsail - Ready to Go! 🚀

## Current Status

✅ All changes committed to `develop` branch
✅ DevOps cleanup complete
✅ New CI/CD pipeline ready
⏳ Waiting for push to GitHub to trigger deployment

## Next Steps

### 1. Push to GitHub

You need to push the develop branch to trigger the automated deployment:

```bash
git push -u origin develop
```

**If you get authentication errors:**

- Option A: Use GitHub CLI (recommended):
  ```bash
  gh auth login
  git push -u origin develop
  ```

- Option B: Use a Personal Access Token:
  1. Go to GitHub.com → Settings → Developer settings → Personal access tokens → Tokens (classic)
  2. Generate new token with `repo` scope
  3. Use token as password when pushing

- Option C: Use SSH (if you have SSH keys set up):
  ```bash
  git remote set-url origin git@github.com:ryanvt2005/Recipes.git
  git push -u origin develop
  ```

### 2. Monitor Deployment

Once pushed, the GitHub Actions workflow will automatically:

1. **Code Quality Checks** (~2 min)
   - ESLint checks on backend and frontend
   - Prettier formatting checks

2. **Run Tests** (~2 min)
   - Backend tests with PostgreSQL
   - Generate coverage report

3. **Build Docker Images** (~3-5 min)
   - Build optimized backend image
   - Build optimized frontend image

4. **Deploy to Lightsail** (~2-3 min)
   - SSH into Lightsail instance
   - Pull latest code
   - Rebuild and restart containers
   - Run database migrations
   - Health check verification

**Total deployment time: ~10-12 minutes**

### 3. Watch the Deployment

View progress in real-time:

1. Go to: https://github.com/ryanvt2005/Recipes/actions
2. Click on the latest workflow run
3. Watch each job complete

### 4. Access Your Live Site

Once deployment completes successfully, your app will be live at:

- **Frontend**: http://YOUR_LIGHTSAIL_IP:3001
- **Backend API**: http://YOUR_LIGHTSAIL_IP:3000
- **Health Check**: http://YOUR_LIGHTSAIL_IP:3000/health

Replace `YOUR_LIGHTSAIL_IP` with your actual Lightsail IP address (check GitHub secrets or AWS console).

## What the New CI/CD Pipeline Does

### Quality Gates
- ✅ Lints all code (backend & frontend)
- ✅ Checks code formatting
- ✅ Runs automated tests
- ✅ Builds Docker images to verify builds work

### Deployment
- ✅ Only deploys if all quality checks pass
- ✅ Automatically updates code on Lightsail
- ✅ Rebuilds containers with new code
- ✅ Runs database migrations
- ✅ Verifies deployment with health checks

### Safety
- ⚠️ Deployment only runs on `develop` branch
- ⚠️ All secrets managed via GitHub Secrets
- ⚠️ Failed quality checks block deployment

## Troubleshooting

### If deployment fails:

1. **Check the logs in GitHub Actions**:
   - Go to Actions tab
   - Click on the failed workflow
   - Expand the failed step to see error details

2. **Common issues**:
   - **Quality checks fail**: Fix linting/formatting errors locally, commit, and push again
   - **Test failures**: Check test logs and fix failing tests
   - **Build failures**: Check Dockerfile syntax and dependencies
   - **Deployment failures**: Verify GitHub secrets are set correctly
   - **Health check fails**: Check backend logs on Lightsail

3. **Manual verification**:
   ```bash
   # SSH into Lightsail (if you have access)
   ssh -i /path/to/key.pem ec2-user@YOUR_LIGHTSAIL_IP

   # Check container status
   cd ~/Recipes
   docker-compose ps

   # Check logs
   docker-compose logs backend
   docker-compose logs frontend
   ```

## Required GitHub Secrets

Make sure these secrets are set in your repository:
- `LIGHTSAIL_SSH_KEY` - SSH private key for Lightsail
- `LIGHTSAIL_IP` - Public IP of your Lightsail instance
- `ANTHROPIC_API_KEY` - Your Anthropic API key
- `JWT_SECRET` - JWT signing secret (min 32 chars)
- `DB_PASSWORD` - Database password

**To check/add secrets**:
1. Go to: https://github.com/ryanvt2005/Recipes/settings/secrets/actions
2. Verify all required secrets are present

## What Happens After Deployment

Your application will be running with:
- ✅ Optimized Docker builds (faster, smaller images)
- ✅ Security hardening (non-root users, health checks)
- ✅ Clean, linted codebase
- ✅ Automated deployment pipeline
- ✅ Proper environment configuration

## Future Deployments

From now on, deploying is easy:

```bash
# Make your changes
git add .
git commit -m "Your changes"
git push origin develop

# That's it! Deployment happens automatically
```

The CI/CD pipeline will:
1. Check code quality ✅
2. Run tests ✅
3. Build images ✅
4. Deploy to Lightsail ✅
5. Verify with health checks ✅

---

**Ready to deploy?** Run: `git push -u origin develop` 🚀
