import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { shoppingLists } from '../services/api';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import Button from '../components/Button';
import { PencilIcon, TrashIcon, PlusIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';

export default function ShoppingListPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [shoppingList, setShoppingList] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState({ ingredientName: '', quantity: '', unit: '' });

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
      setItems(items.map(item =>
        item.id === itemId ? { ...item, is_checked: !currentStatus } : item
      ));
    } catch (err) {
      setError('Failed to update item');
    }
  };

  const handleDeleteList = async () => {
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

  const handleDeleteItem = async (itemId) => {
    if (!confirm('Are you sure you want to delete this item?')) {
      return;
    }

    try {
      await shoppingLists.deleteItem(itemId);
      setItems(items.filter(item => item.id !== itemId));
    } catch (err) {
      setError('Failed to delete item');
    }
  };

  const startEditItem = (item) => {
    setEditingItem({
      id: item.id,
      ingredientName: item.ingredient_name,
      quantity: item.quantity || '',
      unit: item.unit || '',
    });
  };

  const cancelEdit = () => {
    setEditingItem(null);
  };

  const saveEditItem = async () => {
    try {
      const response = await shoppingLists.updateItem(editingItem.id, {
        ingredientName: editingItem.ingredientName,
        quantity: editingItem.quantity ? parseFloat(editingItem.quantity) : null,
        unit: editingItem.unit || null,
      });
      setItems(items.map(item =>
        item.id === editingItem.id ? response.data.item : item
      ));
      setEditingItem(null);
    } catch (err) {
      setError('Failed to update item');
    }
  };

  const handleAddItem = async () => {
    if (!newItem.ingredientName.trim()) {
      setError('Please enter an ingredient name');
      return;
    }

    try {
      const response = await shoppingLists.addItem(id, {
        ingredientName: newItem.ingredientName,
        quantity: newItem.quantity ? parseFloat(newItem.quantity) : null,
        unit: newItem.unit || null,
      });
      setItems([...items, response.data.item]);
      setNewItem({ ingredientName: '', quantity: '', unit: '' });
      setShowAddItem(false);
      setError('');
    } catch (err) {
      setError('Failed to add item');
    }
  };

  const formatQuantity = (quantity, unit) => {
    if (!quantity) return '';
    const qty = typeof quantity === 'string' ? parseFloat(quantity) : quantity;
    const formatted = qty % 1 === 0 ? qty.toString() : qty.toFixed(2);
    return unit ? `${formatted} ${unit}` : formatted;
  };

  // Define category order for display
  const categoryOrder = [
    'Produce',
    'Meat & Seafood',
    'Dairy & Eggs',
    'Bakery',
    'Frozen',
    'Pantry',
    'Beverages',
    'Other'
  ];

  // Group items by category
  const groupedItems = items.reduce((acc, item) => {
    const category = item.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {});

  // Sort categories and items
  const sortedCategories = categoryOrder.filter(cat => groupedItems[cat] && groupedItems[cat].length > 0);

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
            <Button variant="danger" onClick={handleDeleteList}>
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

        {/* Add Item Button */}
        <div className="flex justify-end">
          <Button
            onClick={() => setShowAddItem(!showAddItem)}
            className="flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            Add Custom Item
          </Button>
        </div>

        {/* Add Item Form */}
        {showAddItem && (
          <div className="card bg-blue-50">
            <h3 className="font-semibold text-gray-900 mb-4">Add Custom Item</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ingredient Name *
                </label>
                <input
                  type="text"
                  value={newItem.ingredientName}
                  onChange={(e) => setNewItem({ ...newItem, ingredientName: e.target.value })}
                  placeholder="e.g., Milk"
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                  placeholder="e.g., 2"
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit
                </label>
                <input
                  type="text"
                  value={newItem.unit}
                  onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                  placeholder="e.g., cups"
                  className="input"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={handleAddItem}>Add Item</Button>
              <Button variant="secondary" onClick={() => {
                setShowAddItem(false);
                setNewItem({ ingredientName: '', quantity: '', unit: '' });
                setError('');
              }}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Shopping List Items Grouped by Category */}
        {items.length === 0 ? (
          <div className="card">
            <p className="text-gray-500 text-center py-8">No items in this shopping list</p>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedCategories.map((category) => (
              <div key={category} className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
                  {category}
                </h2>
                <div className="space-y-2">
                  {groupedItems[category].map((item) => (
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

                      {editingItem && editingItem.id === item.id ? (
                        // Edit Mode
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            type="text"
                            value={editingItem.ingredientName}
                            onChange={(e) => setEditingItem({ ...editingItem, ingredientName: e.target.value })}
                            className="input flex-1"
                            placeholder="Ingredient name"
                          />
                          <input
                            type="number"
                            step="0.01"
                            value={editingItem.quantity}
                            onChange={(e) => setEditingItem({ ...editingItem, quantity: e.target.value })}
                            className="input w-20"
                            placeholder="Qty"
                          />
                          <input
                            type="text"
                            value={editingItem.unit}
                            onChange={(e) => setEditingItem({ ...editingItem, unit: e.target.value })}
                            className="input w-24"
                            placeholder="Unit"
                          />
                          <button
                            onClick={saveEditItem}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                            title="Save"
                          >
                            <CheckIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            title="Cancel"
                          >
                            <XMarkIcon className="w-5 h-5" />
                          </button>
                        </div>
                      ) : (
                        // View Mode
                        <>
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
                          <div className="flex gap-1">
                            <button
                              onClick={() => startEditItem(item)}
                              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Edit item"
                            >
                              <PencilIcon className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete item"
                            >
                              <TrashIcon className="w-5 h-5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tips */}
        <div className="card bg-blue-50 border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">💡 Shopping Tips</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Items are grouped by grocery store section for efficient shopping</li>
            <li>• Check off items as you shop to track your progress</li>
            <li>• Click the pencil icon to edit item details</li>
            <li>• Add custom items that aren't from recipes</li>
            <li>• Ingredients from multiple recipes have been automatically combined</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}
