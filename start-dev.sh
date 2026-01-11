#!/bin/bash

# Script to start the full local development stack

set -e

echo "🚀 Starting Recipe App - Local Development Stack"
echo "================================================"
echo ""

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: docker-compose.yml not found."
    echo "   Please run this script from the Recipes directory."
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running."
    echo "   Please start Docker Desktop and try again."
    exit 1
fi

# Detect docker-compose command (v1 vs v2)
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
elif docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    echo "❌ Error: docker-compose not found."
    echo "   Install it with: sudo apt-get install docker-compose-plugin"
    exit 1
fi

echo "Using: $DOCKER_COMPOSE"
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found!"
    echo ""
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo ""
    echo "⚠️  IMPORTANT: Edit .env and set your values:"
    echo "   - JWT_SECRET (run: openssl rand -hex 32)"
    echo "   - ANTHROPIC_API_KEY (your API key)"
    echo ""
    echo "After editing .env, run this script again."
    exit 1
fi

# Check if frontend .env.local exists
if [ ! -f "frontend/.env.local" ]; then
    echo "📝 Creating frontend/.env.local..."
    cp frontend/.env.local.example frontend/.env.local
    echo "✅ Created frontend/.env.local"
    echo ""
fi

# Check if frontend dependencies are installed
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
    echo "✅ Frontend dependencies installed"
    echo ""
fi

# Start backend and database
echo "🐳 Starting backend and database..."
$DOCKER_COMPOSE -f docker-compose.yml -f docker-compose.dev.yml up -d

echo ""
echo "⏳ Waiting for services to start (15 seconds)..."
sleep 15

# Check if backend is healthy
echo ""
echo "🏥 Checking backend health..."
HEALTH=$(curl -s http://localhost:3000/health || echo "failed")

if echo "$HEALTH" | grep -q "healthy"; then
    echo "✅ Backend is healthy!"
else
    echo "⚠️  Backend might not be ready yet. Checking logs..."
    $DOCKER_COMPOSE logs --tail=20 backend
    echo ""
    echo "If you see errors above, fix them and run: $DOCKER_COMPOSE restart backend"
fi

echo ""
echo "=========================================="
echo "✅ Backend Started!"
echo "=========================================="
echo ""
echo "Backend API: http://localhost:3000"
echo "Health Check: http://localhost:3000/health"
echo ""
echo "📋 View backend logs:"
echo "   $DOCKER_COMPOSE logs -f backend"
echo ""
echo "🗄️  Access database:"
echo "   $DOCKER_COMPOSE exec db psql -U recipeuser -d recipeapp"
echo ""
echo "----------------------------------------"
echo ""
echo "🎨 Now start the frontend in a NEW terminal:"
echo ""
echo "   cd ~/Recipes/frontend"
echo "   npm run dev"
echo ""
echo "Then open: http://localhost:3001"
echo ""
echo "----------------------------------------"
echo ""
echo "To stop the backend:"
echo "   $DOCKER_COMPOSE down"
echo ""
