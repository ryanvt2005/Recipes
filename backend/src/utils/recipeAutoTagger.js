/**
 * Recipe Auto-Tagger Utility
 *
 * Automatically assigns cuisines, meal types, and dietary labels to recipes
 * using keyword-based pattern matching on title, description, and ingredients.
 */

const logger = require('../config/logger');

// ============================================================================
// CUISINE KEYWORDS
// Keys are cuisine names (must match database values exactly)
// Each has title keywords (matched against recipe title) and
// ingredient keywords (matched against ingredient names)
// ============================================================================

const CUISINE_KEYWORDS = {
  Italian: {
    title: [
      'italian',
      'pasta',
      'pizza',
      'risotto',
      'lasagna',
      'lasagne',
      'carbonara',
      'marinara',
      'parmigiana',
      'bolognese',
      'alfredo',
      'caprese',
      'bruschetta',
      'focaccia',
      'gnocchi',
      'tiramisu',
      'panzanella',
      'osso buco',
      'saltimbocca',
      'penne',
      'fettuccine',
      'spaghetti',
      'linguine',
      'ravioli',
      'tortellini',
      'minestrone',
      'antipasto',
      'primavera',
      'piccata',
      'marsala',
      'puttanesca',
      'arrabiata',
      'cioppino',
      'calzone',
      'stromboli',
      'cannoli',
    ],
    ingredients: [
      'parmesan',
      'parmigiano',
      'mozzarella',
      'prosciutto',
      'pancetta',
      'balsamic',
      'arborio',
      'mascarpone',
      'pecorino',
      'ricotta',
      'provolone',
      'basil pesto',
      'marinara',
      'italian sausage',
      'sun-dried tomato',
    ],
  },
  Mexican: {
    title: [
      'mexican',
      'taco',
      'tacos',
      'burrito',
      'enchilada',
      'enchiladas',
      'quesadilla',
      'fajita',
      'fajitas',
      'tamale',
      'tamales',
      'chimichanga',
      'tostada',
      'pozole',
      'mole',
      'carnitas',
      'barbacoa',
      'salsa verde',
      'pico de gallo',
      'guacamole',
      'chile relleno',
      'elote',
      'churros',
      'huevos rancheros',
      'chilaquiles',
      'tex-mex',
      'nachos',
      'torta',
      'sopes',
      'taquito',
    ],
    ingredients: [
      'tortilla',
      'cilantro',
      'jalapeño',
      'jalapeno',
      'chipotle',
      'cotija',
      'queso fresco',
      'queso',
      'poblano',
      'tomatillo',
      'mexican oregano',
      'masa',
      'adobo',
      'habanero',
      'serrano pepper',
      'ancho chili',
      'guajillo',
      'epazote',
      'tajin',
    ],
  },
  Chinese: {
    title: [
      'chinese',
      'stir-fry',
      'stir fry',
      'fried rice',
      'lo mein',
      'chow mein',
      'kung pao',
      'general tso',
      'orange chicken',
      'sweet and sour',
      'dim sum',
      'dumpling',
      'dumplings',
      'potsticker',
      'pot sticker',
      'mapo tofu',
      'hot pot',
      'wonton',
      'egg roll',
      'spring roll',
      'chow fun',
      'dan dan',
      'peking duck',
      'char siu',
      'szechuan',
      'sichuan',
      'hunan',
      'cantonese',
      'mongolian beef',
    ],
    ingredients: [
      'soy sauce',
      'sesame oil',
      'rice vinegar',
      'hoisin',
      'oyster sauce',
      'bok choy',
      'water chestnut',
      'bamboo shoots',
      'five spice',
      'shaoxing wine',
      'chili oil',
      'black bean sauce',
      'plum sauce',
      'wonton wrapper',
      'star anise',
    ],
  },
  Japanese: {
    title: [
      'japanese',
      'sushi',
      'sashimi',
      'ramen',
      'udon',
      'soba',
      'teriyaki',
      'tempura',
      'katsu',
      'tonkatsu',
      'yakitori',
      'miso soup',
      'donburi',
      'gyoza',
      'okonomiyaki',
      'takoyaki',
      'hibachi',
      'teppanyaki',
      'onigiri',
      'edamame',
      'yakisoba',
      'karaage',
    ],
    ingredients: [
      'miso',
      'mirin',
      'sake',
      'nori',
      'wasabi',
      'dashi',
      'ponzu',
      'panko',
      'shiso',
      'furikake',
      'kombu',
      'bonito',
      'togarashi',
      'yuzu',
      'matcha',
    ],
  },
  Indian: {
    title: [
      'indian',
      'curry',
      'tikka masala',
      'biryani',
      'vindaloo',
      'korma',
      'saag',
      'dal',
      'daal',
      'samosa',
      'pakora',
      'tandoori',
      'naan',
      'rogan josh',
      'butter chicken',
      'palak paneer',
      'chana masala',
      'aloo gobi',
      'tikka',
      'masala',
      'madras',
      'jalfrezi',
      'bhaji',
      'chapati',
      'paratha',
      'dosa',
      'idli',
      'raita',
      'chutney',
    ],
    ingredients: [
      'turmeric',
      'garam masala',
      'cardamom',
      'paneer',
      'ghee',
      'curry leaves',
      'fenugreek',
      'mustard seeds',
      'tamarind',
      'asafoetida',
      'curry powder',
      'tandoori spice',
      'cumin seeds',
      'coriander seeds',
    ],
  },
  Thai: {
    title: [
      'thai',
      'pad thai',
      'tom yum',
      'tom kha',
      'green curry',
      'red curry',
      'yellow curry',
      'massaman',
      'panang',
      'drunken noodles',
      'pad see ew',
      'larb',
      'som tam',
      'satay',
      'khao soi',
      'basil chicken',
    ],
    ingredients: [
      'fish sauce',
      'thai basil',
      'lemongrass',
      'galangal',
      'kaffir lime',
      'thai chili',
      'coconut milk',
      'palm sugar',
      'tamarind paste',
      'thai curry paste',
      'sriracha',
      'sweet chili sauce',
    ],
  },
  Mediterranean: {
    title: [
      'mediterranean',
      'falafel',
      'tabbouleh',
      'tabouleh',
      'shakshuka',
      'pita',
      'dolma',
      'dolmades',
      'fattoush',
    ],
    ingredients: [
      'tahini',
      'za\'atar',
      'zaatar',
      'sumac',
      'pomegranate molasses',
      'harissa',
      'preserved lemon',
      'dukkah',
    ],
  },
  French: {
    title: [
      'french',
      'coq au vin',
      'ratatouille',
      'bouillabaisse',
      'cassoulet',
      'quiche',
      'soufflé',
      'souffle',
      'crêpe',
      'crepe',
      'croissant',
      'béarnaise',
      'bearnaise',
      'hollandaise',
      'béchamel',
      'bechamel',
      'velouté',
      'veloute',
      'bourguignon',
      'provençal',
      'provencal',
      'gratin',
      'au gratin',
      'confit',
      'bourgogne',
      'lyonnaise',
      'niçoise',
      'nicoise',
      'croque monsieur',
      'croque madame',
      'baguette',
    ],
    ingredients: [
      'shallot',
      'shallots',
      'tarragon',
      'dijon mustard',
      'gruyere',
      'brie',
      'camembert',
      'herbes de provence',
      'crème fraîche',
      'creme fraiche',
    ],
  },
  Greek: {
    title: [
      'greek',
      'gyro',
      'gyros',
      'souvlaki',
      'moussaka',
      'spanakopita',
      'pastitsio',
      'tzatziki',
      'greek salad',
      'baklava',
      'dolmades',
      'avgolemono',
      'horiatiki',
    ],
    ingredients: [
      'feta',
      'kalamata',
      'phyllo',
      'filo',
      'ouzo',
      'oregano',
      'greek yogurt',
    ],
  },
  Korean: {
    title: [
      'korean',
      'kimchi',
      'bibimbap',
      'bulgogi',
      'bulgoki',
      'kalbi',
      'galbi',
      'japchae',
      'tteokbokki',
      'korean fried chicken',
      'sundubu',
      'samgyeopsal',
      'jjigae',
      'banchan',
      'kimbap',
      'dakgalbi',
    ],
    ingredients: [
      'gochujang',
      'gochugaru',
      'doenjang',
      'korean chili',
      'korean pear',
      'kimchi',
      'sesame oil',
    ],
  },
  Vietnamese: {
    title: [
      'vietnamese',
      'pho',
      'banh mi',
      'bun',
      'goi cuon',
      'summer rolls',
      'bun bo hue',
      'com tam',
      'cao lau',
      'banh xeo',
    ],
    ingredients: [
      'fish sauce',
      'rice noodles',
      'bean sprouts',
      'vietnamese mint',
      'rice paper',
      'lemongrass',
      'hoisin',
    ],
  },
  'Middle Eastern': {
    title: [
      'middle eastern',
      'hummus',
      'falafel',
      'shawarma',
      'kebab',
      'kebabs',
      'kofta',
      'tabouleh',
      'baba ganoush',
      'labneh',
      'fattoush',
      'manakeesh',
      'muhammara',
      'kibbeh',
      'baklava',
      'pita',
    ],
    ingredients: [
      'tahini',
      'chickpeas',
      'sumac',
      'za\'atar',
      'zaatar',
      'pomegranate molasses',
      'bulgur',
      'harissa',
      'preserved lemon',
      'rose water',
      'orange blossom',
    ],
  },
  Spanish: {
    title: [
      'spanish',
      'paella',
      'tapas',
      'gazpacho',
      'tortilla española',
      'patatas bravas',
      'churros',
      'sangria',
      'albondigas',
      'empanada',
      'croquetas',
      'pimientos',
    ],
    ingredients: [
      'saffron',
      'chorizo',
      'manchego',
      'paprika',
      'smoked paprika',
      'sherry',
      'serrano ham',
      'piquillo',
    ],
  },
  American: {
    title: [
      'burger',
      'burgers',
      'hot dog',
      'hot dogs',
      'bbq',
      'barbecue',
      'fried chicken',
      'mac and cheese',
      'mac & cheese',
      'meatloaf',
      'meat loaf',
      'pulled pork',
      'ribs',
      'cornbread',
      'coleslaw',
      'american',
      'southern',
      'cajun',
      'creole',
      'nashville hot',
      'buffalo wings',
      'buffalo chicken',
      'jambalaya',
      'gumbo',
      'po boy',
      'po\' boy',
      'biscuits and gravy',
      'grilled cheese',
      'club sandwich',
      'sloppy joe',
      'pot roast',
      'chili',
      'clam chowder',
      'lobster roll',
      'cobb salad',
      'waldorf',
      'philly cheesesteak',
      'cheesesteak',
    ],
    ingredients: [
      'ranch',
      'buttermilk',
      'cornmeal',
      'bourbon',
      'old bay',
      'liquid smoke',
      'bbq sauce',
      'barbecue sauce',
    ],
  },
};

