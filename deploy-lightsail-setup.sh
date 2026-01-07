#!/bin/bash

# Run this script ON the Lightsail instance after SSH'ing in
# This installs Docker, clones the repo, and starts the application

set -e

echo "🔧 Setting up Recipe App on Lightsail"
echo "======================================"

# Update system
echo "Updating system packages..."
sudo yum update -y

# Install Docker
echo "Installing Docker..."
sudo yum install -y docker
sudo service docker start
sudo usermod -a -G docker ec2-user

# Install Docker Compose
echo "Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Git
echo "Installing Git..."
sudo yum install -y git

# Clone repository (replace with your actual repo URL)
echo "Cloning repository..."
cd /home/ec2-user
git clone https://github.com/ryanvt2005/Recipes.git
cd Recipes

# Checkout the correct branch
git checkout claude/recipe-app-backend-UoTAm

# Create .env file
echo "Creating environment file..."
cat > .env << 'EOF'
# Database Configuration
DB_NAME=recipeapp
DB_USER=recipeuser
DB_PASSWORD=Recipe2024SecurePassword!

# JWT Configuration (change this to a random 32+ character string)
JWT_SECRET=your-super-secret-jwt-key-change-this-to-random-string

# Anthropic API (REQUIRED - add your key here)
ANTHROPIC_API_KEY=sk-ant-api03-YOUR_KEY_HERE

# Server Configuration
NODE_ENV=production
FRONTEND_URL=http://localhost:3001
EOF

echo ""
echo "⚠️  IMPORTANT: Edit the .env file to add your ANTHROPIC_API_KEY"
echo "Run: nano .env"
echo ""
read -p "Press Enter after you've updated the .env file..."

# Start Docker service (in case not started)
sudo service docker start

# Build and start containers
echo "Starting Docker containers..."
docker-compose up -d

# Wait for database to be ready
echo "Waiting for database to be ready..."
sleep 10

# Run database migrations
echo "Running database migrations..."
docker-compose exec -T backend npm run migrate

# Show status
echo ""
echo "✅ Deployment complete!"
echo "======================="
echo ""
docker-compose ps
echo ""
echo "🌐 Your API is now running!"
echo "Health check: curl http://localhost:3000/health"
echo ""
echo "To view logs:"
echo "  docker-compose logs -f backend"
echo ""
echo "To restart:"
echo "  docker-compose restart"
echo ""
echo "Get your public IP with: curl ifconfig.me"
