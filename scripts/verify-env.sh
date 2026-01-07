#!/bin/bash

# Script to verify environment variables are loaded correctly in Docker containers

echo "🔍 Verifying environment variables..."
echo ""

# Check if containers are running
if ! docker-compose ps | grep -q "Up"; then
    echo "❌ Docker containers are not running. Start them with: docker-compose up -d"
    exit 1
fi

echo "=== .env File Contents (masked) ==="
if [ -f ".env" ]; then
    echo "✅ .env file exists"
    cat .env | sed 's/=.*/=***MASKED***/g'
else
    echo "❌ .env file not found!"
fi

echo ""
echo "=== Backend Container Environment Variables ==="
docker-compose exec -T backend env | grep -E "^(DB_|JWT_|ANTHROPIC_|NODE_ENV|PORT|FRONTEND_URL)" | sed 's/=sk-ant.*/=sk-ant-***MASKED***/g' | sed 's/JWT_SECRET=.*/JWT_SECRET=***MASKED***/g' | sed 's/DB_PASSWORD=.*/DB_PASSWORD=***MASKED***/g'

echo ""
echo "=== Database Container Environment Variables ==="
docker-compose exec -T db env | grep -E "^(POSTGRES_)" | sed 's/PASSWORD=.*/PASSWORD=***MASKED***/g'

echo ""
echo "=== Critical Checks ==="

# Check JWT_SECRET
if docker-compose exec -T backend env | grep -q "JWT_SECRET="; then
    jwt_len=$(docker-compose exec -T backend env | grep "JWT_SECRET=" | cut -d= -f2 | tr -d '\r\n' | wc -c)
    if [ $jwt_len -ge 32 ]; then
        echo "✅ JWT_SECRET is set (length: $jwt_len chars)"
    else
        echo "⚠️  JWT_SECRET is too short (length: $jwt_len chars, recommended: 32+)"
    fi
else
    echo "❌ JWT_SECRET is NOT set!"
fi

# Check ANTHROPIC_API_KEY
if docker-compose exec -T backend env | grep -q "ANTHROPIC_API_KEY=sk-ant"; then
    echo "✅ ANTHROPIC_API_KEY is set"
else
    echo "❌ ANTHROPIC_API_KEY is NOT set or invalid!"
fi

# Check DB_PASSWORD
if docker-compose exec -T backend env | grep -q "DB_PASSWORD="; then
    echo "✅ DB_PASSWORD is set"
else
    echo "❌ DB_PASSWORD is NOT set!"
fi

# Check NODE_ENV
if docker-compose exec -T backend env | grep -q "NODE_ENV=production"; then
    echo "✅ NODE_ENV is set to production"
else
    echo "⚠️  NODE_ENV is not set to production"
fi

echo ""
echo "=== Backend Health Check ==="
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Backend is responding"
    curl -s http://localhost:3000/health | head -n 1
else
    echo "❌ Backend is not responding!"
fi

echo ""