// ============================================================================
// MEAL TYPE KEYWORDS
// Matched against recipe title and description
// ============================================================================

const MEAL_TYPE_KEYWORDS = {
  Breakfast: {
    title: [
      'breakfast',
      'brunch',
      'pancake',
      'pancakes',
      'waffle',
      'waffles',
      'french toast',
      'omelet',
      'omelette',
      'frittata',
      'scrambled eggs',
      'fried eggs',
      'poached eggs',
      'eggs benedict',
      'granola',
      'oatmeal',
      'porridge',
      'smoothie bowl',
      'breakfast burrito',
      'breakfast sandwich',
      'hash browns',
      'home fries',
      'breakfast potatoes',
      'avocado toast',
      'egg bites',
      'quiche',
      'shakshuka',
      'huevos rancheros',
      'chilaquiles',
      'breakfast casserole',
      'egg muffin',
    ],
    description: [
      'breakfast',
      'brunch',
      'morning',
    ],
  },
  Lunch: {
    title: [
      'lunch',
      'sandwich',
      'sandwiches',
      'panini',
      'wrap',
      'wraps',
      'blt',
      'grilled cheese',
      'club sandwich',
      'tuna salad',
      'chicken salad',
      'egg salad',
      'soup and salad',
      'lunch bowl',
    ],
    description: [
      'lunch',
      'midday',
      'lunchtime',
    ],
  },
  Dinner: {
    title: [
      'dinner',
      'supper',
      'pot roast',
      'roast chicken',
      'roast beef',
      'braised',
      'weeknight dinner',
      'sunday dinner',
      'date night',
      'family dinner',
    ],
    description: [
      'dinner',
      'supper',
      'main course',
      'entrée',
      'entree',
      'weeknight',
    ],
  },
  Dessert: {
    title: [
      'dessert',
      'cake',
      'pie',
      'cookie',
      'cookies',
      'brownie',
      'brownies',
      'cupcake',
      'cupcakes',
      'cheesecake',
      'ice cream',
      'gelato',
      'sorbet',
      'pudding',
      'mousse',
      'tart',
      'pastry',
      'donut',
      'doughnut',
      'fudge',
      'candy',
      'frosting',
      'icing',
      'ganache',
      'meringue',
      'macaron',
      'macarons',
      'macaroon',
      'macaroons',
      'éclair',
      'eclair',
      'cannoli',
      'panna cotta',
      'crème brûlée',
      'creme brulee',
      'flan',
      'cobbler',
      'crisp',
      'crumble',
      'parfait',
      'truffle',
      'truffles',
      'tiramisu',
      'baklava',
      'churros',
      'blondie',
      'blondies',
      'scone',
      'scones',
      'biscotti',
      'shortcake',
      'snickerdoodle',
    ],
    description: [
      'dessert',
      'sweet treat',
    ],
  },
  Snack: {
    title: [
      'snack',
      'snacks',
      'trail mix',
      'popcorn',
      'energy balls',
      'energy bites',
      'protein balls',
      'protein bites',
      'granola bar',
      'granola bars',
      'energy bar',
      'bite-sized',
      'munchies',
      'party mix',
      'cheese ball',
    ],
    description: [
      'snack',
      'after school',
      'game day',
      'movie night',
    ],
  },
  Appetizer: {
    title: [
      'appetizer',
      'appetizers',
      'starter',
      'starters',
      'bruschetta',
      'crostini',
      'canapé',
      'canape',
      'small plate',
      'wings',
      'sliders',
      'nachos',
      'spring rolls',
      'egg rolls',
      'dumplings',
      'pot stickers',
      'potstickers',
      'deviled eggs',
      'stuffed mushrooms',
      'shrimp cocktail',
      'crab cakes',
      'spinach dip',
      'artichoke dip',
      'buffalo dip',
      'jalapeño poppers',
      'jalapeno poppers',
      'mozzarella sticks',
      'onion rings',
      'ceviche',
      'carpaccio',
      'tartare',
      'hummus',
      'guacamole',
      'salsa',
      'cheese board',
      'charcuterie',
    ],
    description: [
      'appetizer',
      'starter',
      'hors d\'oeuvre',
      'small plate',
      'finger food',
    ],
  },
  'Side Dish': {
    title: [
      'side dish',
      'side',
      'slaw',
      'coleslaw',
      'potato salad',
      'macaroni salad',
      'pasta salad',
      'roasted vegetables',
      'roasted veggies',
      'grilled vegetables',
      'steamed vegetables',
      'sautéed vegetables',
      'sauteed vegetables',
      'mashed potatoes',
      'baked potato',
      'french fries',
      'fries',
      'rice pilaf',
      'garlic bread',
      'dinner rolls',
      'biscuits',
      'cornbread',
      'stuffing',
      'green beans',
      'roasted broccoli',
      'roasted cauliflower',
      'glazed carrots',
      'creamed spinach',
      'au gratin',
      'scalloped potatoes',
      'mac and cheese',
      'mac & cheese',
    ],
    description: [
      'side dish',
      'side',
      'accompaniment',
    ],
  },
  Beverage: {
    title: [
      'beverage',
      'drink',
      'cocktail',
      'cocktails',
      'mocktail',
      'smoothie',
      'shake',
      'milkshake',
      'juice',
      'lemonade',
      'iced tea',
      'hot chocolate',
      'cider',
      'punch',
      'sangria',
      'margarita',
      'mojito',
      'daiquiri',
      'martini',
      'old fashioned',
      'manhattan',
      'negroni',
      'whiskey sour',
      'bloody mary',
      'mimosa',
      'bellini',
      'spritzer',
      'latte',
      'cappuccino',
      'espresso',
      'frappe',
      'horchata',
      'agua fresca',
      'eggnog',
    ],
    description: [
      'drink',
      'beverage',
      'cocktail',
      'sip',
    ],
  },
};

