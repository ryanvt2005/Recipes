@echo off
REM Script to start the full local development stack on Windows

echo 🚀 Starting Recipe App - Local Development Stack
echo ================================================
echo.

REM Check if we're in the right directory
if not exist "docker-compose.yml" (
    echo ❌ Error: docker-compose.yml not found.
    echo    Please run this script from the Recipes directory.
    exit /b 1
)

REM Check if .env file exists
if not exist ".env" (
    echo ⚠️  .env file not found!
    echo.
    echo Creating .env from .env.example...
    copy .env.example .env
    echo.
    echo ⚠️  IMPORTANT: Edit .env and set your values:
    echo    - JWT_SECRET (run: openssl rand -hex 32 in Git Bash)
    echo    - ANTHROPIC_API_KEY (your API key)
    echo.
    echo After editing .env, run this script again.
    exit /b 1
)

REM Check if frontend .env.local exists
if not exist "frontend\.env.local" (
    echo 📝 Creating frontend\.env.local...
    copy frontend\.env.local.example frontend\.env.local
    echo ✅ Created frontend\.env.local
    echo.
)

REM Check if frontend dependencies are installed
if not exist "frontend\node_modules" (
    echo 📦 Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
    echo ✅ Frontend dependencies installed
    echo.
)

REM Start backend and database
echo 🐳 Starting backend and database...
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

echo.
echo ⏳ Waiting for services to start (15 seconds)...
timeout /t 15 /nobreak > nul

REM Check if backend is healthy
echo.
echo 🏥 Checking backend health...
curl -s http://localhost:3000/health > health.tmp 2>&1
findstr /C:"healthy" health.tmp > nul
if %errorlevel% equ 0 (
    echo ✅ Backend is healthy!
) else (
    echo ⚠️  Backend might not be ready yet. Checking logs...
    docker-compose logs --tail=20 backend
    echo.
    echo If you see errors above, fix them and run: docker-compose restart backend
)
del health.tmp > nul 2>&1

echo.
echo ==========================================
echo ✅ Backend Started!
echo ==========================================
echo.
echo Backend API: http://localhost:3000
echo Health Check: http://localhost:3000/health
echo.
echo 📋 View backend logs:
echo    docker-compose logs -f backend
echo.
echo 🗄️  Access database:
echo    docker-compose exec db psql -U recipeuser -d recipeapp
echo.
echo ----------------------------------------
echo.
echo 🎨 Now start the frontend in a NEW terminal:
echo.
echo    cd %CD%\frontend
echo    npm run dev
echo.
echo Then open: http://localhost:3001
echo.
echo ----------------------------------------
echo.
echo To stop the backend:
echo    docker-compose down
echo.
