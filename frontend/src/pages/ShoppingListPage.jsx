import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { shoppingLists } from '../services/api';
import { formatQuantityWithUnit } from '../core';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import Button from '../components/Button';
import MobileShoppingTabs from '../components/shopping/MobileShoppingTabs';
import ShoppingItemsList from '../components/shopping/ShoppingItemsList';
import RecipesPanel from '../components/shopping/RecipesPanel';
import { PrinterIcon } from '@heroicons/react/24/outline';

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
      navigate('/shopping-lists');
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
      await fetchShoppingList();
    } catch (err) {
      setError('Failed to remove recipe from shopping list');
    }
  };

  // Use the core formatQuantityWithUnit function for consistent formatting
  const formatQuantity = formatQuantityWithUnit;

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
          <Link to="/shopping-lists">
            <Button>Back to Shopping Lists</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
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
            <Link to="/shopping-lists">
              <Button variant="secondary" className="min-h-[44px]">
                <span className="hidden sm:inline">All Lists</span>
                <span className="sm:hidden">Lists</span>
              </Button>
            </Link>
            <Button variant="danger" onClick={handleDelete} className="min-h-[44px]">
              Delete
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4 mb-6">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Progress Bar */}
        <div className="card mb-6 no-print">
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

        {/* Mobile: Tab View */}
        <div className="lg:hidden">
          <MobileShoppingTabs
            items={items}
            recipes={recipes}
            onToggleItem={toggleItemChecked}
            onUpdateCategory={updateItemCategory}
            onRemoveRecipe={handleRemoveRecipe}
            formatQuantity={formatQuantity}
            checkedCount={checkedCount}
            totalCount={totalCount}
          />
        </div>

        {/* Desktop: Sidebar Layout */}
        <div className="hidden lg:flex gap-6">
          {/* Main Content */}
          <div className="flex-1 space-y-6">
            <ShoppingItemsList
              items={items}
              onToggleItem={toggleItemChecked}
              onUpdateCategory={updateItemCategory}
              formatQuantity={formatQuantity}
              isMobile={false}
            />

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

          {/* Sidebar - Recipes */}
          {recipes.length > 0 && (
            <div className="w-80 flex-shrink-0 no-print">
              <div className="sticky top-24">
                <RecipesPanel recipes={recipes} onRemoveRecipe={handleRemoveRecipe} />
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
