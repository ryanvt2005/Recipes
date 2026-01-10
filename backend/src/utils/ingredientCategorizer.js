/**
 * Ingredient Categorization Utility
 *
 * Automatically categorizes ingredients into standard grocery store categories
 * for better shopping list organization.
 */

const CATEGORIES = {
  PRODUCE: 'Produce',
  DAIRY: 'Dairy & Eggs',
  MEAT: 'Meat & Seafood',
  BAKERY: 'Bakery',
  PANTRY: 'Pantry',
  SPICES: 'Spices & Seasonings',
  FROZEN: 'Frozen',
  BEVERAGES: 'Beverages',
  CANNED: 'Canned & Jarred',
  CONDIMENTS: 'Condiments & Sauces',
  SNACKS: 'Snacks',
  OTHER: 'Other'
};

/**
 * Comprehensive ingredient-to-category mapping
 * Maps ingredient names (lowercase) to their grocery categories
 */
const INGREDIENT_CATEGORY_MAP = {
  // PRODUCE - Vegetables
  'tomato': CATEGORIES.PRODUCE,
  'tomatoes': CATEGORIES.PRODUCE,
  'onion': CATEGORIES.PRODUCE,
  'onions': CATEGORIES.PRODUCE,
  'garlic': CATEGORIES.PRODUCE,
  'potato': CATEGORIES.PRODUCE,
  'potatoes': CATEGORIES.PRODUCE,
  'carrot': CATEGORIES.PRODUCE,
  'carrots': CATEGORIES.PRODUCE,
  'celery': CATEGORIES.PRODUCE,
  'bell pepper': CATEGORIES.PRODUCE,
  'pepper': CATEGORIES.PRODUCE,
  'peppers': CATEGORIES.PRODUCE,
  'lettuce': CATEGORIES.PRODUCE,
  'spinach': CATEGORIES.PRODUCE,
  'kale': CATEGORIES.PRODUCE,
  'broccoli': CATEGORIES.PRODUCE,
  'cauliflower': CATEGORIES.PRODUCE,
  'cucumber': CATEGORIES.PRODUCE,
  'zucchini': CATEGORIES.PRODUCE,
  'squash': CATEGORIES.PRODUCE,
  'mushroom': CATEGORIES.PRODUCE,
  'mushrooms': CATEGORIES.PRODUCE,
  'cabbage': CATEGORIES.PRODUCE,
  'corn': CATEGORIES.PRODUCE,
  'green beans': CATEGORIES.PRODUCE,
  'peas': CATEGORIES.PRODUCE,
  'asparagus': CATEGORIES.PRODUCE,
  'eggplant': CATEGORIES.PRODUCE,
  'radish': CATEGORIES.PRODUCE,
  'beet': CATEGORIES.PRODUCE,
  'beets': CATEGORIES.PRODUCE,
  'sweet potato': CATEGORIES.PRODUCE,
  'yam': CATEGORIES.PRODUCE,
  'ginger': CATEGORIES.PRODUCE,
  'jalapeno': CATEGORIES.PRODUCE,
  'cilantro': CATEGORIES.PRODUCE,
  'parsley': CATEGORIES.PRODUCE,
  'basil': CATEGORIES.PRODUCE,
  'arugula': CATEGORIES.PRODUCE,
  'chard': CATEGORIES.PRODUCE,
  'leek': CATEGORIES.PRODUCE,
  'shallot': CATEGORIES.PRODUCE,
  'scallion': CATEGORIES.PRODUCE,
  'green onion': CATEGORIES.PRODUCE,

  // PRODUCE - Fruits
  'apple': CATEGORIES.PRODUCE,
  'apples': CATEGORIES.PRODUCE,
  'banana': CATEGORIES.PRODUCE,
  'bananas': CATEGORIES.PRODUCE,
  'orange': CATEGORIES.PRODUCE,
  'oranges': CATEGORIES.PRODUCE,
  'lemon': CATEGORIES.PRODUCE,
  'lemons': CATEGORIES.PRODUCE,
  'lime': CATEGORIES.PRODUCE,
  'limes': CATEGORIES.PRODUCE,
  'strawberry': CATEGORIES.PRODUCE,
  'strawberries': CATEGORIES.PRODUCE,
  'blueberry': CATEGORIES.PRODUCE,
  'blueberries': CATEGORIES.PRODUCE,
  'raspberry': CATEGORIES.PRODUCE,
  'raspberries': CATEGORIES.PRODUCE,
  'blackberry': CATEGORIES.PRODUCE,
  'blackberries': CATEGORIES.PRODUCE,
  'grape': CATEGORIES.PRODUCE,
  'grapes': CATEGORIES.PRODUCE,
  'mango': CATEGORIES.PRODUCE,
  'pineapple': CATEGORIES.PRODUCE,
  'watermelon': CATEGORIES.PRODUCE,
  'cantaloupe': CATEGORIES.PRODUCE,
  'honeydew': CATEGORIES.PRODUCE,
  'peach': CATEGORIES.PRODUCE,
  'peaches': CATEGORIES.PRODUCE,
  'pear': CATEGORIES.PRODUCE,
  'pears': CATEGORIES.PRODUCE,
  'plum': CATEGORIES.PRODUCE,
  'plums': CATEGORIES.PRODUCE,
  'cherry': CATEGORIES.PRODUCE,
  'cherries': CATEGORIES.PRODUCE,
  'avocado': CATEGORIES.PRODUCE,
  'avocados': CATEGORIES.PRODUCE,

  // DAIRY & EGGS
  'milk': CATEGORIES.DAIRY,
  'cream': CATEGORIES.DAIRY,
  'heavy cream': CATEGORIES.DAIRY,
  'half and half': CATEGORIES.DAIRY,
  'sour cream': CATEGORIES.DAIRY,
  'butter': CATEGORIES.DAIRY,
  'cheese': CATEGORIES.DAIRY,
  'cheddar': CATEGORIES.DAIRY,
  'mozzarella': CATEGORIES.DAIRY,
  'parmesan': CATEGORIES.DAIRY,
  'feta': CATEGORIES.DAIRY,
  'goat cheese': CATEGORIES.DAIRY,
  'cream cheese': CATEGORIES.DAIRY,
  'ricotta': CATEGORIES.DAIRY,
  'cottage cheese': CATEGORIES.DAIRY,
  'yogurt': CATEGORIES.DAIRY,
  'greek yogurt': CATEGORIES.DAIRY,
  'egg': CATEGORIES.DAIRY,
  'eggs': CATEGORIES.DAIRY,
  'egg white': CATEGORIES.DAIRY,
  'egg yolk': CATEGORIES.DAIRY,

  // MEAT & SEAFOOD
  'chicken': CATEGORIES.MEAT,
  'chicken breast': CATEGORIES.MEAT,
  'chicken thigh': CATEGORIES.MEAT,
  'turkey': CATEGORIES.MEAT,
  'beef': CATEGORIES.MEAT,
  'ground beef': CATEGORIES.MEAT,
  'steak': CATEGORIES.MEAT,
  'pork': CATEGORIES.MEAT,
  'pork chop': CATEGORIES.MEAT,
  'bacon': CATEGORIES.MEAT,
  'sausage': CATEGORIES.MEAT,
  'ham': CATEGORIES.MEAT,
  'lamb': CATEGORIES.MEAT,
  'fish': CATEGORIES.MEAT,
  'salmon': CATEGORIES.MEAT,
  'tuna': CATEGORIES.MEAT,
  'cod': CATEGORIES.MEAT,
  'tilapia': CATEGORIES.MEAT,
  'shrimp': CATEGORIES.MEAT,
  'prawns': CATEGORIES.MEAT,
  'scallops': CATEGORIES.MEAT,
  'crab': CATEGORIES.MEAT,
  'lobster': CATEGORIES.MEAT,
  'mussels': CATEGORIES.MEAT,
  'clams': CATEGORIES.MEAT,

  // BAKERY
  'bread': CATEGORIES.BAKERY,
  'baguette': CATEGORIES.BAKERY,
  'roll': CATEGORIES.BAKERY,
  'rolls': CATEGORIES.BAKERY,
  'bun': CATEGORIES.BAKERY,
  'buns': CATEGORIES.BAKERY,
  'tortilla': CATEGORIES.BAKERY,
  'tortillas': CATEGORIES.BAKERY,
  'pita': CATEGORIES.BAKERY,
  'naan': CATEGORIES.BAKERY,
  'bagel': CATEGORIES.BAKERY,
  'bagels': CATEGORIES.BAKERY,
  'croissant': CATEGORIES.BAKERY,
  'muffin': CATEGORIES.BAKERY,

  // PANTRY
  'flour': CATEGORIES.PANTRY,
  'all-purpose flour': CATEGORIES.PANTRY,
  'bread flour': CATEGORIES.PANTRY,
  'whole wheat flour': CATEGORIES.PANTRY,
  'sugar': CATEGORIES.PANTRY,
  'brown sugar': CATEGORIES.PANTRY,
  'powdered sugar': CATEGORIES.PANTRY,
  'granulated sugar': CATEGORIES.PANTRY,
  'honey': CATEGORIES.PANTRY,
  'maple syrup': CATEGORIES.PANTRY,
  'oil': CATEGORIES.PANTRY,
  'olive oil': CATEGORIES.PANTRY,
  'vegetable oil': CATEGORIES.PANTRY,
  'canola oil': CATEGORIES.PANTRY,
  'coconut oil': CATEGORIES.PANTRY,
  'sesame oil': CATEGORIES.PANTRY,
  'vinegar': CATEGORIES.PANTRY,
  'balsamic vinegar': CATEGORIES.PANTRY,
  'apple cider vinegar': CATEGORIES.PANTRY,
  'white vinegar': CATEGORIES.PANTRY,
  'rice vinegar': CATEGORIES.PANTRY,
  'rice': CATEGORIES.PANTRY,
  'white rice': CATEGORIES.PANTRY,
  'brown rice': CATEGORIES.PANTRY,
  'pasta': CATEGORIES.PANTRY,
  'spaghetti': CATEGORIES.PANTRY,
  'penne': CATEGORIES.PANTRY,
  'fettuccine': CATEGORIES.PANTRY,
  'noodles': CATEGORIES.PANTRY,
  'quinoa': CATEGORIES.PANTRY,
  'couscous': CATEGORIES.PANTRY,
  'oats': CATEGORIES.PANTRY,
  'oatmeal': CATEGORIES.PANTRY,
  'cereal': CATEGORIES.PANTRY,
  'breadcrumbs': CATEGORIES.PANTRY,
  'panko': CATEGORIES.PANTRY,
  'cornstarch': CATEGORIES.PANTRY,
  'baking powder': CATEGORIES.PANTRY,
  'baking soda': CATEGORIES.PANTRY,
  'yeast': CATEGORIES.PANTRY,
  'vanilla extract': CATEGORIES.PANTRY,
  'almond extract': CATEGORIES.PANTRY,
  'cocoa powder': CATEGORIES.PANTRY,
  'chocolate chips': CATEGORIES.PANTRY,
  'nuts': CATEGORIES.PANTRY,
  'almonds': CATEGORIES.PANTRY,
  'walnuts': CATEGORIES.PANTRY,
  'pecans': CATEGORIES.PANTRY,
  'cashews': CATEGORIES.PANTRY,
  'peanuts': CATEGORIES.PANTRY,
  'peanut butter': CATEGORIES.PANTRY,
  'almond butter': CATEGORIES.PANTRY,

  // SPICES & SEASONINGS
  'salt': CATEGORIES.SPICES,
  'black pepper': CATEGORIES.SPICES,
  'paprika': CATEGORIES.SPICES,
  'cumin': CATEGORIES.SPICES,
  'chili powder': CATEGORIES.SPICES,
  'cayenne': CATEGORIES.SPICES,
  'oregano': CATEGORIES.SPICES,
  'thyme': CATEGORIES.SPICES,
  'rosemary': CATEGORIES.SPICES,
  'sage': CATEGORIES.SPICES,
  'bay leaf': CATEGORIES.SPICES,
  'bay leaves': CATEGORIES.SPICES,
  'cinnamon': CATEGORIES.SPICES,
  'nutmeg': CATEGORIES.SPICES,
  'cloves': CATEGORIES.SPICES,
  'allspice': CATEGORIES.SPICES,
  'cardamom': CATEGORIES.SPICES,
  'coriander': CATEGORIES.SPICES,
  'turmeric': CATEGORIES.SPICES,
  'curry powder': CATEGORIES.SPICES,
  'garam masala': CATEGORIES.SPICES,
  'red pepper flakes': CATEGORIES.SPICES,
  'garlic powder': CATEGORIES.SPICES,
  'onion powder': CATEGORIES.SPICES,
  'italian seasoning': CATEGORIES.SPICES,
  'herbs': CATEGORIES.SPICES,
  'dill': CATEGORIES.SPICES,
  'tarragon': CATEGORIES.SPICES,
  'mint': CATEGORIES.SPICES,
  'chives': CATEGORIES.SPICES,

  // FROZEN
  'frozen peas': CATEGORIES.FROZEN,
  'frozen corn': CATEGORIES.FROZEN,
  'frozen vegetables': CATEGORIES.FROZEN,
  'frozen berries': CATEGORIES.FROZEN,
  'ice cream': CATEGORIES.FROZEN,
  'frozen pizza': CATEGORIES.FROZEN,

  // BEVERAGES
  'water': CATEGORIES.BEVERAGES,
  'coffee': CATEGORIES.BEVERAGES,
  'tea': CATEGORIES.BEVERAGES,
  'juice': CATEGORIES.BEVERAGES,
  'orange juice': CATEGORIES.BEVERAGES,
  'apple juice': CATEGORIES.BEVERAGES,
  'soda': CATEGORIES.BEVERAGES,
  'beer': CATEGORIES.BEVERAGES,
  'wine': CATEGORIES.BEVERAGES,
  'red wine': CATEGORIES.BEVERAGES,
  'white wine': CATEGORIES.BEVERAGES,
  'broth': CATEGORIES.BEVERAGES,
  'chicken broth': CATEGORIES.BEVERAGES,
  'beef broth': CATEGORIES.BEVERAGES,
  'vegetable broth': CATEGORIES.BEVERAGES,
  'stock': CATEGORIES.BEVERAGES,

  // CANNED & JARRED
  'canned tomatoes': CATEGORIES.CANNED,
  'tomato paste': CATEGORIES.CANNED,
  'tomato sauce': CATEGORIES.CANNED,
  'beans': CATEGORIES.CANNED,
  'black beans': CATEGORIES.CANNED,
  'kidney beans': CATEGORIES.CANNED,
  'chickpeas': CATEGORIES.CANNED,
  'garbanzo beans': CATEGORIES.CANNED,
  'lentils': CATEGORIES.CANNED,
  'coconut milk': CATEGORIES.CANNED,
  'olives': CATEGORIES.CANNED,
  'pickles': CATEGORIES.CANNED,
  'capers': CATEGORIES.CANNED,
  'artichoke': CATEGORIES.CANNED,
  'artichokes': CATEGORIES.CANNED,

  // CONDIMENTS & SAUCES
  'ketchup': CATEGORIES.CONDIMENTS,
  'mustard': CATEGORIES.CONDIMENTS,
  'mayonnaise': CATEGORIES.CONDIMENTS,
  'mayo': CATEGORIES.CONDIMENTS,
  'hot sauce': CATEGORIES.CONDIMENTS,
  'sriracha': CATEGORIES.CONDIMENTS,
  'soy sauce': CATEGORIES.CONDIMENTS,
  'worcestershire sauce': CATEGORIES.CONDIMENTS,
  'fish sauce': CATEGORIES.CONDIMENTS,
  'barbecue sauce': CATEGORIES.CONDIMENTS,
  'bbq sauce': CATEGORIES.CONDIMENTS,
  'salsa': CATEGORIES.CONDIMENTS,
  'pesto': CATEGORIES.CONDIMENTS,
  'hummus': CATEGORIES.CONDIMENTS,
  'tahini': CATEGORIES.CONDIMENTS,
  'ranch': CATEGORIES.CONDIMENTS,
  'salad dressing': CATEGORIES.CONDIMENTS,

  // SNACKS
  'chips': CATEGORIES.SNACKS,
  'crackers': CATEGORIES.SNACKS,
  'popcorn': CATEGORIES.SNACKS,
  'pretzels': CATEGORIES.SNACKS,
  'cookies': CATEGORIES.SNACKS,
  'candy': CATEGORIES.SNACKS,
  'chocolate': CATEGORIES.SNACKS,
};

/**
 * Categorizes an ingredient name into a grocery category
 *
 * @param {string} ingredientName - The name of the ingredient (e.g., "cheddar cheese")
 * @returns {string} The category name (e.g., "Dairy & Eggs")
 */
function categorizeIngredient(ingredientName) {
  if (!ingredientName) {
    return CATEGORIES.OTHER;
  }

  const normalized = ingredientName.toLowerCase().trim();

  // Direct match - exact ingredient name
  if (INGREDIENT_CATEGORY_MAP[normalized]) {
    return INGREDIENT_CATEGORY_MAP[normalized];
  }

  // Partial match - check if ingredient name contains any known keywords
  // Sort by keyword length descending to match longer phrases first
  const sortedKeywords = Object.keys(INGREDIENT_CATEGORY_MAP).sort((a, b) => b.length - a.length);

  for (const keyword of sortedKeywords) {
    if (normalized.includes(keyword)) {
      return INGREDIENT_CATEGORY_MAP[keyword];
    }
  }

  // Default to OTHER if no match found
  return CATEGORIES.OTHER;
}

module.exports = {
  CATEGORIES,
  categorizeIngredient
};
