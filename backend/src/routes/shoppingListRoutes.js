const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const shoppingListController = require('../controllers/shoppingListController');

// All routes require authentication
router.use(authenticateToken);

// Create shopping list from selected recipes
router.post('/from-recipes', shoppingListController.createFromRecipes);

// Get all shopping lists for current user
router.get('/', shoppingListController.getUserShoppingLists);

// Get a specific shopping list with items
router.get('/:id', shoppingListController.getShoppingList);

// Add recipes to an existing shopping list
router.post('/:id/add-recipes', shoppingListController.addRecipesToList);

// Remove a recipe from a shopping list
router.delete('/:id/recipes/:recipeId', shoppingListController.removeRecipeFromList);

// Recompute shopping list from associated recipes
router.post('/:id/recompute', shoppingListController.recomputeShoppingList);

// Update shopping list item (check/uncheck, add notes)
router.patch('/items/:id', shoppingListController.updateItem);

// Delete a single shopping list item
router.delete('/items/:id', shoppingListController.deleteItem);

// Delete shopping list
router.delete('/:id', shoppingListController.deleteShoppingList);

module.exports = router;
