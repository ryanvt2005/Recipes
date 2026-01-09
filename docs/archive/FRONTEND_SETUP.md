# Frontend Setup Guide - Recipe Manager

Get the React frontend running in 5 minutes!

## 🚀 Quick Start (Local Development)

### Step 1: Install Dependencies

```bash
cd frontend
npm install
```

This installs all the necessary packages (React, Tailwind, etc.)

### Step 2: Configure Environment

```bash
# Create .env file
cp .env.example .env
```

Edit `.env` and set your backend URL:
```
VITE_API_URL=http://YOUR_BACKEND_IP:3000
```

**Examples:**
- Local backend: `http://localhost:3000`
- Lightsail backend: `http://54.123.45.67:3000` (use your actual IP)

### Step 3: Start Development Server

```bash
npm run dev
```

The app will be available at: **http://localhost:3001**

---

## ✅ Testing the Frontend

### 1. Register a New Account

1. Open http://localhost:3001
2. Click "Sign Up"
3. Fill in the form
4. You'll be redirected to your recipes page

### 2. Add a Recipe from URL

1. Click "Add Recipe" button
2. Paste a recipe URL, for example:
   - https://www.allrecipes.com/recipe/10813/best-chocolate-chip-cookies/
   - https://www.foodnetwork.com/recipes/alton-brown/perfect-pasta-recipe-1914526
3. Click "Extract Recipe"
4. Edit if needed, then click "Save"

### 3. Browse Your Recipes

- View all recipes in a grid
- Search by title or ingredients
- Click on a recipe to see full details

---

## 🐳 Deploy Frontend to AWS

### Option 1: Run Locally and Connect to Remote Backend

```bash
cd frontend

# Install dependencies
npm install

# Create .env with your Lightsail backend URL
echo "VITE_API_URL=http://YOUR_LIGHTSAIL_IP:3000" > .env

# Start dev server
npm run dev
```

Access at http://localhost:3001

### Option 2: Deploy Frontend to Lightsail (alongside backend)

**SSH into your Lightsail instance:**

```bash
# Navigate to the repo
cd ~/Recipes

# Pull latest code
git pull origin claude/recipe-app-backend-UoTAm

# Install frontend dependencies
cd frontend
npm install

# Build production version
npm run build

# Install serve to run the built app
npm install -g serve

# Run the frontend (in background)
nohup serve -s dist -l 3001 &

# Or use PM2 for better process management
npm install -g pm2
pm2 serve dist 3001 --name recipe-frontend --spa
pm2 save
pm2 startup
```

**Open port 3001 in Lightsail:**
1. Go to Lightsail console
2. Click your instance → Networking
3. Add rule: TCP port 3001

**Access:** http://YOUR_LIGHTSAIL_IP:3001

### Option 3: Use Docker

```bash
# Build Docker image
cd frontend
docker build -t recipe-frontend .

# Run container
docker run -d -p 3001:80 \
  -e VITE_API_URL=http://YOUR_LIGHTSAIL_IP:3000 \
  --name recipe-frontend \
  recipe-frontend

# Check it's running
docker ps
```

Access at: http://YOUR_LIGHTSAIL_IP:3001

---

## 🌐 Deploy to Vercel/Netlify (Recommended for Production)

### Deploy to Vercel

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Deploy:**
   ```bash
   cd frontend
   vercel
   ```

3. **Set Environment Variable:**
   - Go to Vercel dashboard → Your project → Settings → Environment Variables
   - Add: `VITE_API_URL` = `http://YOUR_LIGHTSAIL_IP:3000`
   - Redeploy

### Deploy to Netlify

1. **Install Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   ```

2. **Deploy:**
   ```bash
   cd frontend
   netlify deploy --prod
   ```

3. **Set Environment Variable:**
   - Go to Netlify dashboard → Site settings → Environment variables
   - Add: `VITE_API_URL` = `http://YOUR_LIGHTSAIL_IP:3000`
   - Trigger redeploy