// ============================================================================
// DIETARY LABEL DETECTION
// Exclusion-based: if ANY excluded keyword is found in ingredients, skip the label
// ============================================================================

const MEAT_KEYWORDS = [
  'chicken', 'beef', 'pork', 'lamb', 'turkey', 'duck', 'veal',
  'bacon', 'sausage', 'ham', 'prosciutto', 'salami', 'pepperoni',
  'ground beef', 'ground turkey', 'ground chicken', 'ground pork',
  'steak', 'brisket', 'pulled pork', 'carnitas', 'pancetta',
  'guanciale', 'lard', 'tallow', 'chorizo', 'bratwurst',
  'hot dog', 'meatball', 'ribs', 'tenderloin', 'roast',
  'drumstick', 'thigh', 'breast', 'wing',
];

const FISH_KEYWORDS = [
  'fish', 'salmon', 'tuna', 'shrimp', 'prawns', 'scallops',
  'lobster', 'crab', 'mussels', 'clams', 'oysters', 'anchovies',
  'sardines', 'trout', 'cod', 'tilapia', 'halibut', 'sea bass',
  'swordfish', 'mahi mahi', 'catfish', 'snapper', 'calamari',
  'squid', 'octopus', 'crawfish', 'crayfish',
];

const ANIMAL_BROTH_KEYWORDS = [
  'chicken broth', 'beef broth', 'bone broth', 'chicken stock',
  'beef stock', 'fish stock', 'fish sauce', 'oyster sauce',
  'worcestershire', 'gelatin', 'anchovy',
];

