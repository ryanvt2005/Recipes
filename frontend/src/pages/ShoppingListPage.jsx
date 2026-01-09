import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { shoppingLists } from '../services/api';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import Button from '../components/Button';

export default function ShoppingListPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [shoppingList, setShoppingList] = useState(null);
  const [items, setItems] = useState([]);
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
      setItems(items.map(item =>
        item.id === itemId ? { ...item, is_checked: !currentStatus } : item
      ));
    } catch (err) {
      setError('Failed to update item');
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

  const formatQuantity = (quantity, unit) => {
    if (!quantity) return '';

    // Convert to number (quantity comes from DB as string for DECIMAL type)
    const qty = typeof quantity === 'string' ? parseFloat(quantity) : quantity;

    // Format quantity nicely
    const formatted = qty % 1 === 0 ? qty.toString() : qty.toFixed(2);

    return unit ? `${formatted} ${unit}` : formatted;
  };

  // Group items by category
  const uncategorized = items.filter(item => !item.category);
  const checkedCount = items.filter(item => item.is_checked).length;
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
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{shoppingList?.name}</h1>
            <p className="text-gray-600 mt-1">
              {checkedCount} of {totalCount} items checked
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/recipes">
              <Button variant="secondary">Back to Recipes</Button>
            </Link>
            <Button variant="danger" onClick={handleDelete}>
              Delete List
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Progress Bar */}
        <div className="card">
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

        {/* Shopping List Items */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Items</h2>

          {items.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No items in this shopping list</p>
          ) : (
            <div className="space-y-2">
              {uncategorized.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    item.is_checked
                      ? 'bg-gray-50 border-gray-200'
                      : 'bg-white border-gray-300 hover:border-primary-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={item.is_checked}
                    onChange={() => toggleItemChecked(item.id, item.is_checked)}
                    className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <div className="flex-1">
                    <div className={`font-medium ${item.is_checked ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                      {item.ingredient_name}
                    </div>
                    {(item.quantity || item.unit) && (
                      <div className={`text-sm ${item.is_checked ? 'text-gray-400' : 'text-gray-600'}`}>
                        {formatQuantity(item.quantity, item.unit)}
                      </div>
                    )}
                    {item.notes && (
                      <div className="text-sm text-gray-500 mt-1">
                        {item.notes}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tips */}
        <div className="card bg-blue-50 border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">💡 Tips</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Check off items as you shop to track your progress</li>
            <li>• Ingredients from multiple recipes have been combined</li>
            <li>• Similar ingredients with the same unit are consolidated</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}
