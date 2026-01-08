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

// Update shopping list item (check/uncheck, add notes)
router.patch('/items/:id', shoppingListController.updateItem);

// Delete shopping list
router.delete('/:id', shoppingListController.deleteShoppingList);

module.exports = router;
