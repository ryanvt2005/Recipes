import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { shoppingLists } from '../services/api';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import Button from '../components/Button';

export default function ShoppingListsPage() {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchShoppingLists();
  }, []);

  const fetchShoppingLists = async () => {
    try {
      setLoading(true);
      const response = await shoppingLists.getAll();
      setLists(response.data.shoppingLists);
    } catch (err) {
      setError('Failed to load shopping lists');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner className="py-12" />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Shopping Lists</h1>
          <Link to="/recipes">
            <Button variant="secondary">Back to Recipes</Button>
          </Link>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Shopping Lists Grid */}
        {lists.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Shopping Lists Yet</h2>
            <p className="text-gray-600 mb-6">
              Create your first shopping list by selecting recipes from your collection
            </p>
            <Link to="/recipes">
              <Button>Go to Recipes</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {lists.map((list) => (
              <Link
                key={list.id}
                to={`/shopping-lists/${list.id}`}
                className="card hover:shadow-elevated hover:border-gray-300 transition-all duration-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{list.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                          />
                        </svg>
                        {list.item_count} {list.item_count === 1 ? 'item' : 'items'}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        Created {formatDate(list.created_at)}
                      </span>
                    </div>
                  </div>
                  <svg
                    className="w-6 h-6 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Info Card */}
        <div className="card bg-blue-50 border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">How to Create Shopping Lists</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Go to your Recipes page</li>
            <li>• Select recipes using the checkboxes</li>
            <li>• Click &quot;Create Shopping List&quot; to generate a consolidated list</li>
            <li>• Ingredients from multiple recipes are automatically combined</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}
