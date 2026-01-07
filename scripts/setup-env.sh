#!/bin/bash

# Script to set up environment variables on Lightsail
# This ensures environment variables persist across restarts

set -e

echo "🔧 Setting up environment variables for Recipe App..."
echo ""

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: docker-compose.yml not found. Please run this script from the Recipes directory."
    exit 1
fi

# Prompt for Anthropic API key if not already set
if [ -f ".env" ]; then
    echo "✅ .env file already exists"
    read -p "Do you want to update it? (y/N): " update_env
    if [ "$update_env" != "y" ] && [ "$update_env" != "Y" ]; then
        echo "Keeping existing .env file"
        exit 0
    fi
fi

echo ""
echo "Please provide the following information:"
echo ""

# Get Anthropic API key
read -p "Enter your Anthropic API key (sk-ant-api03-...): " anthropic_key

# Get database password (or use default)
read -p "Enter database password (press Enter for default 'MySecurePassword123!'): " db_password
db_password=${db_password:-MySecurePassword123!}

# Generate JWT secret
jwt_secret=$(openssl rand -hex 32)

# Create .env file
cat > .env << EOF
# Database Configuration
DB_NAME=recipeapp
DB_USER=recipeuser
DB_PASSWORD=$db_password

# JWT Configuration - Auto-generated secure random string
JWT_SECRET=$jwt_secret

# Anthropic API
ANTHROPIC_API_KEY=$anthropic_key

# Server Configuration
NODE_ENV=production
PORT=3000
FRONTEND_URL=http://98.86.116.176:3001
EOF

echo ""
echo "✅ .env file created successfully!"
echo ""
echo "🔒 Security check:"
echo "   - JWT_SECRET: Auto-generated (64 chars)"
echo "   - DB_PASSWORD: Set"
echo "   - ANTHROPIC_API_KEY: Set"
echo ""
echo "⚠️  IMPORTANT: Keep your .env file secure and never commit it to git!"
echo ""
echo "Next steps:"
echo "1. Restart Docker containers: docker-compose down && docker-compose up -d"
echo "2. Wait 10 seconds for services to start"
echo "3. Check health: curl http://localhost:3000/health"
echo ""
