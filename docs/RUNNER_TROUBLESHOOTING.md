# GitHub Actions Runner Troubleshooting

## Runner Shows as "Offline" in GitHub

If your runner appears as "Offline" in GitHub (Settings → Actions → Runners) even though the service is running, follow these steps:

### Quick Diagnosis

SSH to your Lightsail instance and run these commands:

```bash
# 1. Check service status
sudo ~/actions-runner/svc.sh status

# 2. Check if the process is actually running
ps aux | grep Runner.Listener | grep -v grep

# 3. View recent logs
sudo journalctl -u actions.runner.* -n 50
```

### Common Causes and Solutions

#### 1. GLIBC Version Mismatch (Most Common on Amazon Linux 2)

**Symptom:** Logs show `GLIBC_2.27 not found` or `GLIBC_2.28 not found`

**Check:**
```bash
# View runner logs
sudo journalctl -u actions.runner.* | grep -i glibc
```

**Solution:**
You need to use an older runner version. See: [Amazon Linux 2 Fix Guide](RUNNER_AMAZON_LINUX_2_FIX.md)

```bash
# Quick fix - use compatible version
cd ~
sudo ~/actions-runner/svc.sh stop
sudo ~/actions-runner/svc.sh uninstall
rm -rf ~/actions-runner

# Install v2.298.2 (compatible with Amazon Linux 2)
mkdir ~/actions-runner && cd ~/actions-runner
curl -o actions-runner-linux-x64-2.298.2.tar.gz -L \
  https://github.com/actions/runner/releases/download/v2.298.2/actions-runner-linux-x64-2.298.2.tar.gz
tar xzf ./actions-runner-linux-x64-2.298.2.tar.gz

# Get new token from GitHub and configure
./config.sh --url https://github.com/ryanvt2005/Recipes --token [NEW_TOKEN]
sudo ./svc.sh install
sudo ./svc.sh start
```

#### 2. Service Running but Runner Not Connected

**Symptom:** Service shows as "active (running)" but runner is offline

**Check logs for connection errors:**
```bash
sudo journalctl -u actions.runner.* -f
```

**Common issues:**

**A. Invalid or Expired Token**
- The registration token expires after 1 hour
- Solution: Get a new token and reconfigure

```bash
# Stop service
sudo ~/actions-runner/svc.sh stop
sudo ~/actions-runner/svc.sh uninstall

# Remove old configuration
cd ~/actions-runner
./config.sh remove --token [NEW_REMOVAL_TOKEN_FROM_GITHUB]

# Get new registration token from GitHub
# https://github.com/ryanvt2005/Recipes/settings/actions/runners/new

# Reconfigure
./config.sh --url https://github.com/ryanvt2005/Recipes --token [NEW_TOKEN]
sudo ./svc.sh install
sudo ./svc.sh start
```

**B. Network Connectivity Issues**

Test GitHub API connectivity:
```bash
curl -v https://api.github.com/
```

If this fails, check:
- DNS resolution: `nslookup api.github.com`
- Firewall rules: Ensure outbound HTTPS (port 443) is allowed
- Proxy settings (if applicable)

**C. Permissions Issues**

Runner service needs proper permissions:
```bash
# Check who owns the runner files
ls -la ~/actions-runner/

# Should be owned by ec2-user (or your user)
# If not, fix permissions:
sudo chown -R ec2-user:ec2-user ~/actions-runner/
```

#### 3. Service Not Actually Running

**Check systemd service:**
```bash
sudo systemctl status actions.runner.*
```

**If service failed to start:**
```bash
# View error details
sudo journalctl -u actions.runner.* -n 100 --no-pager

# Common fixes:

# Fix 1: Reinstall service
cd ~/actions-runner
sudo ./svc.sh uninstall
sudo ./svc.sh install
sudo ./svc.sh start

# Fix 2: Check for port conflicts
# Runner uses ephemeral ports - ensure nothing is blocking them

# Fix 3: Ensure runner directory exists and has correct permissions
ls -la ~/actions-runner/
```

#### 4. Multiple Runners with Same Name

**Symptom:** Old offline runner still listed in GitHub

**Solution:**
Remove old runners from GitHub UI:
1. Go to Settings → Actions → Runners
2. Click the offline runner
3. Click "Remove runner"
4. Then verify only your active runner is listed

