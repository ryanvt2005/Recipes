# Recipe Management Application

[![CI/CD Pipeline](https://github.com/ryanvt2005/Recipes/actions/workflows/main.yml/badge.svg)](https://github.com/ryanvt2005/Recipes/actions/workflows/main.yml)

A full-stack web application for saving, organizing, and planning meals from recipes across the web. Features intelligent recipe extraction using a hybrid schema.org + LLM approach.

## Features

- **Smart Recipe Extraction**: Automatically extract recipes from any URL using schema.org markup or Claude AI as fallback
- **Manual Recipe Entry**: Add your own recipes with a user-friendly form
- **Recipe Management**: Save, edit, delete, and search your recipe collection
- **Shopping Lists**: Generate and manage consolidated grocery lists from recipes
- **User Authentication**: Secure JWT-based authentication system

## Tech Stack

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Database**: PostgreSQL 15+
- **AI**: Anthropic Claude API (Sonnet 4)
- **Authentication**: JWT with bcrypt
- **Validation**: Joi

### Frontend
- **Framework**: React 18+
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router
- **State Management**: Zustand
- **Forms**: React Hook Form
- **UI Components**: Headless UI

## Getting Started

### Quick Start with Docker (Recommended)

The fastest way to get started:

```bash
# Clone the repository
git clone <repository-url>
cd Recipes

# Copy environment file and configure
cp .env.example .env
# Edit .env with your API keys

# Start everything with Docker Compose
docker-compose up -d

# Run database migrations
docker-compose exec backend npm run migrate

# Access the application
# Frontend: http://localhost:3001
# Backend API: http://localhost:3000
```

### Prerequisites

- Docker and Docker Compose (recommended)
- OR Node.js 20+ and PostgreSQL 15+ (for manual setup)
- Anthropic API key ([Get one here](https://console.anthropic.com/))

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Recipes
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your configuration:
   - `DB_PASSWORD`: Your PostgreSQL password
   - `JWT_SECRET`: A random 32+ character string for JWT signing
   - `ANTHROPIC_API_KEY`: Your Anthropic API key

3. **Start with Docker Compose (Recommended)**
   ```bash
   docker-compose up -d
   ```

   This will start:
   - PostgreSQL database on port 5432
   - Backend API on port 3000

4. **Run database migrations**
   ```bash
   docker-compose exec backend npm run migrate
   ```

5. **Verify installation**
   ```bash
   curl http://localhost:3000/health
   ```

   You should see: `{"status":"healthy","timestamp":"...","uptime":...}`

### Manual Setup (Without Docker)

1. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Set up PostgreSQL database**
   ```bash
   createdb recipeapp
   createuser recipeuser
   ```

3. **Configure backend environment**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials and API keys
   ```

4. **Run database migrations**
   ```bash
   npm run migrate
   ```

5. **Start the backend server**
   ```bash
   npm run dev
   ```

## API Documentation

### Authentication Endpoints

#### Register a new user
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

### Recipe Endpoints

#### Extract recipe from URL
```http
POST /api/v1/recipes/extract
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "url": "https://example.com/recipe/chocolate-chip-cookies"
}
```

#### Save a recipe
```http
POST /api/v1/recipes
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "title": "Chocolate Chip Cookies",
  "description": "Crispy and delicious cookies",
  "ingredients": [
    {
      "rawText": "2 cups flour",
      "quantity": 2,
      "unit": "cups",
      "ingredient": "flour"
    }
  ],
  "instructions": [
    "Preheat oven to 350°F",
    "Mix ingredients",
    "Bake for 12 minutes"
  ],
  "tags": ["dessert", "cookies"]
}
```

#### Get all recipes
```http
GET /api/v1/recipes?page=1&limit=20&search=cookies&sortBy=createdAt&sortOrder=desc
Authorization: Bearer <your-jwt-token>
```

#### Get a single recipe
```http
GET /api/v1/recipes/:id
Authorization: Bearer <your-jwt-token>
```

#### Update a recipe
```http
PUT /api/v1/recipes/:id
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "title": "Updated Recipe Title",
  "ingredients": [...],
  "instructions": [...]
}
```

#### Delete a recipe
```http
DELETE /api/v1/recipes/:id
Authorization: Bearer <your-jwt-token>
```

## Recipe Extraction

The application uses a hybrid approach for extracting recipes:

1. **Schema.org Detection**: First, it attempts to extract recipe data from structured schema.org JSON-LD markup
2. **LLM Fallback**: If schema.org data is incomplete or missing, it falls back to Claude AI for intelligent extraction
3. **Caching**: Extracted recipes are cached for 30 days to reduce API costs and improve performance

### Supported Recipe Sites

The extraction works best with sites that implement schema.org Recipe markup:
- AllRecipes.com
- Food Network
- Bon Appétit
- Serious Eats
- NYT Cooking
- Most food blogs

For sites without structured data, the LLM fallback provides intelligent extraction.

## Database Schema

The application uses PostgreSQL with the following main tables:

- `users`: User accounts
- `recipes`: Recipe metadata
- `ingredients`: Recipe ingredients with structured data
- `instructions`: Step-by-step cooking instructions
- `tags`: Recipe tags for categorization
- `recipe_tags`: Many-to-many relationship between recipes and tags
- `meal_plans`: Weekly meal planning (coming soon)
- `shopping_lists`: Generated grocery lists (coming soon)

## Documentation

- [Development Guide](docs/DEVELOPMENT.md) - Setup, architecture, and contributing
- [Deployment Guide](docs/DEPLOYMENT.md) - Deployment instructions for all environments

## Development

### Quick Development Setup

```bash
# Start with hot-reload enabled
./start-dev.sh

# Or manually
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

### Code Quality

```bash
# Backend linting and formatting
cd backend
npm run lint
npm run format

# Frontend linting and formatting
cd frontend
npm run lint
npm run format
```

### Running Tests

```bash
cd backend
npm test              # Run all tests
npm run test:watch   # Run in watch mode
```

### Project Structure
```
Recipes/
├── backend/
│   ├── src/
│   │   ├── config/          # Database, logger configuration
│   │   ├── controllers/     # Request handlers
│   │   ├── middlewares/     # Auth, validation middleware
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic (recipe extraction)
│   │   ├── utils/           # Validation schemas, helpers
│   │   └── index.js         # Express app entry point
│   ├── tests/               # Test files
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── README.md
```

## Security

- Passwords are hashed using bcrypt with cost factor 12
- JWT tokens expire after 7 days
- Rate limiting on extraction endpoint (10 requests per 15 minutes)
- Input validation using Joi schemas
- Helmet.js for security headers
- CORS configured for specific origins

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DB_HOST` | PostgreSQL host | Yes | localhost |
| `DB_PORT` | PostgreSQL port | Yes | 5432 |
| `DB_NAME` | Database name | Yes | recipeapp |
| `DB_USER` | Database user | Yes | recipeuser |
| `DB_PASSWORD` | Database password | Yes | - |
| `JWT_SECRET` | Secret for JWT signing (min 32 chars) | Yes | - |
| `ANTHROPIC_API_KEY` | Anthropic API key | Yes | - |
| `NODE_ENV` | Environment (development/production) | No | development |
| `PORT` | Server port | No | 3000 |
| `FRONTEND_URL` | Frontend URL for CORS | No | http://localhost:3001 |

## Troubleshooting

### Database connection errors
- Ensure PostgreSQL is running: `docker-compose ps`
- Check database credentials in `.env`
- Verify database exists: `docker-compose exec db psql -U recipeuser -d recipeapp`

### Recipe extraction fails
- Verify `ANTHROPIC_API_KEY` is set correctly
- Check API rate limits on your Anthropic account
- Some websites may block scraping attempts

### Authentication errors
- Ensure `JWT_SECRET` is set and at least 32 characters long
- Check token is included in Authorization header: `Bearer <token>`

## Roadmap

- [x] Backend API with authentication
- [x] Recipe extraction (schema.org + LLM)
- [x] Recipe CRUD operations
- [x] Manual recipe entry
- [x] Shopping list generation and management
- [x] Frontend React application
- [x] Ingredient consolidation in shopping lists
- [ ] Meal planning calendar
- [ ] Recipe sharing and collaboration
- [ ] Mobile apps (iOS/Android)
- [ ] Recipe import from PDF
- [ ] Nutritional information
- [ ] Recipe collections and folders

## Documentation

- **[CI/CD Pipeline](docs/CICD.md)** - Detailed CI/CD workflow documentation
- **[DevOps Quick Reference](docs/DEVOPS_QUICK_REFERENCE.md)** - Common commands and procedures

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and linting
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## License

ISC

## Support

For issues and questions, please open an issue on GitHub.
