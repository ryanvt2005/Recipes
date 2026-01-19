import { useState, useEffect } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { shoppingLists, recipes } from '../services/api';
import Button from './Button';

export default function ShoppingListSelectorModal({
  isOpen,
  onClose,
  onConfirm,
  recipeData,
  externalError = '',
}) {
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

  const includedCount = ingredients.length - excludedIngredientIds.length;

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      {/* Full-screen container for mobile centering */}
      <div className="fixed inset-0 flex items-center justify-center p-4 sm:p-6">
        <DialogPanel className="w-full max-w-2xl bg-white rounded-lg shadow-xl flex flex-col max-h-[90vh] sm:max-h-[85vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
            <DialogTitle className="text-xl sm:text-2xl font-bold text-gray-900">
              Add to Shopping List
            </DialogTitle>
            <button
              onClick={handleClose}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors -mr-2"
              aria-label="Close"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Content - Scrollable */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1">
            {(error || externalError) && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                {externalError || error}
              </div>
            )}

            {loading ? (
              <div className="py-8 text-center text-gray-500">Loading shopping lists...</div>
            ) : (
              <div className="space-y-4">
                {/* Create New List Option */}
                <div className="border rounded-lg p-4">
                  <label className="flex items-start cursor-pointer">
                    <input
                      type="radio"
                      name="listSelection"
                      value="new"
                      checked={selectedListId === 'new'}
                      onChange={(e) => setSelectedListId(e.target.value)}
                      className="mt-1 mr-3 h-5 w-5 text-primary-600"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 mb-2">Create New List</div>
                      <input
                        type="text"
                        placeholder="Enter list name"
                        value={newListName}
                        onChange={(e) => setNewListName(e.target.value)}
                        disabled={selectedListId !== 'new'}
                        className="w-full px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>
                  </label>
                </div>

                {/* Existing Lists */}
                {existingLists.length > 0 && (
                  <>
                    <div className="text-sm font-semibold text-gray-700">
                      Or add to existing list:
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {existingLists.map((list) => (
                        <label
                          key={list.id}
                          className="flex items-center p-3 min-h-[56px] border rounded-lg cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors"
                        >
                          <input
                            type="radio"
                            name="listSelection"
                            value={list.id}
                            checked={selectedListId === list.id}
                            onChange={(e) => setSelectedListId(e.target.value)}
                            className="mr-3 h-5 w-5 text-primary-600"
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
                  <div className="border-t pt-4">
                    <button
                      onClick={() => setShowIngredients(!showIngredients)}
                      className="flex items-center justify-between w-full text-left font-semibold text-gray-900 min-h-[44px] px-2 -mx-2 rounded-lg hover:bg-gray-50"
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
                          <div className="mt-3 space-y-1 max-h-64 overflow-y-auto bg-gray-50 rounded-lg p-3">
                            <div className="flex justify-end mb-2 gap-2">
                              <button
                                onClick={() => setExcludedIngredientIds([])}
                                className="text-sm text-primary-600 hover:text-primary-700 px-2 py-1 min-h-[36px]"
                              >
                                Select All
                              </button>
                              <span className="text-gray-400 py-1">|</span>
                              <button
                                onClick={() =>
                                  setExcludedIngredientIds(ingredients.map((ing) => ing.id))
                                }
                                className="text-sm text-primary-600 hover:text-primary-700 px-2 py-1 min-h-[36px]"
                              >
                                Deselect All
                              </button>
                            </div>
                            {ingredients.map((ingredient) => (
                              <label
                                key={ingredient.id}
                                className="flex items-start py-3 px-2 min-h-[44px] hover:bg-white rounded cursor-pointer transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={!excludedIngredientIds.includes(ingredient.id)}
                                  onChange={() => toggleIngredient(ingredient.id)}
                                  className="mt-0.5 mr-3 h-5 w-5 text-primary-600 rounded"
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
          <div className="p-4 sm:p-6 border-t bg-gray-50 rounded-b-lg">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="secondary"
                onClick={handleClose}
                className="flex-1 min-h-[48px] order-2 sm:order-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={loading}
                className="flex-1 min-h-[48px] order-1 sm:order-2"
              >
                Add to List
              </Button>
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