---

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── Button.jsx       # Styled button component
│   │   ├── Input.jsx        # Form input component
│   │   ├── Layout.jsx       # Page layout with header/footer
│   │   ├── LoadingSpinner.jsx
│   │   └── ProtectedRoute.jsx  # Route guard for auth
│   │
│   ├── contexts/
│   │   └── AuthContext.jsx  # Authentication state management
│   │
│   ├── pages/               # Page components
│   │   ├── HomePage.jsx     # Landing page
│   │   ├── LoginPage.jsx    # Login form
│   │   ├── RegisterPage.jsx # Registration form
│   │   ├── RecipesPage.jsx  # Recipe list/grid
│   │   ├── RecipeDetailPage.jsx  # Single recipe view
│   │   └── AddRecipePage.jsx     # URL extraction & edit
│   │
│   ├── services/
│   │   └── api.js           # Axios API client
│   │
│   ├── App.jsx              # Main app with routing
│   ├── main.jsx             # React entry point
│   └── index.css            # Global styles + Tailwind
│
├── public/                  # Static assets
├── index.html               # HTML template
├── vite.config.js           # Vite build config
├── tailwind.config.js       # Tailwind CSS config
└── package.json             # Dependencies
```

---

## 🎨 Features Implemented

### ✅ User Authentication
- Registration with email/password
- Login with JWT tokens
- Protected routes
- User profile in header

### ✅ Recipe Management
- **Extract from URL**: AI-powered recipe extraction
- **Browse Recipes**: Grid view with search
- **Recipe Details**: Full recipe with ingredients & instructions
- **Edit Before Saving**: Modify extracted recipes
- **Delete Recipes**: Remove recipes from collection

### ✅ UI/UX
- Responsive design (mobile, tablet, desktop)
- Loading states
- Error handling
- Form validation
- Tailwind CSS styling

---

## 🔧 Development

### Available Scripts

```bash
# Start dev server (http://localhost:3001)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

### Adding New Features

**1. Add a new page:**
```jsx
// src/pages/MyNewPage.jsx
import Layout from '../components/Layout';

export default function MyNewPage() {
  return (
    <Layout>
      <h1>My New Page</h1>
    </Layout>
  );
}
```

**2. Add route in App.jsx:**
```jsx
import MyNewPage from './pages/MyNewPage';

// In Routes:
<Route path="/my-page" element={<MyNewPage />} />
```

**3. Add navigation link in Layout.jsx:**
```jsx
<Link to="/my-page">My Page</Link>
```

---

## 🐛 Troubleshooting

### Cannot connect to backend

**Problem:** API requests fail with network errors

**Solutions:**
1. Check `VITE_API_URL` in `.env`
2. Verify backend is running
3. Check CORS settings on backend
4. For Lightsail, ensure firewall allows port 3000

### Styles not loading

**Problem:** Page looks unstyled

**Solutions:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check Tailwind is imported
# src/index.css should have:
# @tailwind base;
# @tailwind components;
# @tailwind utilities;
```

### Recipe extraction fails

**Problem:** "Failed to extract recipe" error

**Solutions:**
1. Check backend has ANTHROPIC_API_KEY set
2. Try a different recipe URL
3. Check backend logs: `docker-compose logs backend`
4. Some sites may block scraping

### Build fails

**Problem:** `npm run build` errors

**Solutions:**
```bash
# Check Node.js version
node --version  # Should be 18+

# Clear cache and rebuild
rm -rf node_modules dist .vite
npm install
npm run build
```

---

## 🎯 Next Steps

Now that your frontend is running:

1. **Test recipe extraction** with various websites
2. **Add your favorite recipes**
3. **Provide feedback** on what works/doesn't work
4. **Customize styling** in Tailwind config
5. **Deploy to production** (Vercel/Netlify)

---

## 📊 Tech Stack Summary

| Technology | Purpose |
|------------|---------|
| **React 18** | UI framework |
| **Vite** | Build tool & dev server |
| **React Router** | Client-side routing |
| **Tailwind CSS** | Styling |
| **Axios** | HTTP client |
| **HeadlessUI** | Accessible UI components |
| **date-fns** | Date formatting |

---

## 💡 Tips for Providing Feedback

As you use the app, note:

1. **What works well?**
   - Is recipe extraction accurate?
   - Is the UI intuitive?
   - Are the features you need available?

2. **What's confusing?**
   - Any unclear buttons or flows?
   - Missing instructions?
   - Unexpected behavior?

3. **What's missing?**
   - Features you'd like to see
   - Better organization?
   - More filters/search options?

4. **Performance issues?**
   - Slow loading?
   - Unresponsive interactions?
   - Long waits for extraction?

Share your feedback and we'll improve the app together!

---

## 🎉 You're All Set!

Your Recipe Manager frontend is ready to use. Start by:

1. **Create an account** at http://localhost:3001
2. **Add your first recipe** by pasting a URL
3. **Browse your collection**
4. **Provide feedback** on what you'd like to see next!

Happy cooking! 👨‍🍳
