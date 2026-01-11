# Self-Hosted GitHub Actions Runner Setup

This guide walks you through setting up a self-hosted GitHub Actions runner on your AWS Lightsail instance for automated deployments.

## Why Self-Hosted Runner?

- ✅ No firewall configuration needed
- ✅ Faster deployments (local execution)
- ✅ More secure (no external SSH access required)
- ✅ Direct access to Docker and application files
- ✅ Free for private repositories

## Prerequisites

- SSH access to your Lightsail instance
- GitHub repository admin access
- Docker installed on Lightsail instance

## Installation Steps

### Step 1: SSH to Your Lightsail Instance

```bash
ssh -i ~/.ssh/lightsail_key ec2-user@[LIGHTSAIL_IP]
```

### Step 2: Get Runner Token from GitHub

1. Go to your GitHub repository: https://github.com/ryanvt2005/Recipes
2. Click **Settings** → **Actions** → **Runners**
3. Click **New self-hosted runner**
4. Select **Linux** and **x64** architecture
5. Copy the commands shown (you'll use these in the next steps)

### Step 3: Download and Configure Runner

Run the commands from GitHub (they'll look similar to this):

```bash
# Create a folder for the runner
mkdir ~/actions-runner && cd ~/actions-runner

# Download the latest runner package
curl -o actions-runner-linux-x64-2.321.0.tar.gz -L \
  https://github.com/actions/runner/releases/download/v2.321.0/actions-runner-linux-x64-2.321.0.tar.gz

# Optional: Validate the hash (GitHub will show the expected hash)
echo "[HASH_FROM_GITHUB]  actions-runner-linux-x64-2.321.0.tar.gz" | shasum -a 256 -c

# Extract the installer
tar xzf ./actions-runner-linux-x64-2.321.0.tar.gz

# Configure the runner
./config.sh --url https://github.com/ryanvt2005/Recipes --token [YOUR_TOKEN_FROM_GITHUB]
```

**During configuration:**
- Runner group: Press Enter for default
- Runner name: Press Enter for default (hostname) or choose a name like `lightsail-dev`
- Work folder: Press Enter for default (`_work`)
- Labels: Add `development` as an additional label
- Run as service: **No** (we'll set this up in the next step)

### Step 4: Install as a System Service

This ensures the runner starts automatically on system boot:

```bash
# Install the service (requires sudo)
sudo ./svc.sh install

# Start the service
sudo ./svc.sh start

# Check status
sudo ./svc.sh status
```

### Step 5: Verify Runner is Connected

1. Go back to **Settings** → **Actions** → **Runners** in GitHub
2. You should see your runner listed with a green "Idle" status
3. The runner name will be your hostname or the custom name you chose

### Step 6: Test the Deployment

Now that the runner is set up, test the CI/CD pipeline:

```bash
# From your local machine
cd ~/projects/Recipes
git checkout develop
git pull origin develop

# Make a small change to trigger deployment
echo "# Test deployment" >> README.md
git add README.md
git commit -m "Test self-hosted runner deployment"
git push origin develop
```

Watch the deployment in GitHub Actions:
- Go to **Actions** tab in your repository
- Click on the latest workflow run
- Watch the "Deploy to Development" job execute on your self-hosted runner

## Managing the Runner

### Check Runner Status

```bash
# SSH to Lightsail
ssh -i ~/.ssh/lightsail_key ec2-user@[LIGHTSAIL_IP]

# Check service status
sudo ~/actions-runner/svc.sh status
```

### View Runner Logs

```bash
# View recent logs
sudo journalctl -u actions.runner.* -f

# Or view the runner's log file
cat ~/actions-runner/_diag/Runner_*.log
```

### Stop the Runner

```bash
# Stop the service
sudo ~/actions-runner/svc.sh stop
```

### Start the Runner

```bash
# Start the service
sudo ~/actions-runner/svc.sh start
```

### Restart the Runner

```bash
# Restart the service
sudo ~/actions-runner/svc.sh stop
sudo ~/actions-runner/svc.sh start
```

### Remove the Runner

If you need to completely remove the runner:

```bash
# Stop and uninstall the service
sudo ~/actions-runner/svc.sh stop
sudo ~/actions-runner/svc.sh uninstall

# Remove the runner from GitHub
cd ~/actions-runner
./config.sh remove --token [NEW_TOKEN_FROM_GITHUB]

# Remove the runner directory
cd ~
rm -rf ~/actions-runner
```

## Troubleshooting

### Runner Shows as Offline

**Issue:** Runner appears offline in GitHub

**Solutions:**
1. Check if the service is running:
   ```bash
   sudo ~/actions-runner/svc.sh status
   ```

2. Restart the service:
   ```bash
   sudo ~/actions-runner/svc.sh stop
   sudo ~/actions-runner/svc.sh start
   ```

3. Check logs for errors:
   ```bash
   sudo journalctl -u actions.runner.* -n 50
   ```

### Deployment Fails with Permission Error

**Issue:** Docker commands fail with permission denied

**Solution:** Add the runner user to the docker group:
```bash
sudo usermod -aG docker $(whoami)
# Log out and log back in for changes to take effect
```

### Runner Can't Find Docker Compose

**Issue:** `docker compose: command not found`

**Solution:** Ensure Docker Compose is installed:
```bash
# Check Docker Compose version
docker compose version

# If not installed, install it
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
  -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### Disk Space Issues

**Issue:** Deployment fails due to insufficient disk space

**Solution:** Clean up old Docker resources:
```bash
# Remove unused Docker images, containers, volumes
docker system prune -af
docker volume prune -f

# Check disk usage
df -h
du -sh ~/actions-runner/_work/*
```

### Runner Doesn't Start After Reboot

**Issue:** Runner service doesn't start automatically after server reboot

**Solution:** Verify service is enabled:
```bash
# Check if service is enabled
sudo systemctl is-enabled actions.runner.*

# Enable the service
sudo systemctl enable actions.runner.*

# Start the service
sudo ~/actions-runner/svc.sh start
```

## Security Considerations

### Runner Security

- ✅ Runner runs as a non-root user
- ✅ Runner has limited permissions (only what's needed for deployment)
- ✅ Secrets are injected at runtime (not stored on disk)
- ✅ Runner is isolated to your private repository

### Best Practices

1. **Keep the runner updated:**
   ```bash
   cd ~/actions-runner
   ./config.sh remove --token [TOKEN]
   # Download latest version and reconfigure
   ```

2. **Monitor runner logs regularly:**
   ```bash
   sudo journalctl -u actions.runner.* -f
   ```

3. **Limit runner to specific workflows:**
   - Use labels to control which jobs run on this runner
   - In your workflow, specify: `runs-on: [self-hosted, development]`

4. **Regular security updates:**
   ```bash
   sudo yum update -y
   ```

## Advanced Configuration

### Custom Labels

Add custom labels during configuration to control job routing:

```bash
./config.sh --url https://github.com/ryanvt2005/Recipes \
  --token [TOKEN] \
  --labels development,lightsail,docker
```

Then in your workflow:
```yaml
runs-on: [self-hosted, development, lightsail]
```

### Environment Variables

Set persistent environment variables for the runner:

```bash
# Edit the service file
sudo systemctl edit actions.runner.*

# Add environment variables
[Service]
Environment="CUSTOM_VAR=value"
```

### Resource Limits

Limit CPU and memory usage:

```bash
# Edit service file
sudo systemctl edit actions.runner.*

# Add limits
[Service]
CPUQuota=50%
MemoryLimit=2G
```

## Next Steps

Once your runner is set up and working:

1. ✅ Monitor the first few deployments
2. ✅ Set up monitoring/alerts (optional)
3. ✅ Document your specific deployment process
4. ✅ Consider setting up a staging environment

## Support

- **GitHub Actions Documentation:** https://docs.github.com/en/actions/hosting-your-own-runners
- **Runner Releases:** https://github.com/actions/runner/releases
- **Issues:** https://github.com/ryanvt2005/Recipes/issues

---

**Last Updated:** 2026-01-11
