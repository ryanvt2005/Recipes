import { useState } from 'react';
import { TrashIcon } from '@heroicons/react/24/outline';
import { getCategoryList } from '../../core';

// Get categories in display order from core module
const CATEGORY_ORDER = getCategoryList();

export default function ShoppingItemsList({
  items,
  onToggleItem,
  onUpdateCategory,
  onDeleteItem,
  formatQuantity,
  isMobile = false,
}) {
  const [filter, setFilter] = useState('all'); // 'all' or 'unchecked'

  // Filter items based on current filter
  const filteredItems = filter === 'unchecked' ? items.filter((item) => !item.is_checked) : items;

  // Group items by category
  const groupedItems = filteredItems.reduce((groups, item) => {
    const category = item.category || 'Other';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(item);
    return groups;
  }, {});

  const checkedCount = items.filter((item) => item.is_checked).length;
  const totalCount = items.length;
  const uncheckedCount = totalCount - checkedCount;

  if (items.length === 0) {
    return (
      <div className="card">
        <p className="text-gray-500 text-center py-8">No items in this shopping list</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex gap-2 no-print">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 text-sm font-medium rounded-full transition-colors min-h-[44px] ${
            filter === 'all'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All ({totalCount})
        </button>
        <button
          onClick={() => setFilter('unchecked')}
          className={`px-4 py-2 text-sm font-medium rounded-full transition-colors min-h-[44px] ${
            filter === 'unchecked'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Remaining ({uncheckedCount})
        </button>
      </div>

      {/* Items by Category */}
      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <div className="card text-center py-8">
            <p className="text-gray-500">All items checked off! 🎉</p>
          </div>
        ) : (
          CATEGORY_ORDER.map((category) => {
            const categoryItems = groupedItems[category];

            if (!categoryItems || categoryItems.length === 0) {
              return null;
            }

            const categoryChecked = categoryItems.filter((item) => item.is_checked).length;
            const categoryTotal = categoryItems.length;

            return (
              <div key={category} className="card">
                {/* Category Header */}
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
                  <h3 className="text-base font-semibold text-gray-900 shopping-category">
                    {category}
                  </h3>
                  <span className="text-sm text-gray-500 no-print">
                    {categoryChecked}/{categoryTotal}
                  </span>
                </div>

                {/* Category Items */}
                <div className="space-y-2">
                  {categoryItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => onToggleItem(item.id, item.is_checked)}
                      className={`w-full flex items-start gap-3 p-3 rounded-lg border transition-colors text-left ${
                        item.is_checked
                          ? 'bg-gray-50 border-gray-200'
                          : 'bg-white border-gray-300 active:bg-primary-50 active:border-primary-300'
                      }`}
                    >
                      <div className="flex items-center min-w-[44px] min-h-[44px] justify-center -m-2">
                        <input
                          type="checkbox"
                          checked={item.is_checked}
                          onChange={() => {}} // Handled by button onClick
                          onClick={(e) => e.stopPropagation()}
                          className="w-6 h-6 text-primary-600 border-gray-300 rounded focus:ring-primary-500 pointer-events-none"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        {/* Main line: quantity unit ingredient (e.g., "8 oz Cheddar cheese") */}
                        <div
                          className={`font-medium shopping-item ${
                            item.is_checked ? 'line-through text-gray-500' : 'text-gray-900'
                          }`}
                        >
                          {item.quantity || item.unit
                            ? `${formatQuantity(item.quantity, item.unit)} ${item.ingredient_name}`
                            : item.ingredient_name}
                          {/* Show "to taste" or similar inline for quantity-less items */}
                          {!item.quantity && !item.unit && item.notes && (
                            <span
                              className={`ml-2 text-sm font-normal italic ${
                                item.is_checked ? 'text-gray-400' : 'text-gray-500'
                              }`}
                            >
                              ({item.notes})
                            </span>
                          )}
                        </div>
                        {/* Component breakdown for aggregated items (e.g., bell pepper colors) */}
                        {item.components && item.components.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {item.components.map((comp, idx) => (
                              <span
                                key={idx}
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  item.is_checked
                                    ? 'bg-gray-100 text-gray-400'
                                    : 'bg-primary-50 text-primary-700 border border-primary-200'
                                }`}
                              >
                                {comp.quantity && `${comp.quantity} `}
                                {comp.label}
                              </span>
                            ))}
                          </div>
                        )}
                        {/* Notes - show breakdown text (only if not already shown inline) */}
                        {item.notes && (item.quantity || item.unit) && (
                          <div
                            className={`text-sm mt-1 ${
                              item.is_checked ? 'text-gray-400' : 'text-gray-500'
                            }`}
                          >
                            {item.notes}
                          </div>
                        )}
                      </div>
                      {/* Category selector - only on desktop or when not in mobile tab view */}
                      {!isMobile && (
                        <select
                          value={item.category || 'Other'}
                          onChange={(e) => {
                            e.stopPropagation();
                            onUpdateCategory(item.id, e.target.value);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs px-2 py-1 border border-gray-300 rounded bg-white hover:border-primary-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 no-print self-center"
                        >
                          {CATEGORY_ORDER.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      )}
                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteItem(item.id, item.ingredient_name);
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors no-print self-center"
                        title="Delete item"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </button>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
