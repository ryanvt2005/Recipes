# Development Guide

This guide covers setting up and working with the Recipe Management Application codebase.

## Table of Contents

- [Getting Started](#getting-started)
- [Architecture](#architecture)
- [Code Quality](#code-quality)
- [Testing](#testing)
- [Contributing](#contributing)

## Getting Started

### Prerequisites

- Node.js 20+
- Docker and Docker Compose
- Git
- Code editor (VS Code recommended)

### Setup

1. Clone and install:
```bash
git clone <repository-url>
cd Recipes

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

2. Set up environment:
```bash
cp .env.example .env
# Edit .env with your local configuration
```

3. Start development environment:
```bash
./start-dev.sh
```

## Architecture

### Backend (Node.js/Express)

```
backend/
├── src/
│   ├── config/          # Configuration and database
│   │   ├── database.js
│   │   └── migrations/  # Database migrations
│   ├── middleware/      # Express middleware
│   │   ├── auth.js      # JWT authentication
│   │   └── validators/  # Request validation
│   ├── routes/          # API routes
│   │   ├── auth.js
│   │   ├── recipes.js
│   │   └── shopping-lists.js
│   ├── services/        # Business logic
│   └── index.js         # Application entry point
├── package.json
└── Dockerfile
```

### Frontend (React/Vite)

```
frontend/
├── src/
│   ├── components/      # React components
│   ├── pages/          # Page components
│   ├── services/       # API client
│   ├── store/          # Zustand state management
│   ├── utils/          # Utility functions
│   ├── App.jsx
│   └── main.jsx
├── package.json
└── Dockerfile
```

## Code Quality

### Linting

Run ESLint to check code quality:

```bash
# Backend
cd backend
npm run lint
npm run lint:fix  # Auto-fix issues

# Frontend
cd frontend
npm run lint
npm run lint:fix
```

### Formatting

Use Prettier for consistent code formatting:

```bash
# Backend
cd backend
npm run format:check
npm run format  # Auto-format

# Frontend
cd frontend
npm run format:check
npm run format
```

### Pre-commit Checks

Before committing, run:

```bash
# Backend
cd backend
npm run lint && npm run format:check && npm test

# Frontend
cd frontend
npm run lint && npm run format:check && npm run build
```

## Testing

### Backend Tests

```bash
cd backend

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage
```

### Writing Tests

Place test files next to the code they test with `.test.js` extension:

```javascript
// src/services/recipes.test.js
const { getRecipes } = require('./recipes');

describe('Recipe Service', () => {
  it('should fetch recipes', async () => {
    // Test implementation
  });
});
```

## Database

### Running Migrations

```bash
# With Docker
docker-compose exec backend npm run migrate

# Without Docker
cd backend
npm run migrate
```

### Creating Migrations

Add new migration files in `backend/src/config/migrations/`:

```javascript
// backend/src/config/migrations/003_add_new_table.js
module.exports = {
  async up(db) {
    await db.query(`
      CREATE TABLE new_table (
        id SERIAL PRIMARY KEY,
        -- columns
      );
    `);
  },

  async down(db) {
    await db.query('DROP TABLE IF EXISTS new_table;');
  }
};
```

## API Development

### Adding New Endpoints

1. Create route file in `backend/src/routes/`
2. Add validation middleware
3. Implement service logic in `backend/src/services/`
4. Add tests
5. Update API documentation

Example:

```javascript
// routes/example.js
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');

router.get('/example', authenticate, async (req, res) => {
  try {
    // Implementation
    res.json({ data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

## Frontend Development

### Component Structure

Follow this pattern for components:

```jsx
// components/MyComponent.jsx
import { useState } from 'react';

export function MyComponent({ prop1, prop2 }) {
  const [state, setState] = useState(null);

  return (
    <div className="container">
      {/* Component JSX */}
    </div>
  );
}
```

### State Management

Use Zustand for global state:

```javascript
// store/useStore.js
import { create } from 'zustand';

export const useStore = create((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));
```

### API Calls

Use the centralized API client:

```javascript
// services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
});

export const getRecipes = () => api.get('/recipes');
```

## Debugging

### Backend Debugging

Add breakpoints and use:

```bash
cd backend
node --inspect src/index.js
```

### Frontend Debugging

Use React DevTools browser extension and console logging.

### Docker Debugging

View logs:
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

Execute commands in containers:
```bash
docker-compose exec backend sh
docker-compose exec db psql -U recipeuser recipeapp
```

## Contributing

1. Create a feature branch from `develop`
2. Make your changes
3. Run linting and tests
4. Commit with clear messages
5. Push and create a pull request
6. Wait for CI/CD checks to pass

### Commit Message Format

```
type: brief description

Longer explanation if needed

- Bullet points for details
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## Environment Variables

See `.env.example` for required variables:

- `DB_*` - Database configuration
- `JWT_SECRET` - Authentication secret
- `ANTHROPIC_API_KEY` - AI service key
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port
- `FRONTEND_URL` - Frontend URL for CORS

## Useful Commands

```bash
# Start development with hot reload
./start-dev.sh

# Rebuild containers
docker-compose up --build

# Stop all containers
docker-compose down

# View container status
docker-compose ps

# Clean up volumes (WARNING: deletes data)
docker-compose down -v
```
