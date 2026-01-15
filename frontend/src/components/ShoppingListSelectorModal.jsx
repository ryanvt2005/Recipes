import { useState, useEffect } from 'react';
import { shoppingLists, recipes } from '../services/api';
import Button from './Button';

export default function ShoppingListSelectorModal({ isOpen, onClose, onConfirm, recipeData }) {
  const [existingLists, setExistingLists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedListId, setSelectedListId] = useState('new');
  const [newListName, setNewListName] = useState('');
  const [error, setError] = useState('');
  const [ingredients, setIngredients] = useState([]);
  const [loadingIngredients, setLoadingIngredients] = useState(false);
  const [excludedIngredientIds, setExcludedIngredientIds] = useState([]);
  const [showIngredients, setShowIngredients] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchShoppingLists();
      fetchIngredients();
      // Set default name for new list
      if (recipeData.defaultName) {
        setNewListName(recipeData.defaultName);
      }
    }
  }, [isOpen, recipeData]);

  const fetchShoppingLists = async () => {
    try {
      setLoading(true);
      const response = await shoppingLists.getAll();
      setExistingLists(response.data.shoppingLists || []);
    } catch (err) {
      setError('Failed to load shopping lists');
    } finally {
      setLoading(false);
    }
  };

  const fetchIngredients = async () => {
    if (!recipeData.recipeIds || recipeData.recipeIds.length === 0) {
      return;
    }

    try {
      setLoadingIngredients(true);
      const response = await recipes.getIngredientsForRecipes(recipeData.recipeIds);
      setIngredients(response.data.ingredients || []);
      setExcludedIngredientIds([]);
    } catch (err) {
      console.error('Failed to load ingredients:', err);
      setIngredients([]);
    } finally {
      setLoadingIngredients(false);
    }
  };

  const toggleIngredient = (ingredientId) => {
    setExcludedIngredientIds((prev) =>
      prev.includes(ingredientId)
        ? prev.filter((id) => id !== ingredientId)
        : [...prev, ingredientId]
    );
  };

  const handleConfirm = () => {
    if (selectedListId === 'new' && !newListName.trim()) {
      setError('Please enter a name for the new shopping list');
      return;
    }

    onConfirm({
      listId: selectedListId === 'new' ? null : selectedListId,
      listName: selectedListId === 'new' ? newListName.trim() : null,
      isNewList: selectedListId === 'new',
      excludedIngredientIds,
    });

    // Reset state
    setSelectedListId('new');
    setNewListName('');
    setError('');
    setExcludedIngredientIds([]);
    setShowIngredients(false);
  };

  const handleClose = () => {
    setSelectedListId('new');
    setNewListName('');
    setError('');
    setExcludedIngredientIds([]);
    setShowIngredients(false);
    onClose();
  };

  if (!isOpen) return null;

  const includedCount = ingredients.length - excludedIngredientIds.length;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 overflow-y-auto flex-1">
          <h2 className="text-2xl font-bold mb-4">Add to Shopping List</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
          )}

          {loading ? (
            <div className="py-8 text-center text-gray-500">Loading shopping lists...</div>
          ) : (
            <div className="space-y-3">
              {/* Create New List Option */}
              <div className="border rounded-lg p-4">
                <label className="flex items-start cursor-pointer">
                  <input
                    type="radio"
                    name="listSelection"
                    value="new"
                    checked={selectedListId === 'new'}
                    onChange={(e) => setSelectedListId(e.target.value)}
                    className="mt-1 mr-3 h-4 w-4 text-primary-600"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 mb-2">Create New List</div>
                    <input
                      type="text"
                      placeholder="Enter list name"
                      value={newListName}
                      onChange={(e) => setNewListName(e.target.value)}
                      disabled={selectedListId !== 'new'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>
                </label>
              </div>

              {/* Existing Lists */}
              {existingLists.length > 0 && (
                <>
                  <div className="text-sm font-semibold text-gray-700 mt-4 mb-2">
                    Or add to existing list:
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {existingLists.map((list) => (
                      <label
                        key={list.id}
                        className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        <input
                          type="radio"
                          name="listSelection"
                          value={list.id}
                          checked={selectedListId === list.id}
                          onChange={(e) => setSelectedListId(e.target.value)}
                          className="mr-3 h-4 w-4 text-primary-600"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{list.name}</div>
                          {list.itemCount !== undefined && (
                            <div className="text-sm text-gray-500">
                              {list.itemCount} {list.itemCount === 1 ? 'item' : 'items'}
                            </div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </>
              )}

              {/* Ingredient Selection Section */}
              {ingredients.length > 0 && (
                <div className="border-t pt-4 mt-4">
                  <button
                    onClick={() => setShowIngredients(!showIngredients)}
                    className="flex items-center justify-between w-full text-left font-semibold text-gray-900 mb-2"
                  >
                    <span>
                      Review Ingredients ({includedCount} of {ingredients.length} selected)
                    </span>
                    <svg
                      className={`w-5 h-5 transition-transform ${showIngredients ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {showIngredients && (
                    <>
                      {loadingIngredients ? (
                        <div className="py-4 text-center text-gray-500">
                          Loading ingredients...
                        </div>
                      ) : (
                        <div className="space-y-1 max-h-64 overflow-y-auto bg-gray-50 rounded-lg p-3">
                          <div className="flex justify-end mb-2">
                            <button
                              onClick={() => setExcludedIngredientIds([])}
                              className="text-sm text-primary-600 hover:text-primary-700"
                            >
                              Select All
                            </button>
                            <span className="mx-2 text-gray-400">|</span>
                            <button
                              onClick={() =>
                                setExcludedIngredientIds(ingredients.map((ing) => ing.id))
                              }
                              className="text-sm text-primary-600 hover:text-primary-700"
                            >
                              Deselect All
                            </button>
                          </div>
                          {ingredients.map((ingredient) => (
                            <label
                              key={ingredient.id}
                              className="flex items-start py-2 px-2 hover:bg-white rounded cursor-pointer transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={!excludedIngredientIds.includes(ingredient.id)}
                                onChange={() => toggleIngredient(ingredient.id)}
                                className="mt-0.5 mr-3 h-4 w-4 text-primary-600 rounded"
                              />
                              <div className="flex-1 text-sm">
                                <div className="text-gray-900">{ingredient.raw_text}</div>
                                {ingredient.recipe_title && (
                                  <div className="text-xs text-gray-500">
                                    from {ingredient.recipe_title}
                                  </div>
                                )}
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="p-6 pt-0 border-t bg-gray-50 rounded-b-lg">
          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={loading} className="flex-1">
              Add to List
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
