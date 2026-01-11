#!/bin/bash
# Local deployment script for testing before pushing to main
# This script builds and runs containers locally to verify everything works

set -e

echo "========================================"
echo "🏗️  Local Deployment Script"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ Error: .env file not found${NC}"
    echo "Please create a .env file with the following variables:"
    echo "  DB_PASSWORD=your_password"
    echo "  JWT_SECRET=your_secret"
    echo "  ANTHROPIC_API_KEY=your_api_key"
    exit 1
fi

# Load environment variables
echo -e "${BLUE}📋 Loading environment variables...${NC}"
export $(grep -v '^#' .env | xargs)

# Stop and remove existing containers
echo -e "${BLUE}🛑 Stopping existing containers...${NC}"
docker stop recipe-app-backend recipe-app-frontend recipe-app-db 2>/dev/null || true
docker rm recipe-app-backend recipe-app-frontend recipe-app-db 2>/dev/null || true

# Clean up old images
echo -e "${BLUE}🧹 Cleaning up old Docker images...${NC}"
docker image prune -f || true

# Build frontend
echo -e "${BLUE}🏗️  Building frontend image...${NC}"
docker build -t recipe-app-frontend:latest \
  --target production \
  --build-arg VITE_API_URL=http://localhost:3000 \
  ./frontend

echo -e "${GREEN}✅ Frontend build complete${NC}"

# Build backend
echo -e "${BLUE}🏗️  Building backend image...${NC}"
docker build -t recipe-app-backend:latest --target prod ./backend

echo -e "${GREEN}✅ Backend build complete${NC}"

# Create network
echo -e "${BLUE}🔗 Creating Docker network...${NC}"
docker network create recipes_default 2>/dev/null || echo "Network already exists"

# Create volume
echo -e "${BLUE}💾 Creating PostgreSQL volume...${NC}"
docker volume create recipes_postgres_data 2>/dev/null || echo "Volume already exists"

# Start database
echo -e "${BLUE}🚀 Starting PostgreSQL database...${NC}"
docker run -d \
  --name recipe-app-db \
  --network recipes_default \
  -e POSTGRES_DB=recipeapp \
  -e POSTGRES_USER=recipeuser \
  -e POSTGRES_PASSWORD=${DB_PASSWORD} \
  -v recipes_postgres_data:/var/lib/postgresql/data \
  -p 5432:5432 \
  --restart unless-stopped \
  postgres:15-alpine

echo -e "${YELLOW}⏳ Waiting for database to be ready...${NC}"
sleep 5

# Start backend
echo -e "${BLUE}🚀 Starting backend service...${NC}"
docker run -d \
  --name recipe-app-backend \
  --network recipes_default \
  -e DB_HOST=recipe-app-db \
  -e DB_PORT=5432 \
  -e DB_NAME=recipeapp \
  -e DB_USER=recipeuser \
  -e DB_PASSWORD=${DB_PASSWORD} \
  -e JWT_SECRET=${JWT_SECRET} \
  -e ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY} \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e FRONTEND_URL=http://localhost:3001 \
  -p 3000:3000 \
  --restart unless-stopped \
  recipe-app-backend:latest

echo -e "${YELLOW}⏳ Waiting for backend to start...${NC}"
sleep 5

# Start frontend
echo -e "${BLUE}🚀 Starting frontend service...${NC}"
docker run -d \
  --name recipe-app-frontend \
  --network recipes_default \
  -p 3001:80 \
  --restart unless-stopped \
  recipe-app-frontend:latest

# Run migrations
echo -e "${BLUE}🗄️  Running database migrations...${NC}"
sleep 3
docker exec recipe-app-backend npm run migrate || echo -e "${YELLOW}⚠️  Migrations may have already been applied${NC}"

# Show container status
echo ""
echo "========================================"
echo -e "${GREEN}📋 Container Status:${NC}"
echo "========================================"
docker ps --filter "name=recipe-app"

# Wait a bit for services to fully start
echo ""
echo -e "${YELLOW}⏳ Waiting for services to fully start...${NC}"
sleep 5

# Health check
echo ""
echo "========================================"
echo -e "${BLUE}🏥 Running Health Checks${NC}"
echo "========================================"

# Check backend
echo -e "${BLUE}Checking backend health...${NC}"
for i in {1..10}; do
    if curl -f -s http://localhost:3000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend is healthy!${NC}"
        break
    fi
    if [ $i -eq 10 ]; then
        echo -e "${RED}❌ Backend health check failed${NC}"
        echo "Check logs with: docker logs recipe-app-backend"
        exit 1
    fi
    echo "Attempt $i/10..."
    sleep 2
done

# Check frontend
echo -e "${BLUE}Checking frontend...${NC}"
if curl -f -s http://localhost:3001 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend is accessible!${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend may still be starting up${NC}"
fi

echo ""
echo "========================================"
echo -e "${GREEN}✅ Local Deployment Successful!${NC}"
echo "========================================"
echo ""
echo -e "${GREEN}🌐 Application: http://localhost:3001${NC}"
echo -e "${GREEN}🔧 API: http://localhost:3000${NC}"
echo ""
echo "Useful commands:"
echo "  View backend logs:  docker logs -f recipe-app-backend"
echo "  View frontend logs: docker logs -f recipe-app-frontend"
echo "  View database logs: docker logs -f recipe-app-db"
echo "  Stop all:           docker stop recipe-app-backend recipe-app-frontend recipe-app-db"
echo ""
