#!/bin/bash

# Backend Diagnostic Script
# Run this on Lightsail when backend is not responding

echo "🔍 Recipe App Backend Diagnostics"
echo "=================================="
echo ""

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: docker-compose.yml not found. Please run this from ~/Recipes directory."
    exit 1
fi

# 1. Check Docker containers
echo "📦 Docker Container Status:"
echo "---"
docker-compose ps
echo ""

# 2. Check if backend container exists
if ! docker-compose ps | grep -q "backend"; then
    echo "❌ Backend container doesn't exist!"
    echo "   Run: docker-compose up -d"
    exit 1
fi

# 3. Check backend container status
BACKEND_STATUS=$(docker-compose ps backend | grep backend | awk '{print $3}')
echo "Backend status: $BACKEND_STATUS"
echo ""

# 4. Check if .env file exists
echo "📄 Environment File Check:"
echo "---"
if [ -f ".env" ]; then
    echo "✅ .env file exists"
    echo "   Location: $(pwd)/.env"
    echo "   Size: $(wc -c < .env) bytes"
    echo "   Lines: $(wc -l < .env) lines"
else
    echo "❌ .env file NOT found!"
    echo "   CRITICAL: This is likely the problem!"
    echo "   Run: ./scripts/setup-env.sh"
    exit 1
fi
echo ""

# 5. Check critical environment variables
echo "🔑 Critical Environment Variables:"
echo "---"
if docker-compose exec -T backend env 2>/dev/null | grep -q "JWT_SECRET="; then
    JWT_LEN=$(docker-compose exec -T backend env | grep "JWT_SECRET=" | cut -d= -f2 | tr -d '\r\n' | wc -c)
    if [ $JWT_LEN -ge 32 ]; then
        echo "✅ JWT_SECRET: Set ($JWT_LEN chars)"
    else
        echo "⚠️  JWT_SECRET: Too short ($JWT_LEN chars)"
    fi
else
    echo "❌ JWT_SECRET: NOT SET"
fi

if docker-compose exec -T backend env 2>/dev/null | grep -q "ANTHROPIC_API_KEY=sk-ant"; then
    echo "✅ ANTHROPIC_API_KEY: Set"
else
    echo "❌ ANTHROPIC_API_KEY: NOT SET or invalid"
fi

if docker-compose exec -T backend env 2>/dev/null | grep -q "DB_PASSWORD="; then
    echo "✅ DB_PASSWORD: Set"
else
    echo "❌ DB_PASSWORD: NOT SET"
fi
echo ""

# 6. Check backend logs for errors
echo "📋 Recent Backend Logs (last 30 lines):"
echo "---"
docker-compose logs --tail=30 backend
echo ""

# 7. Check for specific error patterns
echo "🚨 Error Analysis:"
echo "---"
if docker-compose logs backend | grep -q "JWT_SECRET"; then
    echo "⚠️  Found JWT_SECRET related errors in logs"
fi

if docker-compose logs backend | grep -q "ECONNREFUSED"; then
    echo "⚠️  Database connection refused - check if DB container is running"
fi

if docker-compose logs backend | grep -q "Error"; then
    echo "⚠️  Found errors in backend logs (see above)"
    echo ""
    echo "Most recent errors:"
    docker-compose logs backend | grep -i "error" | tail -5
fi

if docker-compose logs backend | grep -q "Server running on port"; then
    echo "✅ Backend started successfully"
else
    echo "❌ Backend may not have started - no 'Server running' message found"
fi
echo ""

# 8. Check network connectivity
echo "🌐 Network Connectivity:"
echo "---"

# Check if port 3000 is listening
if docker-compose exec -T backend sh -c 'netstat -tuln 2>/dev/null | grep :3000' > /dev/null 2>&1; then
    echo "✅ Backend is listening on port 3000 inside container"
else
    if docker-compose exec -T backend sh -c 'command -v ss > /dev/null' > /dev/null 2>&1; then
        if docker-compose exec -T backend sh -c 'ss -tuln | grep :3000' > /dev/null 2>&1; then
            echo "✅ Backend is listening on port 3000 inside container"
        else
            echo "❌ Backend is NOT listening on port 3000 inside container"
        fi
    else
        echo "⚠️  Cannot check if port 3000 is listening (netstat/ss not available)"
    fi
fi

# Check if host port is open
if netstat -tuln 2>/dev/null | grep ":3000" > /dev/null 2>&1; then
    echo "✅ Port 3000 is exposed on host"
elif ss -tuln 2>/dev/null | grep ":3000" > /dev/null 2>&1; then
    echo "✅ Port 3000 is exposed on host"
else
    echo "❌ Port 3000 is NOT exposed on host"
fi

# Test health endpoint from inside Lightsail
echo ""
echo "Testing health endpoint from Lightsail:"
HEALTH_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" http://localhost:3000/health 2>&1)
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Health endpoint responding (200 OK)"
    echo "$HEALTH_RESPONSE" | grep -v "HTTP_CODE" | head -1
else
    echo "❌ Health endpoint NOT responding"
    echo "   Error: $HEALTH_RESPONSE"
fi
echo ""

# 9. Database connectivity
echo "💾 Database Connectivity:"
echo "---"
DB_STATUS=$(docker-compose ps db | grep db | awk '{print $3}')
echo "Database status: $DB_STATUS"

if docker-compose exec -T db pg_isready -U recipeuser > /dev/null 2>&1; then
    echo "✅ Database is ready"
else
    echo "❌ Database is NOT ready"
fi
echo ""

# 10. Summary and recommendations
echo "📊 SUMMARY & RECOMMENDATIONS:"
echo "=============================="

ISSUES_FOUND=0

# Check critical issues
if [ ! -f ".env" ]; then
    echo "🔴 CRITICAL: .env file missing - Run: ./scripts/setup-env.sh"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

if ! docker-compose logs backend | grep -q "Server running on port"; then
    echo "🔴 CRITICAL: Backend not started properly - Check logs above"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

if ! docker-compose ps | grep backend | grep -q "Up"; then
    echo "🔴 CRITICAL: Backend container not running"
    echo "   Recommended action: docker-compose up -d"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

if [ "$HTTP_CODE" != "200" ]; then
    echo "🔴 CRITICAL: Backend health check failed"
    echo "   Backend is not responding to requests"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

if [ $ISSUES_FOUND -eq 0 ]; then
    echo "✅ No critical issues found!"
    echo ""
    echo "If you're still having problems:"
    echo "1. Check Lightsail firewall rules (port 3000 should be open)"
    echo "2. Verify frontend is pointing to correct IP: http://98.86.116.176:3000"
    echo "3. Check browser console for CORS errors"
else
    echo ""
    echo "Found $ISSUES_FOUND critical issue(s) - fix these first!"
fi

echo ""
echo "💡 Common Fixes:"
echo "---"
echo "1. Missing .env file:"
echo "   ./scripts/setup-env.sh"
echo ""
echo "2. Backend crashed:"
echo "   docker-compose logs backend | tail -50"
echo "   docker-compose restart backend"
echo ""
echo "3. Complete reset:"
echo "   docker-compose down"
echo "   docker-compose up -d"
echo "   sleep 10"
echo "   docker-compose exec backend npm run migrate"
echo ""
echo "4. Nuclear option (deletes all data):"
echo "   docker-compose down"
echo "   docker volume rm recipes_postgres_data"
echo "   docker-compose up -d"
echo "   sleep 20"
echo "   docker-compose exec backend npm run migrate"
echo ""
