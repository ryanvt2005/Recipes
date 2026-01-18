/**
 * Unit tests for Shopping Items Display Logic
 *
 * Tests the rendering logic for shopping list items including:
 * - Component breakdown display (bell pepper colors)
 * - Quantity display with null handling
 * - Notes display
 *
 * Uses Node.js built-in test runner
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// ============================================
// Display Logic Helpers (mirror component logic)
// ============================================

/**
 * Determines if quantity line should be displayed
 * Mirrors the condition in ShoppingItemsList.jsx
 */
function shouldShowQuantityLine(item) {
  return !!(item.quantity || item.unit || (item.components && item.components.length > 0));
}

/**
 * Gets the quantity display text
 * Mirrors the logic in ShoppingItemsList.jsx
 */
function getQuantityDisplayText(item, formatQuantity) {
  if (item.quantity === null && item.components && item.components.length > 0) {
    return 'See breakdown below';
  }
  return formatQuantity(item.quantity, item.unit);
}

/**
 * Determines if component chips should be displayed
 */
function shouldShowComponents(item) {
  return !!(item.components && item.components.length > 0);
}

/**
 * Formats a component chip label
 */
function formatComponentLabel(comp) {
  let label = '';
  if (comp.quantity) {
    label += `${comp.quantity} `;
  }
  label += comp.label;
  return label;
}

/**
 * Simple format quantity mock for testing
 */
function mockFormatQuantity(quantity, unit) {
  if (quantity === null && unit === null) return '';
  if (quantity === null) return unit;
  if (unit === null) return String(quantity);
  return `${quantity} ${unit}`;
}

// ============================================
// Test Data
// ============================================

const ITEM_NORMAL = {
  id: 1,
  ingredient_name: 'Onion',
  quantity: 2,
  unit: 'cup',
  is_checked: false,
  category: 'Produce',
};

const ITEM_BELL_PEPPER_WITH_COMPONENTS = {
  id: 2,
  ingredient_name: 'Bell peppers',
  quantity: 4,
  unit: null,
  is_checked: false,
  category: 'Produce',
  components: [
    { label: 'red', quantity: 1, unit: null },
    { label: 'green', quantity: 2, unit: null },
    { label: 'yellow', quantity: 1, unit: null },
  ],
  notes: 'Breakdown: 1 red, 2 green, 1 yellow',
};

const ITEM_NULL_QUANTITY_WITH_COMPONENTS = {
  id: 3,
  ingredient_name: 'Mixed peppers',
  quantity: null,
  unit: null,
  is_checked: false,
  category: 'Produce',
  components: [
    { label: 'red', quantity: 2, unit: null },
    { label: 'green', quantity: 3, unit: null },
  ],
};

const ITEM_WITH_NOTES_ONLY = {
  id: 4,
  ingredient_name: 'Salt & pepper',
  quantity: null,
  unit: null,
  is_checked: false,
  category: 'Spices & Seasonings',
  notes: 'To taste',
};

const ITEM_CHECKED = {
  id: 5,
  ingredient_name: 'Bell peppers',
  quantity: 3,
  unit: null,
  is_checked: true,
  category: 'Produce',
  components: [
    { label: 'red', quantity: 1, unit: null },
    { label: 'green', quantity: 2, unit: null },
  ],
};

const ITEM_NO_QUANTITY_NO_UNIT = {
  id: 6,
  ingredient_name: 'Fresh herbs',
  quantity: null,
  unit: null,
  is_checked: false,
  category: 'Produce',
};

// ============================================
// Tests
// ============================================

describe('Shopping Item Display: Quantity Line', () => {
  it('should show quantity line for normal items with quantity and unit', () => {
    assert.equal(shouldShowQuantityLine(ITEM_NORMAL), true);
  });

  it('should show quantity line for items with components even if quantity is null', () => {
    assert.equal(shouldShowQuantityLine(ITEM_NULL_QUANTITY_WITH_COMPONENTS), true);
  });

  it('should not show quantity line for items with no quantity, unit, or components', () => {
    assert.equal(shouldShowQuantityLine(ITEM_NO_QUANTITY_NO_UNIT), false);
  });

  it('should show quantity line for items with only unit', () => {
    const item = { ...ITEM_NO_QUANTITY_NO_UNIT, unit: 'bunch' };
    assert.equal(shouldShowQuantityLine(item), true);
  });
});