const DAIRY_KEYWORDS = [
  'milk', 'cream', 'butter', 'cheese', 'yogurt', 'sour cream',
  'cottage cheese', 'cream cheese', 'ricotta', 'mozzarella',
  'parmesan', 'cheddar', 'feta', 'goat cheese', 'brie',
  'camembert', 'gruyere', 'provolone', 'swiss cheese',
  'blue cheese', 'gorgonzola', 'mascarpone', 'pecorino',
  'whey', 'casein', 'lactose', 'ghee', 'buttermilk',
  'half and half', 'half-and-half', 'evaporated milk',
  'condensed milk', 'powdered milk', 'whipped cream',
  'ice cream', 'heavy cream', 'light cream',
];

const EGG_KEYWORDS = [
  'egg', 'eggs', 'egg yolk', 'egg white', 'mayonnaise',
];

const GLUTEN_KEYWORDS = [
  'flour', 'wheat', 'bread', 'pasta', 'noodles', 'spaghetti',
  'fettuccine', 'penne', 'linguine', 'couscous', 'bulgur',
  'bagel', 'croissant', 'biscuit', 'breadcrumbs', 'panko',
  'soy sauce', 'malt', 'barley', 'rye', 'seitan',
  'farro', 'semolina', 'durum', 'graham', 'tortilla',
  'pita', 'naan', 'baguette', 'roll', 'bun',
  'cracker', 'crackers', 'pretzel',
];

