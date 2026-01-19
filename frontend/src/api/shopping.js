import http from './http';

/**
 * Shopping Lists API service
 */
export const shoppingApi = {
  /**
   * Create a new shopping list from recipes
   * @param {Array<string|number>} recipeIds - Array of recipe IDs to include
   * @param {string} name - Name for the shopping list
   * @param {Array<string|number>} [excludedIngredientIds] - Ingredient IDs to exclude
   * @returns {Promise} - Response with created shopping list
   */
  createFromRecipes: (recipeIds, name, excludedIngredientIds = []) =>
    http.post('/shopping-lists/from-recipes', { recipeIds, name, excludedIngredientIds }),

  /**
   * Add recipes to an existing shopping list
   * @param {string|number} listId - Shopping list ID
   * @param {Array<string|number>} recipeIds - Array of recipe IDs to add
   * @param {Array<string|number>} [excludedIngredientIds] - Ingredient IDs to exclude
   * @returns {Promise} - Response with updated shopping list
   */
  addRecipesToList: (listId, recipeIds, excludedIngredientIds = []) =>
    http.post(`/shopping-lists/${listId}/add-recipes`, { recipeIds, excludedIngredientIds }),

  /**
   * Get all shopping lists for the current user
   * @returns {Promise} - Response with shopping lists array
   */
  getAll: () => http.get('/shopping-lists'),

  /**
   * Get a single shopping list with items
   * @param {string|number} id - Shopping list ID
   * @returns {Promise} - Response with shopping list and items
   */
  getOne: (id) => http.get(`/shopping-lists/${id}`),

  /**
   * Update a shopping list item
   * @param {string|number} itemId - Shopping list item ID
   * @param {Object} data - Updated item data (isChecked, category, etc.)
   * @returns {Promise} - Response with updated item
   */
  updateItem: (itemId, data) => http.patch(`/shopping-lists/items/${itemId}`, data),

  /**
   * Delete a shopping list
   * @param {string|number} id - Shopping list ID
   * @returns {Promise} - Response confirming deletion
   */
  delete: (id) => http.delete(`/shopping-lists/${id}`),

  /**
   * Remove a recipe and its ingredients from a shopping list
   * @param {string|number} shoppingListId - Shopping list ID
   * @param {string|number} recipeId - Recipe ID to remove
   * @returns {Promise} - Response confirming removal
   */
  removeRecipe: (shoppingListId, recipeId) =>
    http.delete(`/shopping-lists/${shoppingListId}/recipes/${recipeId}`),
};

export default shoppingApi;
