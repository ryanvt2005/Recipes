import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { recipes, shoppingLists } from '../services/api';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import Button from '../components/Button';
import ShoppingListSelectorModal from '../components/ShoppingListSelectorModal';

export default function RecipesPage() {
  const [recipeList, setRecipeList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [selectedRecipes, setSelectedRecipes] = useState([]);
  const [showShoppingListModal, setShowShoppingListModal] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [creatingList, setCreatingList] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchRecipes();
  }, [page, search]);

  const fetchRecipes = async () => {
    try {
      setLoading(true);
      const response = await recipes.getAll({
        page,
        limit: 12,
        search,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      setRecipeList(response.data.recipes);
      setPagination(response.data.pagination);
    } catch (err) {
      setError('Failed to load recipes');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchRecipes();
  };

  const toggleRecipeSelection = (recipeId) => {
    setSelectedRecipes(prev =>
      prev.includes(recipeId)
        ? prev.filter(id => id !== recipeId)
        : [...prev, recipeId]
    );
  };

  const handleCreateShoppingList = () => {
    if (selectedRecipes.length === 0) {
      setError('Please select at least one recipe');
      return;
    }
    setShowShoppingListModal(true);
  };

  const handleListSelection = async (selection) => {
    try {
      setCreatingList(true);
      setShowShoppingListModal(false);
      setError('');

      if (selection.isNewList) {
        // Create new shopping list
        const response = await shoppingLists.createFromRecipes(selectedRecipes, selection.listName);
        navigate(`/shopping-lists/${response.data.shoppingList.id}`);
      } else {
        // Add to existing shopping list
        await shoppingLists.addRecipesToList(selection.listId, selectedRecipes);
        navigate(`/shopping-lists/${selection.listId}`);
      }

      setSelectedRecipes([]);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add to shopping list');
      setCreatingList(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">My Recipes</h1>
          <Link to="/recipes/new">
            <Button>+ Add Recipe</Button>
          </Link>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            placeholder="Search recipes by title or ingredients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 input"
          />
          <Button type="submit">Search</Button>
        </form>

        {/* Error */}
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Loading */}
        {loading && <LoadingSpinner className="py-12" />}

        {/* Empty State */}
        {!loading && recipeList.length === 0 && (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No recipes yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by adding your first recipe!
            </p>
            <div className="mt-6">
              <Link to="/recipes/new">
                <Button>+ Add Recipe</Button>
              </Link>
            </div>
          </div>
        )}

        {/* Recipe Grid */}
        {!loading && recipeList.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {recipeList.map((recipe) => (
                <div key={recipe.id} className="recipe-card relative">
                  {/* Selection checkbox */}
                  <div className="absolute top-2 left-2 z-10">
                    <input
                      type="checkbox"
                      checked={selectedRecipes.includes(recipe.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleRecipeSelection(recipe.id);
                      }}
                      className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                  </div>

                  <Link to={`/recipes/${recipe.id}`} className="block">
                    {recipe.imageUrl && (
                      <img
                        src={recipe.imageUrl}
                        alt={recipe.title}
                        className="w-full h-48 object-cover"
                      />
                    )}
                    <div className="p-4">
                      <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                        {recipe.title}
                      </h3>
                    {recipe.description && (
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                        {recipe.description}
                      </p>
                    )}
                    <div className="flex items-center text-sm text-gray-500 space-x-4">
                      {recipe.totalTime && (
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {recipe.totalTime}
                        </span>
                      )}
                      {recipe.servings && (
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          {recipe.servings}
                        </span>
                      )}
                    </div>
                    {recipe.tags && recipe.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {recipe.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="inline-block bg-primary-100 text-primary-800 text-xs px-2 py-1 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    </div>
                  </Link>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex justify-center items-center space-x-2 mt-8">
                <Button
                  variant="secondary"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-700">
                  Page {page} of {pagination.totalPages}
                </span>
                <Button
                  variant="secondary"
                  disabled={page === pagination.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}

        {/* Floating Action Button for Shopping List */}
        {selectedRecipes.length > 0 && (
          <div className="fixed bottom-6 right-6 z-50">
            <Button
              onClick={handleCreateShoppingList}
              className="shadow-lg flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Add {selectedRecipes.length} to Shopping List
            </Button>
          </div>
        )}

        {/* Shopping List Modal */}
        <ShoppingListSelectorModal
          isOpen={showShoppingListModal}
          onClose={() => setShowShoppingListModal(false)}
          onConfirm={handleListSelection}
          recipeData={{
            defaultName: `Shopping List (${selectedRecipes.length} recipe${selectedRecipes.length > 1 ? 's' : ''})`
          }}
        />
      </div>
    </Layout>
  );
}
