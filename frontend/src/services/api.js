import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const auth = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
};

// Recipe endpoints
export const recipes = {
  extract: (url) => api.post('/recipes/extract', { url }),
  create: (data) => api.post('/recipes', data),
  getAll: (params) => api.get('/recipes', { params }),
  getOne: (id) => api.get(`/recipes/${id}`),
  getScaled: (id, servings) => api.get(`/recipes/${id}/scaled`, { params: { servings } }),
  update: (id, data) => api.put(`/recipes/${id}`, data),
  delete: (id) => api.delete(`/recipes/${id}`),
  getNote: (recipeId) => api.get(`/recipes/${recipeId}/note`),
  upsertNote: (recipeId, noteText) => api.put(`/recipes/${recipeId}/note`, { noteText }),
  deleteNote: (recipeId) => api.delete(`/recipes/${recipeId}/note`),
  getIngredientsForRecipes: (recipeIds) =>
    api.post('/recipes/ingredients-preview', { recipeIds }),
};

// Shopping list endpoints
export const shoppingLists = {
  createFromRecipes: (recipeIds, name, excludedIngredientIds = []) =>
    api.post('/shopping-lists/from-recipes', { recipeIds, name, excludedIngredientIds }),
  addRecipesToList: (listId, recipeIds, excludedIngredientIds = []) =>
    api.post(`/shopping-lists/${listId}/add-recipes`, { recipeIds, excludedIngredientIds }),
  getAll: () => api.get('/shopping-lists'),
  getOne: (id) => api.get(`/shopping-lists/${id}`),
  updateItem: (itemId, data) => api.patch(`/shopping-lists/items/${itemId}`, data),
  delete: (id) => api.delete(`/shopping-lists/${id}`),
  removeRecipe: (shoppingListId, recipeId) =>
    api.delete(`/shopping-lists/${shoppingListId}/recipes/${recipeId}`),
};

export default api;
