# Quick Start Guide

Get your Recipe Management App running in under 5 minutes!

## Prerequisites

- Docker and Docker Compose installed
- Anthropic API key ([get one here](https://console.anthropic.com/))

## Setup (3 steps)

### 1. Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and add your API key
# You only need to change:
# - ANTHROPIC_API_KEY=your-actual-api-key
# - JWT_SECRET=any-random-32+-character-string
```

### 2. Start Everything

```bash
# Start all services (database, backend, frontend)
docker-compose up -d

# Wait for services to start (about 10 seconds)
sleep 10

# Run database migrations
docker-compose exec backend npm run migrate
```

### 3. Open Your Browser

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health

## That's it! 🎉

You can now:
1. Register a new account
2. Extract recipes from URLs
3. Manually add your own recipes
4. Create shopping lists

## Development Mode (Hot Reload)

For development with auto-reload on code changes:

```bash
./start-dev.sh
```

## Common Commands

```bash
# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Restart services
docker-compose restart

# Stop everything
docker-compose down

# Stop and remove data (fresh start)
docker-compose down -v
```

## Need Help?

- **Development**: See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)
- **Deployment**: See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- **Full README**: See [README.md](README.md)

## Troubleshooting

### Backend won't start?

```bash
# Check logs
docker-compose logs backend

# Common fix: rebuild
docker-compose up -d --build
```

### Can't connect to database?

```bash
# Verify database is running
docker-compose ps

# Check database logs
docker-compose logs db
```

### Port already in use?

Edit `docker-compose.yml` to change ports:
- Backend: Change `3000:3000` to `3001:3000`
- Frontend: Change `3001:80` to `3002:80`

## First Recipe

Try extracting a recipe:

```bash
curl -X POST http://localhost:3000/api/v1/recipes/extract \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.allrecipes.com/recipe/10813/best-chocolate-chip-cookies/"}'
```

(Get your JWT token by registering/logging in through the frontend)
