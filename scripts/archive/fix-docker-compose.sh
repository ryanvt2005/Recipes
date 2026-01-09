#!/bin/bash

# Fix Docker Compose version issue on Lightsail
# Run this on your Lightsail instance to update Docker Compose

echo "🔧 Fixing Docker Compose version..."

# Update Docker Compose to latest version
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

echo "✅ Docker Compose updated!"
docker-compose --version

echo ""
echo "Now you can run:"
echo "  cd ~/Recipes"
echo "  docker-compose down"
echo "  docker build -t recipe-app-backend:latest backend/"
echo "  docker-compose up -d"