const NUT_KEYWORDS = [
  'almond', 'almonds', 'walnut', 'walnuts', 'cashew', 'cashews',
  'pecan', 'pecans', 'pistachio', 'pistachios', 'hazelnut',
  'hazelnuts', 'macadamia', 'brazil nut', 'pine nut', 'pine nuts',
  'chestnut', 'chestnuts', 'peanut', 'peanuts', 'peanut butter',
  'almond butter', 'cashew butter', 'nutella', 'marzipan',
  'almond extract', 'almond flour', 'almond milk', 'nut',
  'mixed nuts', 'trail mix',
];

const HIGH_CARB_KEYWORDS = [
  'sugar', 'flour', 'bread', 'pasta', 'rice', 'potato', 'potatoes',
  'corn', 'oats', 'oatmeal', 'quinoa', 'couscous', 'bulgur',
  'beans', 'chickpeas', 'lentils', 'honey', 'maple syrup',
  'agave', 'banana', 'tortilla', 'noodles', 'cereal',
  'cornstarch', 'brown sugar', 'powdered sugar',
];

const PROTEIN_KEYWORDS = [
  'chicken', 'turkey', 'beef', 'pork', 'lamb', 'fish', 'salmon',
  'tuna', 'shrimp', 'eggs', 'egg', 'greek yogurt', 'cottage cheese',
  'tofu', 'tempeh', 'protein powder', 'beans', 'lentils',
  'chickpeas', 'quinoa', 'edamame', 'steak', 'ground beef',
  'ground turkey', 'ground chicken',
];

