const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const shoppingListController = require('../controllers/shoppingListController');
const { validate, addShoppingListItemSchema, updateShoppingListItemSchema } = require('../utils/validation');

// All routes require authentication
router.use(authenticateToken);

// Create shopping list from selected recipes
router.post('/from-recipes', shoppingListController.createFromRecipes);

// Get all shopping lists for current user
router.get('/', shoppingListController.getUserShoppingLists);

// Get a specific shopping list with items
router.get('/:id', shoppingListController.getShoppingList);

// Add custom item to shopping list
router.post('/:id/items', validate(addShoppingListItemSchema), shoppingListController.addItem);

// Update shopping list item (check/uncheck, add notes, edit quantity/name)
router.patch('/items/:id', validate(updateShoppingListItemSchema), shoppingListController.updateItem);

// Delete individual shopping list item
router.delete('/items/:id', shoppingListController.deleteItem);

// Delete entire shopping list
router.delete('/:id', shoppingListController.deleteShoppingList);

module.exports = router;
