import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { recipes, shoppingLists } from '../services/api';
import { formatScaledIngredient } from '../core';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import Button from '../components/Button';
import Input from '../components/Input';
import ShoppingListSelectorModal from '../components/ShoppingListSelectorModal';
import RecipeNotes from '../components/RecipeNotes';
import { MinusIcon, PlusIcon, ShoppingCartIcon, PrinterIcon, PencilIcon } from '@heroicons/react/24/outline';
import { formatDuration } from '../utils/timeFormatter';

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
  const [servingsInput, setServingsInput] = useState('');
  const [editingCategories, setEditingCategories] = useState(false);
  const [savingCategories, setSavingCategories] = useState(false);
  const [availableCuisines, setAvailableCuisines] = useState([]);
  const [availableMealTypes, setAvailableMealTypes] = useState([]);
  const [availableDietaryLabels, setAvailableDietaryLabels] = useState([]);
  const [selectedCuisines, setSelectedCuisines] = useState([]);
  const [selectedMealTypes, setSelectedMealTypes] = useState([]);
  const [selectedDietaryLabels, setSelectedDietaryLabels] = useState([]);

  // Edit mode state
  const [editing, setEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState(null);

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
      setServingsInput(servings ? String(servings) : '');
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
      setServingsInput(String(targetServings));
    } catch (err) {
      setScalingError('Failed to scale recipe');
    }
  };

  // Reset to original recipe
  const handleResetScale = () => {
    setRecipe(originalRecipe);
    const servings = parseServings(originalRecipe.servings);
    setCurrentServings(servings);
    setServingsInput(servings ? String(servings) : '');
    setScalingError('');
  };

  // Handle direct servings input change
  const handleServingsInputChange = (e) => {
    const value = e.target.value;
    // Allow empty or numeric input
    if (value === '' || /^\d+$/.test(value)) {
      setServingsInput(value);
    }
  };

  // Handle servings input blur or Enter key
  const handleServingsInputSubmit = () => {
    const value = parseInt(servingsInput, 10);
    if (value && value > 0 && value !== currentServings) {
      handleScaleRecipe(value);
    } else if (!value || value <= 0) {
      // Reset input to current value if invalid
      setServingsInput(currentServings ? String(currentServings) : '');
    }
  };

  // Handle Enter key in servings input
  const handleServingsKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur();
      handleServingsInputSubmit();
    }
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

  // Format ingredient for display using core module
  // Returns either a string or JSX element (for scaled ingredients with original)
  const formatQuantity = (ingredient) => {
    const { display, scaled, originalDisplay } = formatScaledIngredient(ingredient, true);

    if (scaled && originalDisplay) {
      // Get the parts for styled display
      const name = ingredient.ingredientName || ingredient.ingredient || '';
      const capitalizedName = name ? name.charAt(0).toUpperCase() + name.slice(1) : '';

      return (
        <span>
          <span className="font-semibold text-primary-700">
            {originalDisplay ? display.replace(capitalizedName, '').trim() : display}
          </span>{' '}
          {capitalizedName}
          <span className="text-xs text-gray-500 ml-2">(originally {originalDisplay})</span>
        </span>
      );
    }

    return display;
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

  // Start editing categories (standalone)
  const handleEditCategories = async () => {
    // Fetch available categories if not loaded
    if (availableCuisines.length === 0) {
      try {
        const [cuisinesRes, mealTypesRes, dietaryRes] = await Promise.all([
          recipes.getCuisines(),
          recipes.getMealTypes(),
          recipes.getDietaryLabels(),
        ]);
        setAvailableCuisines(cuisinesRes.data.cuisines || []);
        setAvailableMealTypes(mealTypesRes.data.mealTypes || []);
        setAvailableDietaryLabels(dietaryRes.data.dietaryLabels || []);
      } catch (err) {
        console.error('Failed to load categories:', err);
        return;
      }
    }

    // Pre-select current categories
    setSelectedCuisines(recipe.cuisines?.map((c) => c.id) || []);
    setSelectedMealTypes(recipe.mealTypes?.map((m) => m.id) || []);
    setSelectedDietaryLabels(recipe.dietaryLabels?.map((d) => d.id) || []);
    setEditingCategories(true);
  };

  // Toggle a category selection
  const toggleCategory = (categoryId, selected, setSelected) => {
    setSelected((prev) =>
      prev.includes(categoryId) ? prev.filter((x) => x !== categoryId) : [...prev, categoryId]
    );
  };

  // Save category changes (standalone)
  const handleSaveCategories = async () => {
    try {
      setSavingCategories(true);
      const response = await recipes.update(id, {
        cuisines: selectedCuisines,
        mealTypes: selectedMealTypes,
        dietaryLabels: selectedDietaryLabels,
      });
      setRecipe(response.data.recipe);
      setOriginalRecipe(response.data.recipe);
      setEditingCategories(false);
    } catch (err) {
      setError('Failed to update categories');
    } finally {
      setSavingCategories(false);
    }
  };

  // Handle print recipe
  const handlePrint = () => {
    window.print();
  };

  // --- Edit mode handlers ---

  const handleStartEditing = async () => {
    // Fetch categories if not loaded
    if (availableCuisines.length === 0) {
      try {
        const [cuisinesRes, mealTypesRes, dietaryRes] = await Promise.all([
          recipes.getCuisines(),
          recipes.getMealTypes(),
          recipes.getDietaryLabels(),
        ]);
        setAvailableCuisines(cuisinesRes.data.cuisines || []);
        setAvailableMealTypes(mealTypesRes.data.mealTypes || []);
        setAvailableDietaryLabels(dietaryRes.data.dietaryLabels || []);
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    }

    // Use the original (unscaled) recipe for editing
    const r = originalRecipe;
    setEditForm({
      title: r.title || '',
      description: r.description || '',
      servings: r.servings || '',
      prepTime: r.prepTime || '',
      cookTime: r.cookTime || '',
      totalTime: r.totalTime || '',
      sourceUrl: r.sourceUrl || '',
      imageUrl: r.imageUrl || '',
      ingredients: r.ingredients.map((ing) => ({
        rawText: ing.rawText || '',
        ingredient: ing.ingredientName || ing.ingredient || '',
        quantity: ing.quantity || null,
        unit: ing.unit || null,
        preparation: ing.preparation || null,
        group: ing.ingredientGroup || ing.group || null,
      })),
      instructions: r.instructions.map((inst) => inst.instructionText || inst),
    });

    // Pre-select current categories
    setSelectedCuisines(r.cuisines?.map((c) => c.id) || []);
    setSelectedMealTypes(r.mealTypes?.map((m) => m.id) || []);
    setSelectedDietaryLabels(r.dietaryLabels?.map((d) => d.id) || []);

    setEditing(true);
    setEditingCategories(false);
    setError('');
  };

  const handleCancelEditing = () => {
    setEditing(false);
    setEditForm(null);
    setError('');
  };

  const handleEditFieldChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditIngredientChange = (index, value) => {
    setEditForm((prev) => {
      const newIngredients = [...prev.ingredients];
      newIngredients[index] = {
        ...newIngredients[index],
        rawText: value,
        ingredient: value,
      };
      return { ...prev, ingredients: newIngredients };
    });
  };

  const handleAddEditIngredient = () => {
    setEditForm((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, { rawText: '', ingredient: '' }],
    }));
  };

  const handleRemoveEditIngredient = (index) => {
    setEditForm((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index),
    }));
  };

  const handleEditInstructionChange = (index, value) => {
    setEditForm((prev) => {
      const newInstructions = [...prev.instructions];
      newInstructions[index] = value;
      return { ...prev, instructions: newInstructions };
    });
  };

  const handleAddEditInstruction = () => {
    setEditForm((prev) => ({
      ...prev,
      instructions: [...prev.instructions, ''],
    }));
  };

  const handleRemoveEditInstruction = (index) => {
    setEditForm((prev) => ({
      ...prev,
      instructions: prev.instructions.filter((_, i) => i !== index),
    }));
  };

  const handleSaveEdit = async () => {
    setSavingEdit(true);
    setError('');

    try {
      const updateData = {
        title: editForm.title,
        description: editForm.description || null,
        servings: editForm.servings || null,
        prepTime: editForm.prepTime || null,
        cookTime: editForm.cookTime || null,
        totalTime: editForm.totalTime || null,
        sourceUrl: editForm.sourceUrl || null,
        imageUrl: editForm.imageUrl || null,
        ingredients: editForm.ingredients
          .filter((ing) => ing.rawText?.trim() || ing.ingredient?.trim())
          .map((ing) => ({
            rawText: ing.rawText || ing.ingredient || '',
            ingredient: ing.ingredient || ing.rawText || '',
            quantity: ing.quantity || null,
            unit: ing.unit || null,
            preparation: ing.preparation || null,
            group: ing.group || null,
          })),
        instructions: editForm.instructions.filter((inst) => inst?.trim()),
        cuisines: selectedCuisines,
        mealTypes: selectedMealTypes,
        dietaryLabels: selectedDietaryLabels,
      };

      const response = await recipes.update(id, updateData);
      const updatedRecipe = response.data.recipe;
      setRecipe(updatedRecipe);
      setOriginalRecipe(updatedRecipe);
      setEditing(false);
      setEditForm(null);

      // Update servings scaling state
      const servings = parseServings(updatedRecipe.servings);
      setCurrentServings(servings);
      setServingsInput(servings ? String(servings) : '');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save changes');
    } finally {
      setSavingEdit(false);
    }
  };

  // --- Render ---

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner className="py-12" />
      </Layout>
    );
  }

  if (!recipe && error) {
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

  if (!recipe) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-red-600">Recipe not found</p>
          <Link to="/recipes">
            <Button variant="secondary" className="mt-4">
              Back to Recipes
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  // --- Edit Mode ---
  if (editing && editForm) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Edit Recipe</h1>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleCancelEditing} disabled={savingEdit}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} loading={savingEdit}>
                Save Changes
              </Button>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Basic Info */}
          <div className="card space-y-4">
            <Input
              label="Title"
              value={editForm.title}
              onChange={(e) => handleEditFieldChange('title', e.target.value)}
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={editForm.description}
                onChange={(e) => handleEditFieldChange('description', e.target.value)}
                rows={3}
                className="input"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Prep Time"
                value={editForm.prepTime}
                onChange={(e) => handleEditFieldChange('prepTime', e.target.value)}
                placeholder="15 minutes"
              />
              <Input
                label="Cook Time"
                value={editForm.cookTime}
                onChange={(e) => handleEditFieldChange('cookTime', e.target.value)}
                placeholder="30 minutes"
              />
              <Input
                label="Servings"
                value={editForm.servings}
                onChange={(e) => handleEditFieldChange('servings', e.target.value)}
                placeholder="4 servings"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Image URL"
                type="url"
                value={editForm.imageUrl}
                onChange={(e) => handleEditFieldChange('imageUrl', e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
              <Input
                label="Source URL"
                type="url"
                value={editForm.sourceUrl}
                onChange={(e) => handleEditFieldChange('sourceUrl', e.target.value)}
                placeholder="https://example.com/recipe"
              />
            </div>
          </div>

          {/* Ingredients */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Ingredients</h3>
              <Button variant="secondary" onClick={handleAddEditIngredient}>
                + Add Ingredient
              </Button>
            </div>
            <div className="space-y-3">
              {editForm.ingredients.map((ingredient, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <Input
                    value={ingredient.rawText || ''}
                    onChange={(e) => handleEditIngredientChange(index, e.target.value)}
                    placeholder="e.g., 2 cups flour"
                    className="flex-1 !mb-0"
                  />
                  {editForm.ingredients.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveEditIngredient(index)}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                      aria-label="Remove ingredient"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Instructions</h3>
              <Button variant="secondary" onClick={handleAddEditInstruction}>
                + Add Step
              </Button>
            </div>
            <div className="space-y-3">
              {editForm.instructions.map((instruction, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <span className="text-gray-500 font-medium min-w-[24px] pt-3">
                    {index + 1}.
                  </span>
                  <textarea
                    value={instruction}
                    onChange={(e) => handleEditInstructionChange(index, e.target.value)}
                    rows={2}
                    className="input flex-1 min-h-[44px]"
                    placeholder={`Step ${index + 1}`}
                  />
                  {editForm.instructions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveEditInstruction(index)}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                      aria-label="Remove step"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div className="card space-y-4">
            <h3 className="text-lg font-semibold">Categories</h3>

            {availableCuisines.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cuisine</label>
                <div className="flex flex-wrap gap-2">
                  {availableCuisines.map((cuisine) => (
                    <button
                      key={cuisine.id}
                      type="button"
                      onClick={() => toggleCategory(cuisine.id, selectedCuisines, setSelectedCuisines)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        selectedCuisines.includes(cuisine.id)
                          ? 'bg-orange-500 text-white'
                          : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
                      }`}
                    >
                      {cuisine.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {availableMealTypes.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Meal Type</label>
                <div className="flex flex-wrap gap-2">
                  {availableMealTypes.map((mealType) => (
                    <button
                      key={mealType.id}
                      type="button"
                      onClick={() => toggleCategory(mealType.id, selectedMealTypes, setSelectedMealTypes)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        selectedMealTypes.includes(mealType.id)
                          ? 'bg-blue-500 text-white'
                          : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                      }`}
                    >
                      {mealType.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {availableDietaryLabels.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Dietary Labels</label>
                <div className="flex flex-wrap gap-2">
                  {availableDietaryLabels.map((label) => (
                    <button
                      key={label.id}
                      type="button"
                      onClick={() => toggleCategory(label.id, selectedDietaryLabels, setSelectedDietaryLabels)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        selectedDietaryLabels.includes(label.id)
                          ? 'bg-green-500 text-white'
                          : 'bg-green-50 text-green-700 hover:bg-green-100'
                      }`}
                    >
                      {label.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Save/Cancel */}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={handleCancelEditing} disabled={savingEdit}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} loading={savingEdit}>
              Save Changes
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  // --- View Mode ---
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
            className="w-full h-56 sm:h-96 object-cover rounded-2xl mb-6"
            loading="eager"
          />
        )}

        {/* Title and Actions */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{recipe.title}</h1>
            {recipe.description && (
              <p className="text-gray-600 text-base sm:text-lg">{recipe.description}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2 no-print">
            <Button
              onClick={handleStartEditing}
              variant="outline"
              className="flex items-center gap-2 min-h-[44px]"
            >
              <PencilIcon className="w-5 h-5" />
              <span className="hidden sm:inline">Edit</span>
            </Button>
            <Button
              onClick={handlePrint}
              variant="outline"
              className="flex items-center gap-2 min-h-[44px]"
            >
              <PrinterIcon className="w-5 h-5" />
              <span className="hidden sm:inline">Print</span>
            </Button>
            <Button
              onClick={handleAddToShoppingList}
              loading={creatingList}
              className="flex items-center gap-2 min-h-[44px]"
            >
              <ShoppingCartIcon className="w-5 h-5" />
              <span className="hidden sm:inline">
                {recipe.isScaled
                  ? `Add to List (${currentServings} servings)`
                  : 'Add to Shopping List'}
              </span>
              <span className="sm:hidden">Add to List</span>
            </Button>
            <Button
              variant="secondary"
              onClick={handleDelete}
              loading={deleting}
              className="min-h-[44px]"
            >
              Delete
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4 mb-6">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Meta Info */}
        <div className="flex flex-wrap gap-6 mb-8 text-sm">
          {recipe.prepTime && (
            <div className="flex items-center text-gray-500">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>
                <strong>Prep:</strong> {formatDuration(recipe.prepTime)}
              </span>
            </div>
          )}
          {recipe.cookTime && (
            <div className="flex items-center text-gray-500">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
                />
              </svg>
              <span>
                <strong>Cook:</strong> {formatDuration(recipe.cookTime)}
              </span>
            </div>
          )}
          {recipe.totalTime && (
            <div className="flex items-center text-gray-500">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>
                <strong>Total:</strong> {formatDuration(recipe.totalTime)}
              </span>
            </div>
          )}
          {recipe.servings && (
            <div className="flex items-center text-gray-500">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
          <div className="card mb-8 bg-gray-50 border border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">Servings:</span>
                <button
                  onClick={decreaseServings}
                  disabled={currentServings <= 1}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Decrease servings"
                >
                  <MinusIcon className="w-4 h-4 text-gray-700" />
                </button>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={servingsInput}
                  onChange={handleServingsInputChange}
                  onBlur={handleServingsInputSubmit}
                  onKeyDown={handleServingsKeyDown}
                  className="w-16 text-center text-xl font-bold text-primary-700 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  title="Enter desired servings"
                  aria-label="Number of servings"
                />
                <button
                  onClick={increaseServings}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
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
                      className={`px-3 py-1 min-h-[36px] rounded text-sm font-medium transition-colors ${
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
                  className="inline-block bg-primary-50 text-primary-700 px-3 py-1 rounded-md text-sm"
                >
                  {tag.name || tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Categories */}
        {editingCategories ? (
          <div className="mb-8 card no-print">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-900">Edit Categories</h3>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setEditingCategories(false)}
                  disabled={savingCategories}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveCategories}
                  loading={savingCategories}
                >
                  Save
                </Button>
              </div>
            </div>

            {/* Cuisines */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Cuisine</label>
              <div className="flex flex-wrap gap-2">
                {availableCuisines.map((cuisine) => (
                  <button
                    key={cuisine.id}
                    type="button"
                    onClick={() => toggleCategory(cuisine.id, selectedCuisines, setSelectedCuisines)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      selectedCuisines.includes(cuisine.id)
                        ? 'bg-orange-500 text-white'
                        : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
                    }`}
                  >
                    {cuisine.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Meal Types */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Meal Type</label>
              <div className="flex flex-wrap gap-2">
                {availableMealTypes.map((mealType) => (
                  <button
                    key={mealType.id}
                    type="button"
                    onClick={() => toggleCategory(mealType.id, selectedMealTypes, setSelectedMealTypes)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      selectedMealTypes.includes(mealType.id)
                        ? 'bg-blue-500 text-white'
                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                    }`}
                  >
                    {mealType.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Dietary Labels */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Dietary Labels</label>
              <div className="flex flex-wrap gap-2">
                {availableDietaryLabels.map((label) => (
                  <button
                    key={label.id}
                    type="button"
                    onClick={() => toggleCategory(label.id, selectedDietaryLabels, setSelectedDietaryLabels)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      selectedDietaryLabels.includes(label.id)
                        ? 'bg-green-500 text-white'
                        : 'bg-green-50 text-green-700 hover:bg-green-100'
                    }`}
                  >
                    {label.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-8">
            <div className="flex flex-wrap gap-2 items-center">
              {recipe.cuisines?.map((cuisine) => (
                <span
                  key={cuisine.id}
                  className="inline-block bg-orange-50 text-orange-700 px-3 py-1 rounded-md text-sm"
                >
                  {cuisine.name}
                </span>
              ))}
              {recipe.mealTypes?.map((mealType) => (
                <span
                  key={mealType.id}
                  className="inline-block bg-blue-50 text-blue-700 px-3 py-1 rounded-md text-sm"
                >
                  {mealType.name}
                </span>
              ))}
              {recipe.dietaryLabels?.map((dietary) => (
                <span
                  key={dietary.id}
                  className="inline-block bg-green-50 text-green-700 px-3 py-1 rounded-md text-sm"
                >
                  {dietary.name}
                </span>
              ))}
              <button
                onClick={handleEditCategories}
                className="no-print inline-block text-gray-400 hover:text-gray-600 px-2 py-1 text-sm transition-colors"
                title="Edit categories"
              >
                {recipe.cuisines?.length > 0 || recipe.mealTypes?.length > 0 || recipe.dietaryLabels?.length > 0
                  ? 'Edit'
                  : '+ Add categories'}
              </button>
            </div>
          </div>
        )}

        {/* Content Grid */}
        <div className="grid md:grid-cols-5 gap-8">
          {/* Ingredients */}
          <div className="md:col-span-2 card !p-4 sm:!p-6">
            <h2 className="text-2xl font-bold mb-4">Ingredients</h2>
            <ul className="space-y-2">
              {(() => {
                let lastGroup = null;
                return recipe.ingredients.map((ingredient, index) => {
                  const showGroupHeader = ingredient.ingredientGroup && ingredient.ingredientGroup !== lastGroup;
                  lastGroup = ingredient.ingredientGroup;

                  return (
                    <li key={ingredient.id || index}>
                      {showGroupHeader && (
                        <div className="flex items-center gap-2 mt-4 mb-2 first:mt-0">
                          <span className="text-xs font-semibold uppercase tracking-wide text-primary-700 bg-primary-50 px-3 py-1 rounded-md">
                            {ingredient.ingredientGroup}
                          </span>
                          <div className="flex-1 h-px bg-gray-200"></div>
                        </div>
                      )}
                      <div className="flex items-start">
                        <input type="checkbox" className="mt-1 mr-3 h-4 w-4 text-primary-600 rounded" />
                        <span className="text-gray-700">{formatQuantity(ingredient)}</span>
                      </div>
                    </li>
                  );
                });
              })()}
            </ul>
          </div>

          {/* Instructions */}
          <div className="md:col-span-3 card !p-4 sm:!p-6">
            <h2 className="text-2xl font-bold mb-4">Instructions</h2>
            <ol className="space-y-4">
              {recipe.instructions.map((instruction, index) => (
                <li key={instruction.id || index} className="flex">
                  <span className="flex-shrink-0 w-7 h-7 bg-primary-600 text-white rounded-lg flex items-center justify-center text-sm font-semibold mr-4">
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
