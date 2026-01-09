#!/bin/bash

# Run this on your Lightsail instance to allow password-less authentication

# 1. First, verify your instance is accessible
echo "Testing SSH access..."

# 2. Make sure .ssh directory exists
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# 3. Add GitHub Actions' SSH key to authorized_keys
# (You'll need to get the public key from your private key)

# If you're seeing permission denied, the issue is likely:
# - Wrong SSH key in GitHub Secrets
# - Key format issues (check for extra spaces/newlines)
# - Key doesn't match instance

# To fix: Download the correct key from Lightsail
# 1. Go to Lightsail console
# 2. Account → SSH keys
# 3. Download the default key for your region
# 4. Copy ENTIRE contents including BEGIN/END lines
# 5. Paste into GitHub Secret: LIGHTSAIL_SSH_KEY

echo "✓ SSH troubleshooting steps ready"
