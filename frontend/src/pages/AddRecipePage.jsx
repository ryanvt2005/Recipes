import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { recipes } from '../services/api';
import Layout from '../components/Layout';
import Input from '../components/Input';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';

// Extraction status messages to cycle through during loading
const EXTRACTION_MESSAGES = [
  'Fetching recipe page...',
  'Looking for recipe data...',
  'Parsing ingredients...',
  'Extracting instructions...',
  'Almost there...',
];

export default function AddRecipePage() {
  const [mode, setMode] = useState('extract'); // 'extract' or 'manual'
  const [url, setUrl] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [extractedRecipe, setExtractedRecipe] = useState(null);
  const [extractionStatus, setExtractionStatus] = useState('');
  const [extractionMeta, setExtractionMeta] = useState(null); // Stores quality score, method, cached
  const [duplicateRecipe, setDuplicateRecipe] = useState(null); // Stores existing recipe if duplicate URL

  // Category state
  const [availableCuisines, setAvailableCuisines] = useState([]);
  const [availableMealTypes, setAvailableMealTypes] = useState([]);
  const [availableDietaryLabels, setAvailableDietaryLabels] = useState([]);
  const [selectedCuisines, setSelectedCuisines] = useState([]);
  const [selectedMealTypes, setSelectedMealTypes] = useState([]);
  const [selectedDietaryLabels, setSelectedDietaryLabels] = useState([]);

  const navigate = useNavigate();
  const statusIntervalRef = useRef(null);

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
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
    };
    fetchCategories();
  }, []);

  const handleStartManual = () => {
    setExtractedRecipe({
      title: '',
      author: '',
      description: '',
      prepTime: '',
      cookTime: '',
      servings: '',
      imageUrl: '',
      ingredients: [{ rawText: '', ingredient: '' }],
      instructions: [''],
    });
    setExtractionMeta(null); // Clear any previous extraction metadata
    setMode('manual');
  };

  const handleExtract = async (e) => {
    e.preventDefault();
    setError('');
    setDuplicateRecipe(null);
    setExtracting(true);
    setExtractionStatus(EXTRACTION_MESSAGES[0]);
    setExtractionMeta(null);

    // Cycle through status messages during extraction
    let messageIndex = 0;
    statusIntervalRef.current = setInterval(() => {
      messageIndex = (messageIndex + 1) % EXTRACTION_MESSAGES.length;
      setExtractionStatus(EXTRACTION_MESSAGES[messageIndex]);
    }, 2000);

    try {
      const response = await recipes.extract(url);
      const recipe = response.data.recipe;

      // Normalize servings if it's an array
      if (Array.isArray(recipe.servings)) {
        recipe.servings = recipe.servings[recipe.servings.length - 1];
      }

      // Store extraction metadata separately (quality score, method, cached)
      setExtractionMeta({
        method: recipe.extractionMethod || 'unknown',
        cached: recipe.cached || false,
        quality: recipe.extractionQuality || null,
        sourceUrl: recipe.sourceUrl || url,
      });

      // Pre-populate suggested categories from auto-tagger
      if (recipe.suggestedCuisines?.length > 0) {
        setSelectedCuisines(recipe.suggestedCuisines);
      }
      if (recipe.suggestedMealTypes?.length > 0) {
        setSelectedMealTypes(recipe.suggestedMealTypes);
      }
      if (recipe.suggestedDietaryLabels?.length > 0) {
        setSelectedDietaryLabels(recipe.suggestedDietaryLabels);
      }

      setExtractedRecipe(recipe);
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.details?.existingRecipe) {
        setDuplicateRecipe(err.response.data.details.existingRecipe);
        setError('You already have this recipe saved.');
      } else {
        setError(err.response?.data?.message || 'Failed to extract recipe from URL');
      }
    } finally {
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
        statusIntervalRef.current = null;
      }
      setExtracting(false);
      setExtractionStatus('');
    }
  };

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
      }
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      // Normalize recipe data before sending
      const recipeData = {
        ...extractedRecipe,
        // Convert servings array to string if needed
        servings: Array.isArray(extractedRecipe.servings)
          ? extractedRecipe.servings[extractedRecipe.servings.length - 1]
          : extractedRecipe.servings,
        // Ensure all ingredients have both rawText and ingredient fields
        // Remove sortOrder field as it's not allowed by validation
        ingredients: extractedRecipe.ingredients.map((ing) => {
          const { sortOrder, ...rest } = ing; // eslint-disable-line no-unused-vars
          return {
            ...rest,
            rawText: rest.rawText || rest.ingredient || '',
            ingredient: rest.ingredient || rest.rawText || '',
          };
        }),
        // Filter out any empty instructions
        instructions: extractedRecipe.instructions.filter((inst) => inst && inst.trim()),
      };

      // Remove fields that aren't allowed by backend validation
      delete recipeData.cached;
      delete recipeData.extractionMethod;
      delete recipeData.extractionQuality;

      // Add categories
      recipeData.cuisines = selectedCuisines;
      recipeData.mealTypes = selectedMealTypes;
      recipeData.dietaryLabels = selectedDietaryLabels;

      const response = await recipes.create(recipeData);
      navigate(`/recipes/${response.data.recipe.id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save recipe');
      setSaving(false);
    }
  };

  const handleFieldChange = (field, value) => {
    setExtractedRecipe({ ...extractedRecipe, [field]: value });
  };

  const handleIngredientChange = (index, field, value) => {
    const newIngredients = [...extractedRecipe.ingredients];
    // Update both rawText and ingredient fields to satisfy backend validation
    newIngredients[index] = {
      ...newIngredients[index],
      [field]: value,
      // If updating rawText, also update ingredient field
      ...(field === 'rawText' ? { ingredient: value } : {}),
    };
    setExtractedRecipe({ ...extractedRecipe, ingredients: newIngredients });
  };

  const handleInstructionChange = (index, value) => {
    const newInstructions = [...extractedRecipe.instructions];
    newInstructions[index] = value;
    setExtractedRecipe({ ...extractedRecipe, instructions: newInstructions });
  };

  const addIngredient = () => {
    setExtractedRecipe({
      ...extractedRecipe,
      ingredients: [...extractedRecipe.ingredients, { rawText: '', ingredient: '' }],
    });
  };

  const removeIngredient = (index) => {
    const newIngredients = extractedRecipe.ingredients.filter((_, i) => i !== index);
    setExtractedRecipe({ ...extractedRecipe, ingredients: newIngredients });
  };

  const addInstruction = () => {
    setExtractedRecipe({
      ...extractedRecipe,
      instructions: [...extractedRecipe.instructions, ''],
    });
  };

  const removeInstruction = (index) => {
    const newInstructions = extractedRecipe.instructions.filter((_, i) => i !== index);
    setExtractedRecipe({ ...extractedRecipe, instructions: newInstructions });
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold text-gray-900">Add Recipe</h1>

        {/* Mode Selection */}
        {!extractedRecipe && (
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">How would you like to add your recipe?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => setMode('extract')}
                className={`p-4 sm:p-6 border rounded-xl text-left hover:border-primary-500 transition ${
                  mode === 'extract' ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
                }`}
              >
                <div className="text-lg font-semibold mb-2">📎 Extract from URL</div>
                <p className="text-sm text-gray-600">
                  Automatically extract recipe details from a website URL
                </p>
              </button>
              <button
                onClick={handleStartManual}
                className={`p-4 sm:p-6 border rounded-xl text-left hover:border-primary-500 transition ${
                  mode === 'manual' ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
                }`}
              >
                <div className="text-lg font-semibold mb-2">✏️ Enter Manually</div>
                <p className="text-sm text-gray-600">Type in your recipe details by hand</p>
              </button>
            </div>
          </div>
        )}

        {/* URL Extraction */}
        {!extractedRecipe && mode === 'extract' && (
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Extract from URL</h2>
            <p className="text-gray-600 mb-4">
              Paste a recipe URL to automatically extract ingredients and instructions
            </p>

            <form onSubmit={handleExtract} className="space-y-4">
              <Input
                label="Recipe URL"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/recipe/chocolate-chip-cookies"
                required
              />

              {error && !duplicateRecipe && (
                <div className="rounded-md bg-red-50 p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {duplicateRecipe && (
                <div className="rounded-md bg-yellow-50 border border-yellow-200 p-4">
                  <div className="flex items-start gap-3">
                    {duplicateRecipe.imageUrl && (
                      <img
                        src={duplicateRecipe.imageUrl}
                        alt={duplicateRecipe.title}
                        className="w-16 h-16 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <h4 className="font-semibold text-yellow-800">{duplicateRecipe.title}</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        Saved on {new Date(duplicateRecipe.createdAt).toLocaleDateString()}
                      </p>
                      <div className="mt-3 flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => navigate(`/recipes/${duplicateRecipe.id}`)}
                        >
                          View Recipe
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setDuplicateRecipe(null);
                            setError('');
                            setUrl('');
                          }}
                        >
                          Try Different URL
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <Button type="submit" loading={extracting} className="w-full">
                {extracting ? 'Extracting Recipe...' : 'Extract Recipe'}
              </Button>
            </form>

            {extracting && (
              <div className="mt-6 text-center">
                <LoadingSpinner />
                <p className="mt-2 text-sm text-gray-600 font-medium">
                  {extractionStatus || 'Analyzing recipe...'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Extracted Recipe Edit */}
        {extractedRecipe && (
          <div className="space-y-6">
            {/* Extraction Quality Banner */}
            {extractionMeta && (
              <div
                className={`rounded-lg p-4 ${
                  extractionMeta.quality?.score >= 70
                    ? 'bg-green-50 border border-green-200'
                    : extractionMeta.quality?.score >= 50
                      ? 'bg-yellow-50 border border-yellow-200'
                      : 'bg-orange-50 border border-orange-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-800">
                        {extractionMeta.quality?.score >= 70
                          ? 'Extraction Complete'
                          : extractionMeta.quality?.score >= 50
                            ? 'Partial Extraction'
                            : 'Limited Extraction'}
                      </span>
                      {extractionMeta.cached && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          Cached
                        </span>
                      )}
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                        {extractionMeta.method === 'schema'
                          ? 'Schema.org'
                          : extractionMeta.method === 'wprm'
                            ? 'WP Recipe Maker'
                            : extractionMeta.method === 'llm'
                              ? 'AI Extraction'
                              : 'Unknown'}
                      </span>
                    </div>
                    {extractionMeta.quality && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">
                          Quality: {extractionMeta.quality.score}%
                        </span>
                        {extractionMeta.quality.missing?.length > 0 && (
                          <span className="ml-2">
                            Missing: {extractionMeta.quality.missing.join(', ')}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {extractionMeta.quality?.score < 70 && (
                    <p className="text-xs text-gray-500 max-w-[200px] text-right">
                      Please fill in the missing fields below
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Edit Recipe</h2>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setExtractedRecipe(null);
                    setExtractionMeta(null);
                  }}
                >
                  Start Over
                </Button>
              </div>

              <div className="space-y-4">
                <Input
                  label="Title"
                  value={extractedRecipe.title || ''}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  required
                />

                <Input
                  label="Author"
                  value={extractedRecipe.author || ''}
                  onChange={(e) => handleFieldChange('author', e.target.value)}
                  placeholder="Recipe author or source"
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={extractedRecipe.description || ''}
                    onChange={(e) => handleFieldChange('description', e.target.value)}
                    rows={3}
                    className="input"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label="Prep Time"
                    value={extractedRecipe.prepTime || ''}
                    onChange={(e) => handleFieldChange('prepTime', e.target.value)}
                    placeholder="15 minutes"
                  />
                  <Input
                    label="Cook Time"
                    value={extractedRecipe.cookTime || ''}
                    onChange={(e) => handleFieldChange('cookTime', e.target.value)}
                    placeholder="30 minutes"
                  />
                  <Input
                    label="Servings"
                    value={extractedRecipe.servings || ''}
                    onChange={(e) => handleFieldChange('servings', e.target.value)}
                    placeholder="4 servings"
                  />
                </div>

                <Input
                  label="Image URL"
                  type="url"
                  value={extractedRecipe.imageUrl || ''}
                  onChange={(e) => handleFieldChange('imageUrl', e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </div>

            {/* Ingredients */}
            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Ingredients</h3>
                <Button variant="secondary" onClick={addIngredient}>
                  + Add Ingredient
                </Button>
              </div>
              <div className="space-y-3">
                {(() => {
                  // Group ingredients by their group field for display
                  let lastGroup = null;
                  return extractedRecipe.ingredients.map((ingredient, index) => {
                    // Build display value from parsed components (clean, without section headers)
                    const displayValue = (() => {
                      if (ingredient.group && ingredient.ingredient) {
                        const parts = [];
                        if (ingredient.quantity) parts.push(ingredient.quantity);
                        if (ingredient.unit) parts.push(ingredient.unit);
                        parts.push(ingredient.ingredient);
                        if (ingredient.preparation) parts.push(`, ${ingredient.preparation}`);
                        return parts.join(' ');
                      }
                      return ingredient.rawText || ingredient.ingredient;
                    })();

                    // Check if we need to show a new group header
                    const showGroupHeader = ingredient.group && ingredient.group !== lastGroup;
                    lastGroup = ingredient.group;

                    return (
                      <div key={index}>
                        {showGroupHeader && (
                          <div className="flex items-center gap-2 mt-4 mb-2 first:mt-0">
                            <span className="text-sm font-semibold text-primary-700 bg-primary-50 px-3 py-1 rounded-full">
                              {ingredient.group}
                            </span>
                            <div className="flex-1 h-px bg-gray-200"></div>
                          </div>
                        )}
                        <div className="flex gap-2 items-start">
                          <Input
                            value={displayValue}
                            onChange={(e) =>
                              handleIngredientChange(index, 'rawText', e.target.value)
                            }
                            placeholder="e.g., 2 cups flour"
                            className="flex-1 !mb-0"
                          />
                          {extractedRecipe.ingredients.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeIngredient(index)}
                              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                              aria-label="Remove ingredient"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Instructions */}
            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Instructions</h3>
                <Button variant="secondary" onClick={addInstruction}>
                  + Add Step
                </Button>
              </div>
              <div className="space-y-3">
                {extractedRecipe.instructions.map((instruction, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <span className="text-gray-500 font-medium min-w-[24px] pt-3">
                      {index + 1}.
                    </span>
                    <textarea
                      value={instruction}
                      onChange={(e) => handleInstructionChange(index, e.target.value)}
                      rows={2}
                      className="input flex-1 min-h-[44px]"
                      placeholder={`Step ${index + 1}`}
                    />
                    {extractedRecipe.instructions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeInstruction(index)}
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
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Categories (Optional)</h3>

              {/* Cuisine */}
              {availableCuisines.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cuisine</label>
                  <div className="flex flex-wrap gap-2">
                    {availableCuisines.map((cuisine) => (
                      <button
                        key={cuisine.id}
                        type="button"
                        onClick={() =>
                          setSelectedCuisines((prev) =>
                            prev.includes(cuisine.id)
                              ? prev.filter((c) => c !== cuisine.id)
                              : [...prev, cuisine.id]
                          )
                        }
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          selectedCuisines.includes(cuisine.id)
                            ? 'bg-orange-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
                        }`}
                      >
                        {cuisine.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Meal Type */}
              {availableMealTypes.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Meal Type</label>
                  <div className="flex flex-wrap gap-2">
                    {availableMealTypes.map((mealType) => (
                      <button
                        key={mealType.id}
                        type="button"
                        onClick={() =>
                          setSelectedMealTypes((prev) =>
                            prev.includes(mealType.id)
                              ? prev.filter((m) => m !== mealType.id)
                              : [...prev, mealType.id]
                          )
                        }
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          selectedMealTypes.includes(mealType.id)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
                        }`}
                      >
                        {mealType.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Dietary */}
              {availableDietaryLabels.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Dietary</label>
                  <div className="flex flex-wrap gap-2">
                    {availableDietaryLabels.map((dietary) => (
                      <button
                        key={dietary.id}
                        type="button"
                        onClick={() =>
                          setSelectedDietaryLabels((prev) =>
                            prev.includes(dietary.id)
                              ? prev.filter((d) => d !== dietary.id)
                              : [...prev, dietary.id]
                          )
                        }
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          selectedDietaryLabels.includes(dietary.id)
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
                        }`}
                      >
                        {dietary.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-4">
              <Button variant="secondary" onClick={() => navigate('/recipes')}>
                Cancel
              </Button>
              <Button onClick={handleSave} loading={saving}>
                Save Recipe
              </Button>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
