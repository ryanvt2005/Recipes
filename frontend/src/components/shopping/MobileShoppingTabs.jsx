import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react';
import { ClipboardDocumentListIcon, BookOpenIcon } from '@heroicons/react/24/outline';
import RecipesPanel from './RecipesPanel';
import ShoppingItemsList from './ShoppingItemsList';

export default function MobileShoppingTabs({
  items,
  recipes,
  onToggleItem,
  onUpdateCategory,
  onRemoveRecipe,
  formatQuantity,
  checkedCount,
  totalCount,
}) {
  return (
    <TabGroup>
      <TabList className="flex gap-2 p-1 bg-gray-100 rounded-xl mb-4">
        <Tab
          className={({ selected }) =>
            `flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium rounded-lg transition-colors min-h-[48px] ${
              selected
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`
          }
        >
          <ClipboardDocumentListIcon className="w-5 h-5" />
          <span>
            Items{' '}
            <span className="text-xs">
              ({checkedCount}/{totalCount})
            </span>
          </span>
        </Tab>
        <Tab
          className={({ selected }) =>
            `flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium rounded-lg transition-colors min-h-[48px] ${
              selected
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`
          }
        >
          <BookOpenIcon className="w-5 h-5" />
          <span>
            Recipes <span className="text-xs">({recipes.length})</span>
          </span>
        </Tab>
      </TabList>

      <TabPanels>
        <TabPanel>
          <ShoppingItemsList
            items={items}
            onToggleItem={onToggleItem}
            onUpdateCategory={onUpdateCategory}
            formatQuantity={formatQuantity}
            isMobile={true}
          />
        </TabPanel>
        <TabPanel>
          <RecipesPanel recipes={recipes} onRemoveRecipe={onRemoveRecipe} isMobile={true} />
        </TabPanel>
      </TabPanels>
    </TabGroup>
  );
}