// ============================================================================
// CATEGORY CACHE
// Loaded once from the database, maps category names → UUIDs
// ============================================================================

let categoryCache = null;

async function loadCategoryCache(pool) {
  if (categoryCache) return categoryCache;

  const [cuisines, mealTypes, dietaryLabels] = await Promise.all([
    pool.query('SELECT id, name FROM cuisines ORDER BY sort_order'),
    pool.query('SELECT id, name FROM meal_types ORDER BY sort_order'),
    pool.query('SELECT id, name FROM dietary_labels ORDER BY sort_order'),
  ]);

  categoryCache = {
    cuisines: new Map(cuisines.rows.map((r) => [r.name, r.id])),
    mealTypes: new Map(mealTypes.rows.map((r) => [r.name, r.id])),
    dietaryLabels: new Map(dietaryLabels.rows.map((r) => [r.name, r.id])),
  };

  return categoryCache;
}

/**
 * Clear the category cache (useful for testing)
 */
function clearCategoryCache() {
  categoryCache = null;
}

// ============================================================================
// DETECTION FUNCTIONS
// ============================================================================

/**
 * Detect cuisines from recipe title and ingredients
 * Returns array of cuisine IDs, max 2
 */
function detectCuisines(titleLower, ingredientNames, cache) {
  const scores = {};

  for (const [cuisineName, keywords] of Object.entries(CUISINE_KEYWORDS)) {
    let score = 0;

    // Check title keywords (+3 points each)
    for (const keyword of keywords.title) {
      if (titleLower.includes(keyword)) {
        score += 3;
      }
    }

    // Check ingredient keywords (+1 point each)
    for (const keyword of keywords.ingredients) {
      for (const ingName of ingredientNames) {
        if (ingName.includes(keyword)) {
          score += 1;
          break; // Count each keyword only once
        }
      }
    }

    if (score >= 3) {
      scores[cuisineName] = score;
    }
  }

  // Sort by score descending, take top 2
  const sorted = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2);

  return sorted
    .map(([name]) => cache.cuisines.get(name))
    .filter(Boolean);
}

/**
 * Detect meal types from recipe title and description
 * Returns array of meal type IDs, max 2
 */
function detectMealTypes(titleLower, descriptionLower, cache) {
  const scores = {};

  for (const [mealTypeName, keywords] of Object.entries(MEAL_TYPE_KEYWORDS)) {
    let score = 0;

    // Check title keywords (+5 points each)
    for (const keyword of keywords.title) {
      if (titleLower.includes(keyword)) {
        score += 5;
      }
    }

    // Check description keywords (+2 points each)
    for (const keyword of keywords.description) {
      if (descriptionLower.includes(keyword)) {
        score += 2;
      }
    }

    if (score >= 3) {
      scores[mealTypeName] = score;
    }
  }

  // Sort by score descending, take top 2
  const sorted = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2);

  return sorted
    .map(([name]) => cache.mealTypes.get(name))
    .filter(Boolean);
}

/**
 * Check if any ingredient matches any keyword in the list
 */
