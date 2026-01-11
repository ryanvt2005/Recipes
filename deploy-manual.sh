#!/bin/bash

# Manual Deployment Script for Lightsail
# This script deploys the latest code to your Lightsail instance

echo "🚀 Starting manual deployment to Lightsail..."

# Check if SSH key file exists
if [ ! -f ~/.ssh/lightsail_key ]; then
    echo "❌ Error: SSH key not found at ~/.ssh/lightsail_key"
    echo "Please add your Lightsail SSH key to ~/.ssh/lightsail_key"
    exit 1
fi

# Prompt for Lightsail IP if not set
if [ -z "$LIGHTSAIL_IP" ]; then
    read -p "Enter your Lightsail IP address: " LIGHTSAIL_IP
fi

echo "📡 Deploying to: $LIGHTSAIL_IP"

# Deploy via SSH
ssh -i ~/.ssh/lightsail_key ec2-user@$LIGHTSAIL_IP << 'ENDSSH'
set -e

echo "📦 Pulling latest code..."
cd ~/Recipes
git fetch origin
git checkout develop
git pull origin develop

echo "🔧 Building and restarting containers..."
docker-compose down
docker-compose up -d --build

echo "⏳ Waiting for containers to start..."
sleep 10

echo "🗄️  Running database migrations..."
docker-compose exec -T backend npm run migrate || true

echo "✅ Deployment complete!"
docker-compose ps

ENDSSH

echo ""
echo "✅ Deployment finished!"
echo "🌐 Your app should be available at:"
echo "   Frontend: http://$LIGHTSAIL_IP:3001"
echo "   Backend:  http://$LIGHTSAIL_IP:3000"
echo ""
echo "To check status: ssh -i ~/.ssh/lightsail_key ec2-user@$LIGHTSAIL_IP 'cd ~/Recipes && docker-compose ps'"
