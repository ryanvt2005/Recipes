#!/bin/bash

# Quick script to show ONLY the critical error causing backend to fail

echo "🔍 Finding Backend Startup Error..."
echo ""

# Get last 100 lines of backend logs
LOGS=$(docker-compose logs --tail=100 backend 2>&1)

# Check for common errors
echo "=== BACKEND ERROR ANALYSIS ==="
echo ""

if echo "$LOGS" | grep -q "JWT_SECRET"; then
    echo "❌ JWT_SECRET ERROR FOUND:"
    echo "$LOGS" | grep -A 3 -B 3 "JWT_SECRET"
    echo ""
    echo "FIX: Run ./scripts/setup-env.sh to configure environment variables"
    exit 1
fi

if echo "$LOGS" | grep -q "ANTHROPIC_API_KEY"; then
    echo "❌ ANTHROPIC_API_KEY ERROR FOUND:"
    echo "$LOGS" | grep -A 3 -B 3 "ANTHROPIC_API_KEY"
    echo ""
    echo "FIX: Run ./scripts/setup-env.sh and enter your API key"
    exit 1
fi

if echo "$LOGS" | grep -qi "ECONNREFUSED.*postgres\|connection refused.*5432"; then
    echo "❌ DATABASE CONNECTION ERROR:"
    echo "$LOGS" | grep -i "ECONNREFUSED\|connection refused" | tail -5
    echo ""
    echo "FIX: Database container is not ready"
    echo "Run: docker-compose restart db && sleep 10 && docker-compose restart backend"
    exit 1
fi

if echo "$LOGS" | grep -qi "EADDRINUSE.*3000\|port 3000.*already in use"; then
    echo "❌ PORT 3000 ALREADY IN USE:"
    echo "$LOGS" | grep -i "EADDRINUSE\|already in use" | tail -3
    echo ""
    echo "FIX: Another process is using port 3000"
    echo "Run: docker-compose down && docker-compose up -d"
    exit 1
fi

if echo "$LOGS" | grep -qi "Cannot find module\|MODULE_NOT_FOUND"; then
    echo "❌ MISSING NODE MODULE:"
    echo "$LOGS" | grep -i "Cannot find module\|MODULE_NOT_FOUND" | tail -5
    echo ""
    echo "FIX: Dependencies not installed properly"
    echo "Run: docker-compose down && docker-compose build --no-cache backend && docker-compose up -d"
    exit 1
fi

if echo "$LOGS" | grep -qi "SyntaxError\|ReferenceError\|TypeError"; then
    echo "❌ JAVASCRIPT ERROR:"
    echo "$LOGS" | grep -i "Error" | tail -10
    echo ""
    echo "FIX: Code syntax error - this shouldn't happen with latest code"
    echo "Run: git pull origin claude/recipe-app-backend-UoTAm && docker-compose down && docker-compose up -d"
    exit 1
fi

if echo "$LOGS" | grep -q "Server running on port"; then
    echo "✅ Backend started successfully!"
    echo ""
    echo "Testing health endpoint..."
    HEALTH=$(curl -s http://localhost:3000/health)
    if echo "$HEALTH" | grep -q "healthy"; then
        echo "✅ Health check passed: $HEALTH"
        echo ""
        echo "Backend is working! If you're still getting errors in the browser:"
        echo "1. Check Lightsail firewall allows port 3000"
        echo "2. Verify frontend is using correct IP: http://98.86.116.176:3000"
        echo "3. Clear browser cache and try again"
    else
        echo "❌ Health check failed"
        echo "Response: $HEALTH"
    fi
    exit 0
fi

# If we get here, show raw logs
echo "❌ UNKNOWN ERROR - Here are the last 50 lines of backend logs:"
echo ""
echo "$LOGS" | tail -50
echo ""
echo "---"
echo "Look for the error message above and share it if you need help"

