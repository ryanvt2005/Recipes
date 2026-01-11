import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { recipes, shoppingLists } from '../services/api';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import Button from '../components/Button';
import ShoppingListSelectorModal from '../components/ShoppingListSelectorModal';
import RecipeNotes from '../components/RecipeNotes';
import { MinusIcon, PlusIcon, ShoppingCartIcon, PrinterIcon } from '@heroicons/react/24/outline';

export default function RecipeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState(null);
  const [originalRecipe, setOriginalRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [currentServings, setCurrentServings] = useState(null);
  const [scalingError, setScalingError] = useState('');
  const [creatingList, setCreatingList] = useState(false);
  const [showListModal, setShowListModal] = useState(false);

  useEffect(() => {
    fetchRecipe();
  }, [id]);

  const fetchRecipe = async () => {
    try {
      setLoading(true);
      const response = await recipes.getOne(id);
      const fetchedRecipe = response.data.recipe;
      setRecipe(fetchedRecipe);
      setOriginalRecipe(fetchedRecipe);

      // Parse initial servings
      const servings = parseServings(fetchedRecipe.servings);
      setCurrentServings(servings);
    } catch (err) {
      setError('Failed to load recipe');
    } finally {
      setLoading(false);
    }
  };

  // Helper to parse servings from string
  const parseServings = (servingsStr) => {
    if (!servingsStr) return null;
    const match = String(servingsStr).match(/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  };

  // Scale recipe to target servings
  const handleScaleRecipe = async (targetServings) => {
    if (!targetServings || targetServings <= 0) return;

    setScalingError('');

    try {
      const response = await recipes.getScaled(id, targetServings);
      const scaledRecipe = response.data.recipe;

      if (scaledRecipe.scalingError) {
        setScalingError(scaledRecipe.scalingError);
        return;
      }

      setRecipe(scaledRecipe);
      setCurrentServings(targetServings);
    } catch (err) {
      setScalingError('Failed to scale recipe');
    }
  };

  // Reset to original recipe
  const handleResetScale = () => {
    setRecipe(originalRecipe);
    const servings = parseServings(originalRecipe.servings);
    setCurrentServings(servings);
    setScalingError('');
  };

  // Increase servings
  const increaseServings = () => {
    if (currentServings) {
      handleScaleRecipe(currentServings + 1);
    }
  };

  // Decrease servings
  const decreaseServings = () => {
    if (currentServings && currentServings > 1) {
      handleScaleRecipe(currentServings - 1);
    }
  };

  // Get original servings for multiplier buttons
  const getOriginalServings = () => {
    return parseServings(originalRecipe?.servings);
  };

  // Handle multiplier button click (1x, 2x, 3x)
  const handleMultiplier = (multiplier) => {
    const originalServings = getOriginalServings();
    if (originalServings) {
      handleScaleRecipe(originalServings * multiplier);
    }
  };

  // Format ingredient quantity for display
  const formatQuantity = (ingredient) => {
    if (!ingredient.quantity) {
      return ingredient.rawText;
    }

    const qty = ingredient.quantity;
    let displayQty = String(qty);

    // Convert decimals to fractions
    const fractionMap = {
      0.125: '⅛',
      0.25: '¼',
      0.333: '⅓',
      0.375: '⅜',
      0.5: '½',
      0.625: '⅝',
      0.666: '⅔',
      0.75: '¾',
      0.875: '⅞',
    };

    const whole = Math.floor(qty);
    const fraction = qty - whole;

    for (const [decimal, frac] of Object.entries(fractionMap)) {
      if (Math.abs(fraction - parseFloat(decimal)) < 0.01) {
        displayQty = whole > 0 ? `${whole} ${frac}` : frac;
        break;
      }
    }

    // If not converted to fraction, format decimal
    if (displayQty === String(qty) && fraction > 0.01) {
      displayQty = qty.toFixed(2);
    } else if (fraction < 0.01) {
      displayQty = String(whole);
    }

    const unit = ingredient.unit || '';
    const name = ingredient.ingredientName || '';

    // Show original if scaled
    if (ingredient.originalQuantity && Math.abs(ingredient.originalQuantity - qty) > 0.01) {
      const originalQty = ingredient.originalQuantity;
      let originalDisplay = String(originalQty);

      const originalWhole = Math.floor(originalQty);
      const originalFraction = originalQty - originalWhole;

      for (const [decimal, frac] of Object.entries(fractionMap)) {
        if (Math.abs(originalFraction - parseFloat(decimal)) < 0.01) {
          originalDisplay = originalWhole > 0 ? `${originalWhole} ${frac}` : frac;
          break;
        }
      }

      if (originalDisplay === String(originalQty) && originalFraction > 0.01) {
        originalDisplay = originalQty.toFixed(2);
      } else if (originalFraction < 0.01) {
        originalDisplay = String(originalWhole);
      }

      return (
        <span>
          <span className="font-semibold text-primary-700">
            {displayQty} {unit}
          </span>{' '}
          {name}
          <span className="text-xs text-gray-500 ml-2">
            (originally {originalDisplay} {unit})
          </span>
        </span>
      );
    }

    return `${displayQty} ${unit} ${name}`.trim();
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this recipe?')) {
      return;
    }

    try {
      setDeleting(true);
      await recipes.delete(id);
      navigate('/recipes');
    } catch (err) {
      setError('Failed to delete recipe');
      setDeleting(false);
    }
  };

  // Show modal to select shopping list
  const handleAddToShoppingList = () => {
    setShowListModal(true);
  };

  // Handle shopping list selection from modal
  const handleListSelection = async (selection) => {
    try {
      setCreatingList(true);
      setShowListModal(false);
      setError('');

      // Prepare recipe data with scaled servings if applicable
      const recipeData = {
        recipeId: id,
        scaledServings: recipe.isScaled ? currentServings : null,
      };

      if (selection.isNewList) {
        // Create new shopping list
        const response = await shoppingLists.createFromRecipes([recipeData], selection.listName);
        navigate(`/shopping-lists/${response.data.shoppingList.id}`);
      } else {
        // Add to existing shopping list
        await shoppingLists.addRecipesToList(selection.listId, [recipeData]);
        navigate(`/shopping-lists/${selection.listId}`);
      }
    } catch (err) {
      setError('Failed to add to shopping list');
      setCreatingList(false);
    }
  };

  // Handle print recipe
  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner className="py-12" />
      </Layout>
    );
  }

  if (error || !recipe) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-red-600">{error || 'Recipe not found'}</p>
          <Link to="/recipes">
            <Button variant="secondary" className="mt-4">
              Back to Recipes
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <ShoppingListSelectorModal
        isOpen={showListModal}
        onClose={() => setShowListModal(false)}
        onConfirm={handleListSelection}
        recipeData={{
          defaultName: recipe.isScaled
            ? `${recipe.title} (${currentServings} servings)`
            : recipe.title,
        }}
      />

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link to="/recipes" className="text-primary-600 hover:text-primary-700 text-sm">
            ← Back to Recipes
          </Link>
        </div>

        {/* Recipe Image */}
        {recipe.imageUrl && (
          <img
            src={recipe.imageUrl}
            alt={recipe.title}
            className="w-full h-96 object-cover rounded-lg mb-6"
          />
        )}

        {/* Title and Actions */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">{recipe.title}</h1>
            {recipe.description && <p className="text-gray-600 text-lg">{recipe.description}</p>}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handlePrint}
              variant="outline"
              className="flex items-center gap-2 no-print"
            >
              <PrinterIcon className="w-5 h-5" />
              Print
            </Button>
            <Button
              onClick={handleAddToShoppingList}
              loading={creatingList}
              className="flex items-center gap-2 no-print"
            >
              <ShoppingCartIcon className="w-5 h-5" />
              {recipe.isScaled
                ? `Add to List (${currentServings} servings)`
                : 'Add to Shopping List'}
            </Button>
            <Button variant="secondary" onClick={handleDelete} loading={deleting} className="no-print">
              Delete
            </Button>
          </div>
        </div>

        {/* Meta Info */}
        <div className="flex flex-wrap gap-6 mb-8 text-sm">
          {recipe.prepTime && (
            <div className="flex items-center text-gray-600">
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>
                <strong>Prep:</strong> {recipe.prepTime}
              </span>
            </div>
          )}
          {recipe.cookTime && (
            <div className="flex items-center text-gray-600">
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
                />
              </svg>
              <span>
                <strong>Cook:</strong> {recipe.cookTime}
              </span>
            </div>
          )}
          {recipe.totalTime && (
            <div className="flex items-center text-gray-600">
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>
                <strong>Total:</strong> {recipe.totalTime}
              </span>
            </div>
          )}
          {recipe.servings && (
            <div className="flex items-center text-gray-600">
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <span>
                <strong>Servings:</strong> {recipe.servings}
              </span>
            </div>
          )}
        </div>

        {/* Recipe Scaling */}
        {currentServings && (
          <div className="card mb-8 bg-gradient-to-r from-primary-50 to-blue-50">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">Servings:</span>
                <button
                  onClick={decreaseServings}
                  disabled={currentServings <= 1}
                  className="p-1 rounded bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Decrease servings"
                >
                  <MinusIcon className="w-4 h-4 text-gray-700" />
                </button>
                <div className="text-center min-w-[60px]">
                  <div className="text-xl font-bold text-primary-700">{currentServings}</div>
                </div>
                <button
                  onClick={increaseServings}
                  className="p-1 rounded bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
                  title="Increase servings"
                >
                  <PlusIcon className="w-4 h-4 text-gray-700" />
                </button>
              </div>

              {/* Quick multiplier buttons */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600 mr-1">Quick:</span>
                {[1, 2, 3].map((multiplier) => {
                  const originalServings = getOriginalServings();
                  const targetServings = originalServings * multiplier;
                  const isActive = currentServings === targetServings;

                  return (
                    <button
                      key={multiplier}
                      onClick={() => handleMultiplier(multiplier)}
                      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-primary-600 text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                      title={`${multiplier}× original (${targetServings} servings)`}
                    >
                      {multiplier}×
                    </button>
                  );
                })}
              </div>

              {recipe.isScaled && (
                <button
                  onClick={handleResetScale}
                  className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                >
                  Reset
                </button>
              )}
            </div>

            {scalingError && (
              <div className="mt-3 text-sm text-red-600 bg-red-50 p-2 rounded">{scalingError}</div>
            )}

            {recipe.isScaled && (
              <div className="mt-3 text-xs text-blue-800 bg-blue-100 p-2 rounded-lg">
                💡 <strong>Tip:</strong> Ingredient quantities have been automatically adjusted.
                Scaled amounts are shown in{' '}
                <span className="font-semibold text-primary-700">bold</span> with original amounts
                in gray.
              </div>
            )}
          </div>
        )}

        {/* Tags */}
        {recipe.tags && recipe.tags.length > 0 && (
          <div className="mb-8">
            <div className="flex flex-wrap gap-2">
              {recipe.tags.map((tag) => (
                <span
                  key={tag.id || tag}
                  className="inline-block bg-primary-100 text-primary-800 px-3 py-1 rounded-full text-sm"
                >
                  {tag.name || tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Content Grid */}
        <div className="grid md:grid-cols-5 gap-8">
          {/* Ingredients */}
          <div className="md:col-span-2 card">
            <h2 className="text-2xl font-bold mb-4">Ingredients</h2>
            <ul className="space-y-2">
              {recipe.ingredients.map((ingredient, index) => (
                <li key={ingredient.id || index} className="flex items-start">
                  <input type="checkbox" className="mt-1 mr-3 h-4 w-4 text-primary-600 rounded" />
                  <span className="text-gray-700">{formatQuantity(ingredient)}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Instructions */}
          <div className="md:col-span-3 card">
            <h2 className="text-2xl font-bold mb-4">Instructions</h2>
            <ol className="space-y-4">
              {recipe.instructions.map((instruction, index) => (
                <li key={instruction.id || index} className="flex">
                  <span className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-semibold mr-4">
                    {instruction.stepNumber || index + 1}
                  </span>
                  <p className="text-gray-700 pt-1">{instruction.instructionText || instruction}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Recipe Notes */}
        <div className="mt-8">
          <RecipeNotes recipeId={id} />
        </div>

        {/* Source Link */}
        {recipe.sourceUrl && (
          <div className="mt-8 text-center">
            <a
              href={recipe.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:text-primary-700 text-sm"
            >
              View Original Recipe →
            </a>
          </div>
        )}
      </div>
    </Layout>
  );
}
