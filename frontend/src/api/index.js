/**
 * Centralized API exports
 *
 * This module provides a clean interface for all API services.
 * Import individual services or use the legacy api exports.
 *
 * Usage:
 *   import { authApi, recipesApi, shoppingApi } from '../api';
 */

export { default as http, setUnauthorizedHandler } from './http';
export { authApi } from './auth';
export { recipesApi } from './recipes';
export { shoppingApi } from './shopping';

// Re-export for backward compatibility with existing code
// These match the names used in the old api.js
export { authApi as auth } from './auth';
export { recipesApi as recipes } from './recipes';
export { shoppingApi as shoppingLists } from './shopping';
