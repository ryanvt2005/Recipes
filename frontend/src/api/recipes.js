import http from './http';

/**
 * Recipes API service
 */
export const recipesApi = {
  /**
   * Extract recipe from URL
   * @param {string} url - Recipe URL to extract from
   * @returns {Promise} - Response with extracted recipe data
   */
  extract: (url) => http.post('/recipes/extract', { url }),

  /**
   * Create a new recipe
   * @param {Object} data - Recipe data
   * @returns {Promise} - Response with created recipe
   */
  create: (data) => http.post('/recipes', data),

  /**
   * Get all recipes for the current user
   * @param {Object} [params] - Query parameters (search, sort, etc.)
   * @returns {Promise} - Response with recipes array
   */
  getAll: (params) => http.get('/recipes', { params }),

  /**
   * Get a single recipe by ID
   * @param {string|number} id - Recipe ID
   * @returns {Promise} - Response with recipe data
   */
  getOne: (id) => http.get(`/recipes/${id}`),

  /**
   * Get a recipe with scaled ingredient quantities
   * @param {string|number} id - Recipe ID
   * @param {number} servings - Target number of servings
   * @returns {Promise} - Response with scaled recipe data
   */
  getScaled: (id, servings) => http.get(`/recipes/${id}/scaled`, { params: { servings } }),

  /**
   * Update a recipe
   * @param {string|number} id - Recipe ID
   * @param {Object} data - Updated recipe data
   * @returns {Promise} - Response with updated recipe
   */
  update: (id, data) => http.put(`/recipes/${id}`, data),

  /**
   * Delete a recipe
   * @param {string|number} id - Recipe ID
   * @returns {Promise} - Response confirming deletion
   */
  delete: (id) => http.delete(`/recipes/${id}`),

  /**
   * Get note for a recipe
   * @param {string|number} recipeId - Recipe ID
   * @returns {Promise} - Response with note data
   */
  getNote: (recipeId) => http.get(`/recipes/${recipeId}/note`),

  /**
   * Create or update a note for a recipe
   * @param {string|number} recipeId - Recipe ID
   * @param {string} noteText - Note content
   * @returns {Promise} - Response with note data
   */
  upsertNote: (recipeId, noteText) => http.put(`/recipes/${recipeId}/note`, { noteText }),

  /**
   * Delete a note from a recipe
   * @param {string|number} recipeId - Recipe ID
   * @returns {Promise} - Response confirming deletion
   */
  deleteNote: (recipeId) => http.delete(`/recipes/${recipeId}/note`),

  /**
   * Get ingredients preview for multiple recipes
   * Used for shopping list creation
   * @param {Array<string|number>} recipeIds - Array of recipe IDs
   * @returns {Promise} - Response with ingredients array
   */
  getIngredientsForRecipes: (recipeIds) => http.post('/recipes/ingredients-preview', { recipeIds }),
};

export default recipesApi;
