# Recipe Management Application

A full-stack web application for saving, organizing, and planning meals from recipes across the web. Features intelligent recipe extraction using a hybrid schema.org + LLM approach.

## Features

- **Smart Recipe Extraction**: Automatically extract recipes from any URL using schema.org markup or Claude AI as fallback
- **Recipe Management**: Save, edit, delete, and search your recipe collection
- **Meal Planning**: Plan weekly meals with a calendar interface (coming soon)
- **Shopping Lists**: Generate consolidated grocery lists from meal plans (coming soon)
- **User Authentication**: Secure JWT-based authentication system

## Tech Stack

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Database**: PostgreSQL 15+
- **AI**: Anthropic Claude API (Sonnet 4)
- **Authentication**: JWT with bcrypt
- **Validation**: Joi

### Frontend (Coming Soon)
- React 18+
- Tailwind CSS
- React Router

## Getting Started

### Prerequisites

- Node.js 20 or higher
- PostgreSQL 15 or higher
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

## Development

### Running tests
```bash
cd backend
npm test
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
- [ ] Meal planning endpoints
- [ ] Shopping list generation
- [ ] Frontend React application
- [ ] Drag-and-drop meal planning UI
- [ ] Mobile apps (iOS/Android)
- [ ] Recipe import from PDF
- [ ] Nutritional information

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

ISC

## Support

For issues and questions, please open an issue on GitHub.
