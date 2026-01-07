# Recipe Manager Frontend

React-based frontend for the Recipe Management Application.

## Features

- User authentication (login/register)
- Recipe extraction from URLs using AI
- Browse and search recipes
- View detailed recipe pages with ingredients and instructions
- Responsive design with Tailwind CSS

## Tech Stack

- React 18+
- Vite (build tool)
- React Router v6 (routing)
- Tailwind CSS (styling)
- Axios (API client)
- Zustand (state management)
- HeadlessUI (UI components)

## Quick Start

### Prerequisites

- Node.js 18+ installed
- Backend API running (see backend/README.md)

### Installation

```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env and set your backend URL
# VITE_API_URL=http://localhost:3000
```

### Development

```bash
# Start development server
npm run dev

# App will be available at http://localhost:3001
```

### Build for Production

```bash
# Build optimized production bundle
npm run build

# Preview production build
npm run preview
```

## Environment Variables

Create a `.env` file in the frontend directory:

```
VITE_API_URL=http://localhost:3000
```

For production, update this to your deployed backend URL.

## Project Structure

```
frontend/
├── src/
│   ├── components/      # Reusable UI components
│   │   ├── Button.jsx
│   │   ├── Input.jsx
│   │   ├── Layout.jsx
│   │   └── LoadingSpinner.jsx
│   ├── contexts/        # React contexts
│   │   └── AuthContext.jsx
│   ├── pages/           # Page components
│   │   ├── HomePage.jsx
│   │   ├── LoginPage.jsx
│   │   ├── RegisterPage.jsx
│   │   ├── RecipesPage.jsx
│   │   ├── RecipeDetailPage.jsx
│   │   └── AddRecipePage.jsx
│   ├── services/        # API services
│   │   └── api.js
│   ├── App.jsx          # Main app component
│   ├── main.jsx         # Entry point
│   └── index.css        # Global styles
├── public/              # Static assets
├── index.html           # HTML template
├── vite.config.js       # Vite configuration
├── tailwind.config.js   # Tailwind configuration
└── package.json         # Dependencies
```

## Available Scripts

- `npm run dev` - Start development server on port 3001
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally

## Features Overview

### Authentication

- JWT-based authentication
- Login and registration forms
- Protected routes
- Automatic token refresh

### Recipe Management

- **Extract from URL**: Paste any recipe URL to automatically extract data
- **Browse Recipes**: Grid view with search and filtering
- **Recipe Details**: Full recipe view with ingredients and instructions
- **Edit Recipes**: Modify extracted recipes before saving

### User Experience

- Responsive design (mobile, tablet, desktop)
- Loading states and error handling
- Optimistic UI updates
- Accessible components

## API Integration

The frontend connects to the backend API at the URL specified in `.env`:

- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/recipes/extract` - Extract recipe from URL
- `POST /api/v1/recipes` - Save recipe
- `GET /api/v1/recipes` - Get all recipes
- `GET /api/v1/recipes/:id` - Get single recipe
- `DELETE /api/v1/recipes/:id` - Delete recipe

## Deployment

### Deploy with Docker

```bash
# Build Docker image
docker build -t recipe-app-frontend .

# Run container
docker run -p 80:80 -e VITE_API_URL=http://your-api-url recipe-app-frontend
```

### Deploy to Vercel/Netlify

1. Connect your GitHub repository
2. Set environment variable: `VITE_API_URL`
3. Deploy automatically on push

## Development Tips

### Adding New Pages

1. Create page component in `src/pages/`
2. Add route in `src/App.jsx`
3. Add navigation link in `src/components/Layout.jsx`

### Styling

- Use Tailwind utility classes
- Custom components in `src/index.css` under `@layer components`
- Follow mobile-first responsive design

### State Management

- Authentication state in `AuthContext`
- For global state, use Zustand (already installed)
- Local component state with `useState`

## Troubleshooting

### Cannot connect to API

- Check `VITE_API_URL` in `.env`
- Verify backend is running
- Check CORS settings on backend

### Build fails

- Delete `node_modules` and `package-lock.json`
- Run `npm install` again
- Check Node.js version (need 18+)

### Styles not loading

- Check Tailwind config
- Ensure `index.css` imports Tailwind
- Run `npm install` to get PostCSS

## License

ISC