function hasIngredient(ingredientNames, keywords) {
  for (const keyword of keywords) {
    for (const ingName of ingredientNames) {
      if (ingName.includes(keyword)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Count how many keywords match in the ingredients
 */
function countIngredientMatches(ingredientNames, keywords) {
  let count = 0;
  for (const keyword of keywords) {
    for (const ingName of ingredientNames) {
      if (ingName.includes(keyword)) {
        count++;
        break; // Count each keyword only once
      }
    }
  }
  return count;
}

/**
 * Detect dietary labels from ingredient analysis
 * Returns array of dietary label IDs
 */
function detectDietaryLabels(titleLower, descriptionLower, ingredientNames, cache) {
  const labels = [];

  const hasMeat = hasIngredient(ingredientNames, MEAT_KEYWORDS);
  const hasFish = hasIngredient(ingredientNames, FISH_KEYWORDS);
  const hasAnimalBroth = hasIngredient(ingredientNames, ANIMAL_BROTH_KEYWORDS);
  const hasDairy = hasIngredient(ingredientNames, DAIRY_KEYWORDS);
  const hasEggs = hasIngredient(ingredientNames, EGG_KEYWORDS);
  const hasGluten = hasIngredient(ingredientNames, GLUTEN_KEYWORDS);
  const hasNuts = hasIngredient(ingredientNames, NUT_KEYWORDS);
  const hasHighCarb = hasIngredient(ingredientNames, HIGH_CARB_KEYWORDS);

  // Only attempt dietary detection if we have ingredients to analyze
  if (ingredientNames.length === 0) {
    return labels;
  }

  // Vegetarian: no meat, fish, or animal broth
  if (!hasMeat && !hasFish && !hasAnimalBroth) {
    labels.push('Vegetarian');
  }

  // Vegan: vegetarian + no dairy, eggs
  if (!hasMeat && !hasFish && !hasAnimalBroth && !hasDairy && !hasEggs) {
    labels.push('Vegan');
  }

  // Gluten-Free: no gluten-containing ingredients
  if (!hasGluten) {
    labels.push('Gluten-Free');
  }

  // Dairy-Free: no dairy
  if (!hasDairy) {
    labels.push('Dairy-Free');
  }

  // Nut-Free: no nuts
  if (!hasNuts) {
    labels.push('Nut-Free');
  }

  // High-Protein: 3+ protein sources or mentioned in title
  const proteinCount = countIngredientMatches(ingredientNames, PROTEIN_KEYWORDS);
  if (proteinCount >= 3 || titleLower.includes('high protein') || titleLower.includes('protein')) {
    labels.push('High-Protein');
  }

  // Low-Sodium: only if explicitly mentioned
  const text = titleLower + ' ' + descriptionLower;
  if (text.includes('low sodium') || text.includes('low-sodium') || text.includes('no salt')) {
    labels.push('Low-Sodium');
  }

  // Keto: no high-carb ingredients + has fat/protein indicators
  if (!hasHighCarb && (hasMeat || hasDairy || hasEggs)) {
    labels.push('Keto');
    labels.push('Low-Carb');
  }

  return labels
    .map((name) => cache.dietaryLabels.get(name))
    .filter(Boolean);
}

// ============================================================================
// MAIN API
// ============================================================================

/**
 * Auto-tag a recipe with cuisines, meal types, and dietary labels
 *
 * @param {Object} recipe - Recipe object with title, description, ingredients
 * @param {Object} pool - Database connection pool
 * @returns {Object} { cuisineIds: string[], mealTypeIds: string[], dietaryLabelIds: string[] }
 */
async function autoTagRecipe(recipe, pool) {
  try {
    const cache = await loadCategoryCache(pool);

    const titleLower = (recipe.title || '').toLowerCase();
    const descriptionLower = (recipe.description || '').toLowerCase();

    // Build ingredient name list from various possible formats
    const ingredientNames = (recipe.ingredients || [])
      .map((ing) => {
        const name = ing.ingredient || ing.ingredientName || ing.ingredient_name || ing.rawText || ing.raw_text || '';
        return name.toLowerCase();
      })
      .filter((name) => name.length > 0);

    const cuisineIds = detectCuisines(titleLower, ingredientNames, cache);
    const mealTypeIds = detectMealTypes(titleLower, descriptionLower, cache);
    const dietaryLabelIds = detectDietaryLabels(titleLower, descriptionLower, ingredientNames, cache);

    return { cuisineIds, mealTypeIds, dietaryLabelIds };
  } catch (error) {
    logger.error('Auto-tagging error', { error: error.message });
    return { cuisineIds: [], mealTypeIds: [], dietaryLabelIds: [] };
  }
}

module.exports = {
  autoTagRecipe,
  loadCategoryCache,
  clearCategoryCache,
};