#### 5. Runner Working Directory Issues

**Check work directory:**
```bash
ls -la ~/actions-runner/_work/
```

**If permission issues:**
```bash
sudo chown -R ec2-user:ec2-user ~/actions-runner/_work/
```

### Complete Restart Procedure

If all else fails, do a complete restart:

```bash
# 1. Stop and uninstall service
sudo ~/actions-runner/svc.sh stop
sudo ~/actions-runner/svc.sh uninstall

# 2. Remove runner from GitHub
cd ~/actions-runner
# Get removal token from GitHub: Settings → Actions → Runners → Click runner → Remove
./config.sh remove --token [REMOVAL_TOKEN]

# 3. Clean up old files
cd ~
rm -rf ~/actions-runner

# 4. Fresh installation
mkdir ~/actions-runner && cd ~/actions-runner

# For Amazon Linux 2, use v2.298.2:
curl -o actions-runner-linux-x64-2.298.2.tar.gz -L \
  https://github.com/actions/runner/releases/download/v2.298.2/actions-runner-linux-x64-2.298.2.tar.gz

# For Amazon Linux 2023 or Ubuntu, use latest:
# curl -o actions-runner-linux-x64-2.321.0.tar.gz -L \
#   https://github.com/actions/runner/releases/download/v2.321.0/actions-runner-linux-x64-2.321.0.tar.gz

tar xzf ./actions-runner-linux-x64-*.tar.gz

# 5. Configure (get new token from GitHub)
./config.sh --url https://github.com/ryanvt2005/Recipes --token [NEW_TOKEN]

# 6. Install and start service
sudo ./svc.sh install
sudo ./svc.sh start

# 7. Verify
sudo ./svc.sh status
```

### Verification Steps

After any fix, verify the runner is working:

```bash
# 1. Check service status
sudo ~/actions-runner/svc.sh status
# Should show: "Active: active (running)"

# 2. Check logs show connection
sudo journalctl -u actions.runner.* -n 20
# Should show: "Connected to GitHub" or "Listening for Jobs"

# 3. Check GitHub UI
# Go to: https://github.com/ryanvt2005/Recipes/settings/actions/runners
# Runner should show: Green dot with "Idle" status

# 4. Test with a workflow
# Trigger any workflow that uses self-hosted runner
# It should start immediately
```

### Monitoring Commands

Keep these handy for ongoing monitoring:

```bash
# Watch logs in real-time
sudo journalctl -u actions.runner.* -f

# Check runner status
sudo ~/actions-runner/svc.sh status

# View recent runner activity
tail -50 ~/actions-runner/_diag/Runner_*.log

# Check for running jobs
ps aux | grep Runner
```

### Getting Help

If the runner still shows as offline after trying these steps:

1. **Collect diagnostics:**
   ```bash
   # Save logs to a file
   sudo journalctl -u actions.runner.* -n 200 > runner-logs.txt

   # Check runner version
   cat ~/actions-runner/.runner

   # Check OS version
   cat /etc/os-release
   ```

2. **Check GitHub Status:**
   - https://www.githubstatus.com/
   - Sometimes GitHub Actions has service issues

3. **Open an issue:**
   - Include logs and diagnostic information
   - https://github.com/ryanvt2005/Recipes/issues

## Quick Reference

### Essential Commands

```bash
# Start runner
sudo ~/actions-runner/svc.sh start

# Stop runner
sudo ~/actions-runner/svc.sh stop

# Restart runner
sudo ~/actions-runner/svc.sh stop && sudo ~/actions-runner/svc.sh start

# Check status
sudo ~/actions-runner/svc.sh status

# View logs (real-time)
sudo journalctl -u actions.runner.* -f

# View last 50 log lines
sudo journalctl -u actions.runner.* -n 50

# Check if runner is actually running
ps aux | grep Runner.Listener | grep -v grep
```

### GitHub URLs

- **Runners page:** https://github.com/ryanvt2005/Recipes/settings/actions/runners
- **New runner setup:** https://github.com/ryanvt2005/Recipes/settings/actions/runners/new
- **Actions runs:** https://github.com/ryanvt2005/Recipes/actions

---

**Last Updated:** 2026-01-11
