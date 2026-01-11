# GitHub Actions Runner Fix for Amazon Linux 2

## Issue

The latest GitHub Actions runner requires GLIBC 2.27/2.28, but Amazon Linux 2 only has GLIBC 2.26. This causes the runner to fail with:

```
/lib64/libm.so.6: version `GLIBC_2.27' not found
/lib64/libc.so.6: version `GLIBC_2.28' not found
```

## Quick Fix: Use Compatible Runner Version

### Step 1: SSH to Your Lightsail Instance

```bash
ssh -i ~/.ssh/lightsail_key ec2-user@[LIGHTSAIL_IP]
```

### Step 2: Remove Current Runner (if installed)

```bash
# Stop the runner if it's running
sudo ~/actions-runner/svc.sh stop 2>/dev/null || true
sudo ~/actions-runner/svc.sh uninstall 2>/dev/null || true

# Remove the directory
rm -rf ~/actions-runner
```

### Step 3: Install Compatible Runner Version

Use runner version **2.298.2** which is compatible with Amazon Linux 2:

```bash
# Create runner directory
mkdir ~/actions-runner && cd ~/actions-runner

# Download compatible runner version (2.298.2)
curl -o actions-runner-linux-x64-2.298.2.tar.gz -L \
  https://github.com/actions/runner/releases/download/v2.298.2/actions-runner-linux-x64-2.298.2.tar.gz

# Verify the hash (optional but recommended)
echo "0bfd792196ce0ec6f1c65d2a9ad00215b2926ef2c416b8d97615265194477117  actions-runner-linux-x64-2.298.2.tar.gz" | shasum -a 256 -c

# Extract the installer
tar xzf ./actions-runner-linux-x64-2.298.2.tar.gz
```

### Step 4: Get Runner Token from GitHub

1. Go to: https://github.com/ryanvt2005/Recipes/settings/actions/runners/new
2. Click **New self-hosted runner**
3. Select **Linux** and **x64**
4. Copy the **token** (you'll need it in the next step)

### Step 5: Configure the Runner

```bash
# Configure with your token from GitHub
./config.sh --url https://github.com/ryanvt2005/Recipes --token [YOUR_TOKEN_FROM_GITHUB]
```

**During configuration:**
- Runner group: Press Enter for default
- Runner name: Enter `lightsail-dev` or press Enter for hostname
- Work folder: Press Enter for default
- Labels: Add `development,amazon-linux-2` (comma separated)
- Run as service: Type `N` (No - we'll set this up next)

### Step 6: Install as Service

```bash
# Install the service
sudo ./svc.sh install

# Start the service
sudo ./svc.sh start

# Verify it's running
sudo ./svc.sh status
```

### Step 7: Verify in GitHub

1. Go to: https://github.com/ryanvt2005/Recipes/settings/actions/runners
2. You should see your runner listed with status: **Idle** (green)
3. The runner should show labels: `self-hosted`, `Linux`, `X64`, `development`, `amazon-linux-2`

### Step 8: Test the Deployment

```bash
# From your local machine
cd ~/projects/Recipes
git pull origin develop

# Trigger a deployment
git commit --allow-empty -m "Test runner deployment"
git push origin develop
```

Watch the deployment at: https://github.com/ryanvt2005/Recipes/actions

## Long-Term Solution: Upgrade to Amazon Linux 2023

For the best compatibility and latest features, consider upgrading to Amazon Linux 2023:

### Benefits
- ✅ Latest GLIBC version (full compatibility)
- ✅ Latest security patches
- ✅ Better performance
- ✅ Longer support lifecycle

### Migration Steps

1. **Create new Lightsail instance with Amazon Linux 2023:**
   - Go to AWS Lightsail Console
   - Create new instance
   - Select "Amazon Linux 2023" as OS
   - Choose same instance size

2. **Set up the new instance:**
   ```bash
   # Install Docker
   sudo yum install -y docker
   sudo systemctl start docker
   sudo systemctl enable docker
   sudo usermod -aG docker ec2-user

   # Install Docker Compose
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
     -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose

   # Clone your repository
   git clone https://github.com/ryanvt2005/Recipes.git ~/Recipes
   ```

3. **Install GitHub Actions Runner:**
   ```bash
   # Follow the standard installation from GitHub
   # (No special version needed - latest will work!)
   ```

4. **Update DNS/IP and test**

5. **Decommission old instance**

## Troubleshooting

### Runner still shows GLIBC errors

**Check runner version:**
```bash
cat ~/actions-runner/.runner
```

Should show version `2.298.2` or earlier.

**If wrong version:**
```bash
rm -rf ~/actions-runner
# Follow installation steps again with v2.298.2
```

### Runner shows as offline

```bash
# Check status
sudo ~/actions-runner/svc.sh status

# View logs
sudo journalctl -u actions.runner.* -f
```

### Service doesn't start after reboot

```bash
# Enable service
sudo systemctl enable actions.runner.*

# Start manually
sudo ~/actions-runner/svc.sh start
```

## Alternative: Use Docker Container Runner

Another option is to run the GitHub Actions runner inside a Docker container with the correct GLIBC:

```bash
docker run -d --restart=unless-stopped \
  --name github-runner \
  -e RUNNER_NAME=lightsail-docker \
  -e RUNNER_REPOSITORY_URL=https://github.com/ryanvt2005/Recipes \
  -e GITHUB_ACCESS_TOKEN=[YOUR_PERSONAL_ACCESS_TOKEN] \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /home/ec2-user/Recipes:/home/ec2-user/Recipes \
  myoung34/github-runner:latest
```

## Summary

**Recommended approach for Amazon Linux 2:**
- ✅ Use runner version 2.298.2 (compatible with GLIBC 2.26)
- ⏱️ Takes 5-10 minutes to set up
- ✅ Works immediately with existing setup

**Long-term recommendation:**
- 🚀 Upgrade to Amazon Linux 2023
- ✅ Full compatibility with latest tools
- ⏱️ Requires instance migration

---

**Questions?** Open an issue at: https://github.com/ryanvt2005/Recipes/issues
