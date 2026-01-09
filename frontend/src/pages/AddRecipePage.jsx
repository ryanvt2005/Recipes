import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { recipes } from '../services/api';
import Layout from '../components/Layout';
import Input from '../components/Input';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';

export default function AddRecipePage() {
  const [mode, setMode] = useState('extract'); // 'extract' or 'manual'
  const [url, setUrl] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [extractedRecipe, setExtractedRecipe] = useState(null);

  const navigate = useNavigate();

  const handleStartManual = () => {
    setExtractedRecipe({
      title: '',
      description: '',
      prepTime: '',
      cookTime: '',
      servings: '',
      imageUrl: '',
      ingredients: [{ rawText: '', ingredient: '' }],
      instructions: ['']
    });
    setMode('manual');
  };

  const handleExtract = async (e) => {
    e.preventDefault();
    setError('');
    setExtracting(true);

    try {
      const response = await recipes.extract(url);
      const recipe = response.data.recipe;

      // Normalize servings if it's an array
      if (Array.isArray(recipe.servings)) {
        recipe.servings = recipe.servings[recipe.servings.length - 1];
      }

      setExtractedRecipe(recipe);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to extract recipe from URL');
    } finally {
      setExtracting(false);
    }
  };

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
        ingredients: extractedRecipe.ingredients.map(ing => {
          const { sortOrder, ...rest } = ing; // eslint-disable-line no-unused-vars
          return {
            ...rest,
            rawText: rest.rawText || rest.ingredient || '',
            ingredient: rest.ingredient || rest.rawText || ''
          };
        }),
        // Filter out any empty instructions
        instructions: extractedRecipe.instructions.filter(inst => inst && inst.trim())
      };

      // Remove fields that aren't allowed by backend validation
      delete recipeData.cached;
      delete recipeData.extractionMethod;

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
      ...(field === 'rawText' ? { ingredient: value } : {})
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
      ingredients: [...extractedRecipe.ingredients, { rawText: '', ingredient: '' }]
    });
  };

  const removeIngredient = (index) => {
    const newIngredients = extractedRecipe.ingredients.filter((_, i) => i !== index);
    setExtractedRecipe({ ...extractedRecipe, ingredients: newIngredients });
  };

  const addInstruction = () => {
    setExtractedRecipe({
      ...extractedRecipe,
      instructions: [...extractedRecipe.instructions, '']
    });
  };

  const removeInstruction = (index) => {
    const newInstructions = extractedRecipe.instructions.filter((_, i) => i !== index);
    setExtractedRecipe({ ...extractedRecipe, instructions: newInstructions });
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Add Recipe</h1>

        {/* Mode Selection */}
        {!extractedRecipe && (
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">How would you like to add your recipe?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => setMode('extract')}
                className={`p-6 border-2 rounded-lg text-left hover:border-primary-500 transition ${
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
                className={`p-6 border-2 rounded-lg text-left hover:border-primary-500 transition ${
                  mode === 'manual' ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
                }`}
              >
                <div className="text-lg font-semibold mb-2">✏️ Enter Manually</div>
                <p className="text-sm text-gray-600">
                  Type in your recipe details by hand
                </p>
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

              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <Button type="submit" loading={extracting} className="w-full">
                {extracting ? 'Extracting Recipe...' : 'Extract Recipe'}
              </Button>
            </form>

            {extracting && (
              <div className="mt-6 text-center">
                <LoadingSpinner />
                <p className="mt-2 text-sm text-gray-600">
                  Analyzing recipe... This may take a few seconds
                </p>
              </div>
            )}
          </div>
        )}

        {/* Extracted Recipe Edit */}
        {extractedRecipe && (
          <div className="space-y-6">
            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Edit Recipe</h2>
                <Button variant="secondary" onClick={() => setExtractedRecipe(null)}>
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

                <div className="grid grid-cols-3 gap-4">
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
                {extractedRecipe.ingredients.map((ingredient, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={ingredient.rawText || ingredient.ingredient}
                      onChange={(e) => handleIngredientChange(index, 'rawText', e.target.value)}
                      placeholder="e.g., 2 cups flour"
                      className="flex-1"
                    />
                    {extractedRecipe.ingredients.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeIngredient(index)}
                        className="text-red-600 hover:text-red-800 px-2"
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
                <Button variant="secondary" onClick={addInstruction}>
                  + Add Step
                </Button>
              </div>
              <div className="space-y-3">
                {extractedRecipe.instructions.map((instruction, index) => (
                  <div key={index} className="flex gap-2">
                    <span className="text-gray-500 font-medium mt-2">{index + 1}.</span>
                    <textarea
                      value={instruction}
                      onChange={(e) => handleInstructionChange(index, e.target.value)}
                      rows={2}
                      className="input flex-1"
                      placeholder={`Step ${index + 1}`}
                    />
                    {extractedRecipe.instructions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeInstruction(index)}
                        className="text-red-600 hover:text-red-800 px-2"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
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
