import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { shoppingLists } from '../services/api';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import Button from '../components/Button';
import { PrinterIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function ShoppingListPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [shoppingList, setShoppingList] = useState(null);
  const [items, setItems] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchShoppingList();
  }, [id]);

  const fetchShoppingList = async () => {
    try {
      setLoading(true);
      const response = await shoppingLists.getOne(id);
      setShoppingList(response.data.shoppingList);
      setItems(response.data.items);
      setRecipes(response.data.recipes || []);
    } catch (err) {
      setError('Failed to load shopping list');
    } finally {
      setLoading(false);
    }
  };

  const toggleItemChecked = async (itemId, currentStatus) => {
    try {
      await shoppingLists.updateItem(itemId, { isChecked: !currentStatus });
      // Update local state
      setItems(
        items.map((item) => (item.id === itemId ? { ...item, is_checked: !currentStatus } : item))
      );
    } catch (err) {
      setError('Failed to update item');
    }
  };

  const updateItemCategory = async (itemId, newCategory) => {
    try {
      await shoppingLists.updateItem(itemId, { category: newCategory });
      // Update local state
      setItems(
        items.map((item) => (item.id === itemId ? { ...item, category: newCategory } : item))
      );
    } catch (err) {
      setError('Failed to update category');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this shopping list?')) {
      return;
    }

    try {
      await shoppingLists.delete(id);
      navigate('/recipes');
    } catch (err) {
      setError('Failed to delete shopping list');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleRemoveRecipe = async (recipeId, recipeTitle) => {
    if (!confirm(`Remove "${recipeTitle}" and all its ingredients from this shopping list?`)) {
      return;
    }

    try {
      await shoppingLists.removeRecipe(id, recipeId);
      // Refresh the shopping list
      await fetchShoppingList();
    } catch (err) {
      setError('Failed to remove recipe from shopping list');
    }
  };

  const formatQuantity = (quantity, unit) => {
    if (!quantity) return '';

    // Convert to number (quantity comes from DB as string for DECIMAL type)
    const qty = typeof quantity === 'string' ? parseFloat(quantity) : quantity;

    // Format quantity nicely
    const formatted = qty % 1 === 0 ? qty.toString() : qty.toFixed(2);

    return unit ? `${formatted} ${unit}` : formatted;
  };

  // Category display order (matches typical grocery store layout)
  const CATEGORY_ORDER = [
    'Produce',
    'Meat & Seafood',
    'Dairy & Eggs',
    'Bakery',
    'Frozen',
    'Canned & Jarred',
    'Pantry',
    'Spices & Seasonings',
    'Condiments & Sauces',
    'Beverages',
    'Snacks',
    'Other',
  ];

  // Group items by category
  const groupedItems = items.reduce((groups, item) => {
    const category = item.category || 'Other';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(item);
    return groups;
  }, {});

  // Calculate overall progress
  const checkedCount = items.filter((item) => item.is_checked).length;
  const totalCount = items.length;

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner className="py-12" />
      </Layout>
    );
  }

  if (error && !shoppingList) {
    return (
      <Layout>
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
        <div className="mt-4">
          <Link to="/recipes">
            <Button>Back to Recipes</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Content */}
          <div className="flex-1 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 shopping-list-title">
                  {shoppingList?.name}
                </h1>
                <p className="text-gray-600 mt-1 no-print">
                  {checkedCount} of {totalCount} items checked
                </p>
              </div>
              <div className="flex flex-wrap gap-2 no-print">
                <Button
                  onClick={handlePrint}
                  variant="outline"
                  className="flex items-center gap-2 min-h-[44px]"
                >
                  <PrinterIcon className="w-5 h-5" />
                  <span className="hidden sm:inline">Print</span>
                </Button>
                <Link to="/recipes">
                  <Button variant="secondary" className="min-h-[44px]">
                    <span className="hidden sm:inline">Back to Recipes</span>
                    <span className="sm:hidden">Recipes</span>
                  </Button>
                </Link>
                <Button variant="danger" onClick={handleDelete} className="min-h-[44px]">
                  Delete
                </Button>
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Progress Bar */}
            <div className="card no-print">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Progress</span>
                <span className="text-sm text-gray-600">
                  {totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all"
                  style={{ width: `${totalCount > 0 ? (checkedCount / totalCount) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Shopping List Items - Grouped by Category */}
            <div className="space-y-6">
              {items.length === 0 ? (
                <div className="card">
                  <p className="text-gray-500 text-center py-8">No items in this shopping list</p>
                </div>
              ) : (
                CATEGORY_ORDER.map((category) => {
                  const categoryItems = groupedItems[category];

                  // Skip empty categories
                  if (!categoryItems || categoryItems.length === 0) {
                    return null;
                  }

                  const categoryChecked = categoryItems.filter((item) => item.is_checked).length;
                  const categoryTotal = categoryItems.length;

                  return (
                    <div key={category} className="card">
                      {/* Category Header */}
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 shopping-category">
                          {category}
                        </h3>
                        <span className="text-sm text-gray-600 no-print">
                          {categoryChecked}/{categoryTotal} items
                        </span>
                      </div>

                      {/* Category Items */}
                      <div className="space-y-2">
                        {categoryItems.map((item) => (
                          <div
                            key={item.id}
                            className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                              item.is_checked
                                ? 'bg-gray-50 border-gray-200'
                                : 'bg-white border-gray-300 hover:border-primary-300'
                            }`}
                          >
                            <label className="flex items-center min-w-[44px] min-h-[44px] justify-center cursor-pointer -m-2">
                              <input
                                type="checkbox"
                                checked={item.is_checked}
                                onChange={() => toggleItemChecked(item.id, item.is_checked)}
                                className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                              />
                            </label>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                <div
                                  className={`font-medium flex-1 shopping-item ${item.is_checked ? 'line-through text-gray-500' : 'text-gray-900'}`}
                                >
                                  {item.ingredient_name}
                                </div>
                                <select
                                  value={item.category || 'Other'}
                                  onChange={(e) => updateItemCategory(item.id, e.target.value)}
                                  className="text-xs px-2 py-2 min-h-[44px] sm:min-h-0 sm:py-1 border border-gray-300 rounded bg-white hover:border-primary-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 no-print"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {CATEGORY_ORDER.map((cat) => (
                                    <option key={cat} value={cat}>
                                      {cat}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              {(item.quantity || item.unit) && (
                                <div
                                  className={`text-sm ${item.is_checked ? 'text-gray-400' : 'text-gray-600'}`}
                                >
                                  {formatQuantity(item.quantity, item.unit)}
                                </div>
                              )}
                              {item.notes && (
                                <div className="text-sm text-gray-500 mt-1">{item.notes}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Tips */}
            <div className="card bg-blue-50 border-blue-200 no-print">
              <h3 className="font-semibold text-blue-900 mb-2">💡 Tips</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Items are organized by grocery store category for easier shopping</li>
                <li>• Check off items as you shop to track your progress</li>
                <li>• Ingredients from multiple recipes have been combined</li>
                <li>• Similar ingredients with the same unit are consolidated</li>
              </ul>
            </div>
          </div>

          {/* Sidebar - Recipes (shown below on mobile, sidebar on lg+) */}
          {recipes.length > 0 && (
            <div className="w-full lg:w-80 flex-shrink-0 no-print order-first lg:order-last">
              <div className="lg:sticky lg:top-24">
                <div className="card">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recipes in this list</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                    {recipes.map((recipe) => (
                      <div
                        key={recipe.id}
                        className="flex gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <Link to={`/recipes/${recipe.id}`} className="flex gap-3 flex-1 min-w-0">
                          {recipe.image_url && (
                            <img
                              src={recipe.image_url}
                              alt={recipe.title}
                              className="w-16 h-16 object-cover rounded flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 hover:text-primary-600 transition-colors line-clamp-2">
                              {recipe.title}
                            </h4>
                            {recipe.scaled_servings && (
                              <p className="text-sm text-gray-500 mt-1">
                                Scaled to {recipe.scaled_servings} servings
                              </p>
                            )}
                          </div>
                        </Link>
                        <button
                          onClick={() => handleRemoveRecipe(recipe.id, recipe.title)}
                          className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                          title="Remove recipe from list"
                        >
                          <XMarkIcon className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
