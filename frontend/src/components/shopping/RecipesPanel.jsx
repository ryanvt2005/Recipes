import { Link } from 'react-router-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';

export default function RecipesPanel({ recipes, onRemoveRecipe, isMobile = false }) {
  if (recipes.length === 0) {
    return (
      <div className="card text-center py-8">
        <p className="text-gray-500">No recipes in this shopping list</p>
      </div>
    );
  }

  return (
    <div className={isMobile ? 'space-y-3' : 'card'}>
      {!isMobile && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recipes in this list</h3>
      )}
      <div className={isMobile ? 'space-y-3' : 'grid grid-cols-1 gap-3'}>
        {recipes.map((recipe) => (
          <div
            key={recipe.id}
            className={`flex gap-3 p-3 rounded-lg bg-white border border-gray-200 ${
              isMobile ? '' : 'hover:bg-gray-50'
            } transition-colors`}
          >
            <Link to={`/recipes/${recipe.id}`} className="flex gap-3 flex-1 min-w-0">
              {recipe.image_url && (
                <img
                  src={recipe.image_url}
                  alt={recipe.title}
                  className="w-16 h-16 object-cover rounded flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h4 className="font-medium text-gray-900 hover:text-primary-600 transition-colors line-clamp-2">
                  {recipe.title}
                </h4>
                {recipe.scaled_servings && (
                  <p className="text-sm text-gray-500 mt-1">
                    Scaled to {recipe.scaled_servings} servings
                  </p>
                )}
              </div>
            </Link>
            <button
              onClick={() => onRemoveRecipe(recipe.id, recipe.title)}
              className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors flex-shrink-0 self-center"
              title="Remove recipe from list"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
