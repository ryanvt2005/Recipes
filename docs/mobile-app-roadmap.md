# Mobile App Roadmap

This document outlines the strategy for building a React Native mobile app that shares code with the existing web application.

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Recommended Stack](#recommended-stack)
3. [Code Reuse Strategy](#code-reuse-strategy)
4. [Monorepo Recommendation](#monorepo-recommendation)
5. [API Contract Readiness](#api-contract-readiness)
6. [Environment & Configuration](#environment--configuration)
7. [Authentication Strategy](#authentication-strategy)
8. [MVP Feature Set](#mvp-feature-set)
9. [Phased Implementation Plan](#phased-implementation-plan)
10. [Scaffold Branch Proposal](#scaffold-branch-proposal)

---

## Executive Summary

The Recipe App is well-positioned for mobile expansion. The recent extraction of core logic (`frontend/src/core/`) and centralized API modules (`frontend/src/api/`) provides a solid foundation for code sharing. This roadmap outlines a low-risk, incremental approach to building a React Native mobile app using Expo.

**Key Decisions:**
- Use Expo (managed workflow) for faster development and easier deployment
- Share core business logic, API patterns, and types between web and mobile
- Implement secure token storage using `expo-secure-store`
- Start with a minimal MVP focused on recipe viewing and shopping lists

---

## Recommended Stack

### Core Technologies

| Technology | Purpose | Rationale |
|------------|---------|-----------|
| **Expo SDK 52+** | React Native framework | Managed workflow simplifies builds, OTA updates, push notifications |
| **React Native 0.76+** | Mobile UI | Mature ecosystem, strong community |
| **React Navigation 7** | Navigation | Industry standard, native feel, deep linking support |
| **Zustand** | State management | Already used in web app, works in React Native |
| **Axios** | HTTP client | Already used in web app, works in React Native |
| **expo-secure-store** | Secure token storage | Native keychain/keystore integration |
| **React Query (TanStack)** | Data fetching/caching | Optional but recommended for offline support |

### Development Tools

| Tool | Purpose |
|------|---------|
| **Expo Go** | Development testing on physical devices |
| **EAS Build** | Cloud-based native builds for iOS/Android |
| **EAS Submit** | App store submission automation |
| **TypeScript** | Type safety (optional but recommended) |

---

## Code Reuse Strategy

### Currently Shareable Modules

The following modules are already framework-agnostic and can be used directly in React Native:

#### 1. Core Logic (`frontend/src/core/`)

```
frontend/src/core/
├── index.js          # Barrel exports
├── ingredients.js    # Quantity parsing, unit normalization, formatting
├── categories.js     # Ingredient categorization, category lists
└── shoppingList.js   # Consolidation, merging, scaling, filtering
```

**Functions available:**
- `parseQuantity()`, `normalizeUnit()`, `formatQuantityWithUnit()`
- `categorizeIngredient()`, `getCategoryList()`, `groupByCategory()`
- `consolidateIngredients()`, `mergeIntoShoppingList()`, `scaleIngredients()`
- `calculateScaleFactor()`, `parseServings()`, `sortByCategory()`

These functions have no React or DOM dependencies and are fully portable.

#### 2. API Module Patterns (`frontend/src/api/`)

The API module structure is reusable with minor modifications:

```
frontend/src/api/
├── index.js      # Barrel exports
├── http.js       # Axios instance (needs mobile adaptation)
├── auth.js       # Auth endpoints
├── recipes.js    # Recipe endpoints
└── shopping.js   # Shopping list endpoints
```

**Adaptation needed:**
- Replace `localStorage` with `expo-secure-store`
- Replace `import.meta.env` with `expo-constants` or `react-native-config`

### Modules Requiring Adaptation

| Module | Web Implementation | Mobile Adaptation |
|--------|-------------------|-------------------|
| **Token Storage** | `localStorage` | `expo-secure-store` |
| **Environment Config** | `import.meta.env` (Vite) | `expo-constants` or `app.config.js` |
| **Navigation** | React Router | React Navigation |
| **UI Components** | HTML/Tailwind | React Native components |

### Recommended Shared Package Structure

For a monorepo setup, extract shared code into packages:

```
packages/
├── core/           # From frontend/src/core/
│   ├── ingredients.js
│   ├── categories.js
│   ├── shoppingList.js
│   └── index.js
│
├── api/            # Adapted from frontend/src/api/
│   ├── types.js    # Shared type definitions
│   ├── endpoints.js # Endpoint path constants
│   ├── auth.js     # Auth API calls
│   ├── recipes.js  # Recipe API calls
│   └── shopping.js # Shopping API calls
│
└── schemas/        # Optional: shared validation
    ├── recipe.js
    └── user.js
```

---

## Monorepo Recommendation

### Proposed Structure

```
recipe-app/
├── apps/
│   ├── web/                  # Current frontend (React + Vite)
│   │   ├── src/
│   │   ├── package.json
│   │   └── vite.config.js
│   │
│   └── mobile/               # New Expo app
│       ├── app/              # Expo Router app directory
│       ├── components/
│       ├── app.json
│       └── package.json
│
├── packages/
│   ├── core/                 # Shared business logic
│   │   ├── src/
│   │   └── package.json
│   │
│   ├── api/                  # Shared API client
│   │   ├── src/
│   │   └── package.json
│   │
│   └── tsconfig/             # Shared TypeScript config
│       └── base.json
│
├── backend/                  # Existing backend (unchanged)
│
├── package.json              # Root workspace config
├── pnpm-workspace.yaml       # or npm/yarn workspaces
└── turbo.json                # Optional: Turborepo config
```

### Pros and Cons

**Pros:**
- Single source of truth for shared code
- Easier to maintain consistency across platforms
- Shared CI/CD pipeline
- Atomic commits across packages
- Better developer experience with cross-package TypeScript

**Cons:**
- Initial migration effort
- Slightly more complex build configuration
- Larger repository size
- Learning curve for monorepo tooling

### Migration Steps (Future)

1. **Phase 1: Prepare packages**
   - Create `packages/core/` from `frontend/src/core/`
   - Create `packages/api/` with platform-agnostic types and endpoints
   - Add workspace configuration

2. **Phase 2: Update web app**
   - Move `apps/web/` or update imports to use packages
   - Verify all tests pass
   - Deploy and validate

3. **Phase 3: Add mobile app**
   - Create `apps/mobile/` with Expo
   - Import from shared packages
   - Implement mobile-specific UI

### Recommended Tooling

| Tool | Purpose |
|------|---------|
| **pnpm** or **npm workspaces** | Package management |
| **Turborepo** (optional) | Build orchestration, caching |
| **changesets** (optional) | Version management |

---

## API Contract Readiness

### Current Status: Ready

The backend API is well-prepared for mobile consumption:

#### Error Response Format

All endpoints return consistent error responses (implemented in Issue #20):

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable description"
}
```

**Available error codes:**
- `BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`
- `VALIDATION_ERROR`, `CONFLICT`, `INTERNAL_SERVER_ERROR`
- Domain-specific: `INVALID_CREDENTIALS`, `USER_EXISTS`, `EXTRACTION_ERROR`, etc.

#### Authentication

- JWT-based authentication (stateless, mobile-friendly)
- Token included in `Authorization: Bearer <token>` header
- CORS configured to accept `Authorization` header

#### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/auth/login` | POST | User login, returns JWT |
| `/api/v1/auth/register` | POST | User registration |
| `/api/v1/auth/me` | GET | Get current user |
| `/api/v1/recipes` | GET/POST | List/create recipes |
| `/api/v1/recipes/:id` | GET/PUT/DELETE | Recipe CRUD |
| `/api/v1/recipes/extract` | POST | Extract recipe from URL |
| `/api/v1/shopping-lists` | GET/POST | List/create shopping lists |
| `/api/v1/shopping-lists/:id` | GET/DELETE | Shopping list operations |
| `/api/v1/shopping-lists/:id/items` | POST | Add items |
| `/api/v1/shopping-lists/items/:id` | PATCH | Update item |

### Recommended Improvements (Not Blocking)

1. **Pagination** - Currently not implemented. Recommend adding for recipe list:
   ```
   GET /api/v1/recipes?page=1&limit=20
   ```

2. **Refresh Tokens** - Consider adding for better mobile UX (optional):
   ```
   POST /api/v1/auth/refresh
   ```

3. **API Versioning** - Already using `/api/v1/`, which is good

---

## Environment & Configuration

### Web (Current)

```env
# .env
VITE_API_URL=http://localhost:3000
```

Accessed via `import.meta.env.VITE_API_URL`

### Mobile (Proposed)

**Option 1: Expo Constants (Recommended)**

```javascript
// app.config.js
export default {
  expo: {
    name: "Recipe App",
    extra: {
      apiUrl: process.env.API_URL || "http://localhost:3000",
    },
  },
};

// Usage
import Constants from 'expo-constants';
const API_URL = Constants.expoConfig.extra.apiUrl;
```

**Option 2: Environment-based switching**

```javascript
// config.js
const ENV = {
  development: {
    apiUrl: 'http://localhost:3000',
  },
  staging: {
    apiUrl: 'https://staging-api.example.com',
  },
  production: {
    apiUrl: 'https://api.example.com',
  },
};

export default ENV[process.env.APP_ENV || 'development'];
```

### Shared Configuration

Create a platform-agnostic config module:

```javascript
// packages/api/config.js
export const createConfig = (apiUrl) => ({
  apiUrl,
  apiVersion: 'v1',
  timeout: 30000,
});
```

---

## Authentication Strategy

### Token Storage

| Platform | Storage | Security |
|----------|---------|----------|
| Web | `localStorage` | Vulnerable to XSS |
| iOS | Keychain (via `expo-secure-store`) | Hardware-backed encryption |
| Android | Keystore (via `expo-secure-store`) | Hardware-backed encryption |

### Implementation

```javascript
// packages/api/storage.js (platform-specific)

// Web version
export const secureStorage = {
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
  removeItem: (key) => localStorage.removeItem(key),
};

// Mobile version
import * as SecureStore from 'expo-secure-store';

export const secureStorage = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};
```

### Auth Flow

1. User enters credentials
2. POST to `/api/v1/auth/login`
3. Receive JWT token
4. Store token securely (`expo-secure-store`)
5. Attach token to subsequent requests via interceptor
6. On 401 response, clear token and redirect to login

### Token Refresh (Future Enhancement)

If implementing refresh tokens:

```javascript
// Interceptor pseudo-code
http.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      const newToken = await refreshToken();
      error.config.headers.Authorization = `Bearer ${newToken}`;
      return http(error.config);
    }
    return Promise.reject(error);
  }
);
```

---

## MVP Feature Set

### Phase 1: Core MVP

| Feature | Priority | Description |
|---------|----------|-------------|
| Login/Logout | P0 | Secure authentication with token storage |
| Recipe List | P0 | View all recipes with search/filter |
| Recipe Detail | P0 | View recipe with ingredients, instructions, notes |
| Shopping List View | P0 | View shopping lists with items |
| Shopping List Checklist | P0 | Check off items while shopping |

### Phase 2: Enhanced Functionality

| Feature | Priority | Description |
|---------|----------|-------------|
| Add Recipe (URL import) | P1 | Import recipes from URLs |
| Create Shopping List | P1 | Create new lists from recipes |
| Recipe Scaling | P1 | Adjust servings |
| Offline Mode | P2 | Cache recipes for offline viewing |
| Push Notifications | P2 | Shopping reminders |

### Phase 3: Advanced Features

| Feature | Priority | Description |
|---------|----------|-------------|
| Barcode Scanning | P3 | Scan products to check off items |
| Voice Input | P3 | Add items via voice |
| Share Recipes | P3 | Share with other users |
| Meal Planning | P3 | Plan weekly meals |

---

## Phased Implementation Plan

### Phase 0: Preparation (This Issue)
- [x] Extract core logic to `frontend/src/core/`
- [x] Centralize API modules in `frontend/src/api/`
- [x] Standardize error responses
- [x] Document roadmap (this file)

### Phase 1: Scaffold & Auth (1-2 weeks)
1. Create Expo project
2. Set up navigation structure
3. Implement secure token storage
4. Build login/logout screens
5. Create HTTP client with auth interceptor

### Phase 2: Recipe Features (2-3 weeks)
1. Recipe list screen with pull-to-refresh
2. Recipe detail screen
3. Search and filter functionality
4. Recipe scaling UI

### Phase 3: Shopping Lists (2-3 weeks)
1. Shopping list overview
2. List detail with categorized items
3. Item check-off functionality
4. Category grouping (using core module)

### Phase 4: Polish & Release (1-2 weeks)
1. Loading states and error handling
2. App icons and splash screen
3. App store metadata
4. TestFlight/Internal testing
5. Production release

---

## Scaffold Branch Proposal

### Safe Approach

Create a new branch that adds the Expo app without affecting the existing web deployment:

```bash
# Create feature branch from develop
git checkout develop
git checkout -b feature/mobile-app-scaffold

# Initialize Expo in a new directory
npx create-expo-app apps/mobile --template expo-template-blank-typescript

# Or for Expo Router (recommended)
npx create-expo-app apps/mobile --template expo-template-tabs
```

### Directory Structure

```
apps/mobile/
├── app/                    # Expo Router app directory
│   ├── (auth)/            # Auth group (login, register)
│   ├── (tabs)/            # Main tab navigation
│   │   ├── recipes/       # Recipe screens
│   │   ├── shopping/      # Shopping screens
│   │   └── profile/       # User profile
│   ├── _layout.tsx        # Root layout
│   └── index.tsx          # Entry point
├── components/            # Shared components
├── hooks/                 # Custom hooks
├── services/              # API services (adapted)
├── app.json              # Expo config
├── package.json
└── tsconfig.json
```

### Future Commands (Not Executed Now)

```bash
# Install dependencies
cd apps/mobile
npm install

# Development
npx expo start

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android

# Submit to App Store
eas submit --platform ios

# Submit to Play Store
eas submit --platform android
```

### CI/CD Considerations

Add mobile-specific workflows:

```yaml
# .github/workflows/mobile-build.yml (future)
name: Mobile Build
on:
  push:
    paths:
      - 'apps/mobile/**'
      - 'packages/**'
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: expo/expo-github-action@v8
      - run: npm install
      - run: eas build --platform all --non-interactive
```

### Deployment Independence

The mobile app will be completely independent from web deployments:
- Separate build process (EAS Build)
- Separate release cycle (App Store/Play Store)
- Shared API backend (no changes needed)
- Shared packages (via npm/yarn workspace)

---

## Appendix: Quick Reference

### Useful Links

- [Expo Documentation](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/)
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [expo-secure-store](https://docs.expo.dev/versions/latest/sdk/securestore/)

### Command Cheat Sheet (Future)

```bash
# Start development server
npx expo start

# Run on iOS simulator
npx expo run:ios

# Run on Android emulator
npx expo run:android

# Create development build
eas build --profile development --platform ios

# Create production build
eas build --profile production --platform all

# Update OTA (over-the-air)
eas update --branch production
```

---

*Document created: January 2026*
*Last updated: January 2026*
