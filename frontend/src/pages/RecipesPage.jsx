import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { recipes, shoppingLists } from '../services/api';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import Button from '../components/Button';
import ShoppingListSelectorModal from '../components/ShoppingListSelectorModal';
import { formatDuration } from '../utils/timeFormatter';

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

  // Filter state
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [maxCookTime, setMaxCookTime] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const navigate = useNavigate();

  // Fetch tags on mount
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await recipes.getTags();
        setAvailableTags(response.data.tags || []);
      } catch (err) {
        console.error('Failed to load tags:', err);
      }
    };
    fetchTags();
  }, []);

  // Fetch recipes when filters change
  useEffect(() => {
    fetchRecipes();
  }, [page, search, selectedTags, sortBy, sortOrder, maxCookTime]);

  const fetchRecipes = async () => {
    try {
      setLoading(true);
      const response = await recipes.getAll({
        page,
        limit: 12,
        search,
        tags: selectedTags.join(','),
        sortBy,
        sortOrder,
        maxCookTime,
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
  };

  const toggleTag = (tagName) => {
    setSelectedTags((prev) =>
      prev.includes(tagName) ? prev.filter((t) => t !== tagName) : [...prev, tagName]
    );
    setPage(1);
  };

  const clearFilters = () => {
    setSelectedTags([]);
    setSortBy('createdAt');
    setSortOrder('desc');
    setMaxCookTime('');
    setSearch('');
    setPage(1);
  };

  const hasActiveFilters =
    selectedTags.length > 0 || maxCookTime || sortBy !== 'createdAt' || sortOrder !== 'desc';

  const cookTimeOptions = [
    { value: '', label: 'Any time' },
    { value: '15', label: 'Under 15 min' },
    { value: '30', label: 'Under 30 min' },
    { value: '45', label: 'Under 45 min' },
    { value: '60', label: 'Under 1 hour' },
  ];

  const sortOptions = [
    { value: 'createdAt', label: 'Date Added' },
    { value: 'title', label: 'Alphabetical' },
    { value: 'cookTime', label: 'Cook Time' },
    { value: 'totalTime', label: 'Total Time' },
  ];

  const toggleRecipeSelection = (recipeId) => {
    setSelectedRecipes((prev) =>
      prev.includes(recipeId) ? prev.filter((id) => id !== recipeId) : [...prev, recipeId]
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
        const response = await shoppingLists.createFromRecipes(
          selectedRecipes,
          selection.listName,
          selection.excludedIngredientIds
        );
        navigate(`/shopping-lists/${response.data.shoppingList.id}`);
      } else {
        // Add to existing shopping list
        await shoppingLists.addRecipesToList(
          selection.listId,
          selectedRecipes,
          selection.excludedIngredientIds
        );
        navigate(`/shopping-lists/${selection.listId}`);
      }

      setSelectedRecipes([]);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add to shopping list');
      setCreatingList(false);
      setShowShoppingListModal(true); // Reopen modal to show error
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

        {/* Search and Filters */}
        <div className="space-y-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              placeholder="Search recipes by title or ingredients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 input"
            />
            <Button type="submit">Search</Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? 'bg-primary-100' : ''}
            >
              <svg
                className="w-5 h-5 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              Filters
              {hasActiveFilters && (
                <span className="ml-1 bg-primary-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {selectedTags.length + (maxCookTime ? 1 : 0) + (sortBy !== 'createdAt' ? 1 : 0)}
                </span>
              )}
            </Button>
          </form>

          {/* Filter Panel */}
          {showFilters && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              {/* Sort and Cook Time Controls */}
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[150px]">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value);
                      setPage(1);
                    }}
                    className="w-full input"
                  >
                    {sortOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 min-w-[150px]">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
                  <select
                    value={sortOrder}
                    onChange={(e) => {
                      setSortOrder(e.target.value);
                      setPage(1);
                    }}
                    className="w-full input"
                  >
                    <option value="desc">{sortBy === 'title' ? 'Z to A' : 'Newest First'}</option>
                    <option value="asc">{sortBy === 'title' ? 'A to Z' : 'Oldest First'}</option>
                  </select>
                </div>
                <div className="flex-1 min-w-[150px]">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cook Time</label>
                  <select
                    value={maxCookTime}
                    onChange={(e) => {
                      setMaxCookTime(e.target.value);
                      setPage(1);
                    }}
                    className="w-full input"
                  >
                    {cookTimeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tags */}
              {availableTags.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filter by Tags
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => toggleTag(tag.name)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          selectedTags.includes(tag.name)
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {tag.name}
                        <span className="ml-1 opacity-60">({tag.recipe_count})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Clear Filters */}
              {hasActiveFilters && (
                <div className="pt-2 border-t">
                  <button
                    onClick={clearFilters}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Active Filters Display (when panel is collapsed) */}
          {!showFilters && hasActiveFilters && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm text-gray-500">Active filters:</span>
              {selectedTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary-100 text-primary-800"
                >
                  {tag}
                  <button onClick={() => toggleTag(tag)} className="ml-1 hover:text-primary-600">
                    ×
                  </button>
                </span>
              ))}
              {maxCookTime && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                  Under {maxCookTime} min
                  <button onClick={() => setMaxCookTime('')} className="ml-1 hover:text-blue-600">
                    ×
                  </button>
                </span>
              )}
              {sortBy !== 'createdAt' && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-200 text-gray-700">
                  Sorted by {sortOptions.find((o) => o.value === sortBy)?.label}
                </span>
              )}
              <button
                onClick={clearFilters}
                className="text-xs text-gray-500 hover:text-gray-700 underline"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

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
            <p className="mt-1 text-sm text-gray-500">Get started by adding your first recipe!</p>
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
                  {/* Selection checkbox - positioned over image or inline with title */}
                  {recipe.imageUrl ? (
                    <div className="absolute top-2 left-2 z-10">
                      <input
                        type="checkbox"
                        checked={selectedRecipes.includes(recipe.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleRecipeSelection(recipe.id);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500 bg-white cursor-pointer"
                      />
                    </div>
                  ) : (
                    <div className="absolute top-2 left-2 z-10">
                      <input
                        type="checkbox"
                        checked={selectedRecipes.includes(recipe.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleRecipeSelection(recipe.id);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500 bg-white cursor-pointer"
                      />
                    </div>
                  )}

                  <Link to={`/recipes/${recipe.id}`} className="block">
                    {recipe.imageUrl ? (
                      <img
                        src={recipe.imageUrl}
                        alt={recipe.title}
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className="h-12"></div>
                    )}
                    <div className={recipe.imageUrl ? 'p-4' : 'p-4 pt-8'}>
                      <h3 className="font-semibold text-lg mb-2 line-clamp-2">{recipe.title}</h3>
                      {recipe.description && (
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                          {recipe.description}
                        </p>
                      )}
                      <div className="flex items-center text-sm text-gray-500 space-x-4">
                        {recipe.totalTime && (
                          <span className="flex items-center">
                            <svg
                              className="w-4 h-4 mr-1"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            {formatDuration(recipe.totalTime)}
                          </span>
                        )}
                        {recipe.servings && (
                          <span className="flex items-center">
                            <svg
                              className="w-4 h-4 mr-1"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                              />
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
                <Button variant="secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>
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
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              Add {selectedRecipes.length} to Shopping List
            </Button>
          </div>
        )}

        {/* Shopping List Modal */}
        <ShoppingListSelectorModal
          isOpen={showShoppingListModal}
          onClose={() => {
            setShowShoppingListModal(false);
            setError(''); // Clear error when modal closes
          }}
          onConfirm={handleListSelection}
          recipeData={{
            defaultName: `Shopping List (${selectedRecipes.length} recipe${selectedRecipes.length > 1 ? 's' : ''})`,
            recipeIds: selectedRecipes,
          }}
          externalError={error}
        />
      </div>
    </Layout>
  );
}