describe('Shopping Item Display: Quantity Text', () => {
  it('should format normal quantity with unit', () => {
    const text = getQuantityDisplayText(ITEM_NORMAL, mockFormatQuantity);
    assert.equal(text, '2 cup');
  });

  it('should show "See breakdown below" when quantity is null but components exist', () => {
    const text = getQuantityDisplayText(ITEM_NULL_QUANTITY_WITH_COMPONENTS, mockFormatQuantity);
    assert.equal(text, 'See breakdown below');
  });

  it('should format quantity normally when both quantity and components exist', () => {
    const text = getQuantityDisplayText(ITEM_BELL_PEPPER_WITH_COMPONENTS, mockFormatQuantity);
    assert.equal(text, '4');
  });

  it('should handle items with notes only (no quantity/unit)', () => {
    const text = getQuantityDisplayText(ITEM_WITH_NOTES_ONLY, mockFormatQuantity);
    assert.equal(text, '');
  });
});

describe('Shopping Item Display: Component Chips', () => {
  it('should show components for bell pepper items', () => {
    assert.equal(shouldShowComponents(ITEM_BELL_PEPPER_WITH_COMPONENTS), true);
  });

  it('should not show components for normal items', () => {
    assert.equal(shouldShowComponents(ITEM_NORMAL), false);
  });

  it('should not show components when components array is empty', () => {
    const item = { ...ITEM_NORMAL, components: [] };
    assert.equal(shouldShowComponents(item), false);
  });

  it('should not show components when components is undefined', () => {
    assert.equal(shouldShowComponents(ITEM_WITH_NOTES_ONLY), false);
  });
});

describe('Shopping Item Display: Component Label Formatting', () => {
  it('should format component with quantity and label', () => {
    const comp = { label: 'red', quantity: 2, unit: null };
    assert.equal(formatComponentLabel(comp), '2 red');
  });

  it('should format component with only label', () => {
    const comp = { label: 'mixed', quantity: null, unit: null };
    assert.equal(formatComponentLabel(comp), 'mixed');
  });

  it('should format all bell pepper components correctly', () => {
    const components = ITEM_BELL_PEPPER_WITH_COMPONENTS.components;
    const labels = components.map(formatComponentLabel);
    assert.deepEqual(labels, ['1 red', '2 green', '1 yellow']);
  });
});

describe('Shopping Item Display: Notes', () => {
  it('should have notes for bell pepper breakdown', () => {
    assert.equal(ITEM_BELL_PEPPER_WITH_COMPONENTS.notes, 'Breakdown: 1 red, 2 green, 1 yellow');
  });

  it('should have notes for items with custom notes', () => {
    assert.equal(ITEM_WITH_NOTES_ONLY.notes, 'To taste');
  });

  it('should not have notes for normal items', () => {
    assert.equal(ITEM_NORMAL.notes, undefined);
  });
});

describe('Shopping Item Display: Checked State', () => {
  it('should identify checked items', () => {
    assert.equal(ITEM_CHECKED.is_checked, true);
  });

  it('should identify unchecked items', () => {
    assert.equal(ITEM_NORMAL.is_checked, false);
  });

  it('should still show components for checked items', () => {
    assert.equal(shouldShowComponents(ITEM_CHECKED), true);
  });
});

describe('Shopping Item Display: Mobile Compatibility', () => {
  it('should have compact component chip data for mobile display', () => {
    // Components should be simple objects suitable for flex-wrap display
    const components = ITEM_BELL_PEPPER_WITH_COMPONENTS.components;
    components.forEach((comp) => {
      assert.ok(typeof comp.label === 'string', 'Label should be string');
      assert.ok(comp.quantity === null || typeof comp.quantity === 'number', 'Quantity should be number or null');
    });
  });

  it('should handle items with many components gracefully', () => {
    const manyComponents = {
      ...ITEM_NORMAL,
      components: [
        { label: 'red', quantity: 1 },
        { label: 'green', quantity: 2 },
        { label: 'yellow', quantity: 1 },
        { label: 'orange', quantity: 3 },
        { label: 'purple', quantity: 1 },
      ],
    };
    assert.equal(shouldShowComponents(manyComponents), true);
    assert.equal(manyComponents.components.length, 5);
  });
});

describe('Shopping Item Display: Edge Cases', () => {
  it('should handle item with zero quantity', () => {
    const item = { ...ITEM_NORMAL, quantity: 0 };
    // 0 is falsy but should still show if unit exists
    assert.equal(shouldShowQuantityLine(item), true);
  });

  it('should handle item with empty string unit', () => {
    const item = { ...ITEM_NORMAL, quantity: 2, unit: '' };
    assert.equal(shouldShowQuantityLine(item), true);
  });

  it('should handle components with zero quantity', () => {
    const comp = { label: 'red', quantity: 0, unit: null };
    // Zero quantity should not show the number prefix
    assert.equal(formatComponentLabel(comp), 'red');
  });

  it('should handle null components array', () => {
    const item = { ...ITEM_NORMAL, components: null };
    assert.equal(shouldShowComponents(item), false);
  });
});
