/**
 * Ingredient Aggregation Engine v2
 *
 * Aggregates shopping list ingredients with:
 * - Common-sense string normalization ("salt and pepper" → "salt & pepper")
 * - Bell pepper variant aggregation with color breakdown
 * - Unit compatibility checking and quantity summing
 * - Safe behavior (never incorrectly combine unrelated items)
 *
 * @module ingredientAggregator
 */

const { normalizeUnit, parseIngredientString, UNIT_MAP } = require('./ingredientParser');

// ============================================
// Unit Compatibility
// ============================================

/**
 * Unit groups that can be combined (with conversion factors to base unit)
 * Base units: tsp (volume-small), cup (volume-large), g (weight-metric), oz (weight-imperial), piece (count)
 */
const UNIT_CONVERSION = {
  // Small volume (base: tsp)
  tsp: { group: 'volume-small', toBase: 1 },
  tbsp: { group: 'volume-small', toBase: 3 },

  // Large volume (base: cup)
  cup: { group: 'volume-large', toBase: 1 },
  'fl oz': { group: 'volume-large', toBase: 0.125 },
  pint: { group: 'volume-large', toBase: 2 },
  quart: { group: 'volume-large', toBase: 4 },
  gallon: { group: 'volume-large', toBase: 16 },
  ml: { group: 'volume-metric', toBase: 1 },
  l: { group: 'volume-metric', toBase: 1000 },

  // Weight metric (base: g)
  g: { group: 'weight-metric', toBase: 1 },
  kg: { group: 'weight-metric', toBase: 1000 },

  // Weight imperial (base: oz)
  oz: { group: 'weight-imperial', toBase: 1 },
  lb: { group: 'weight-imperial', toBase: 16 },

  // Count units (each is its own group - not convertible)
  piece: { group: 'count-piece', toBase: 1 },
  whole: { group: 'count-whole', toBase: 1 },
  can: { group: 'count-can', toBase: 1 },
  package: { group: 'count-package', toBase: 1 },
  jar: { group: 'count-jar', toBase: 1 },
  bottle: { group: 'count-bottle', toBase: 1 },
  box: { group: 'count-box', toBase: 1 },
  bag: { group: 'count-bag', toBase: 1 },
  bunch: { group: 'count-bunch', toBase: 1 },
  head: { group: 'count-head', toBase: 1 },
  clove: { group: 'count-clove', toBase: 1 },
  slice: { group: 'count-slice', toBase: 1 },
  stalk: { group: 'count-stalk', toBase: 1 },
  stick: { group: 'count-stick', toBase: 1 },
  sprig: { group: 'count-sprig', toBase: 1 },
  pinch: { group: 'count-pinch', toBase: 1 },
  dash: { group: 'count-dash', toBase: 1 },
  handful: { group: 'count-handful', toBase: 1 },
  large: { group: 'count-size', toBase: 1 },
  medium: { group: 'count-size', toBase: 1 },
  small: { group: 'count-size', toBase: 1 },
};

/**
 * Check if two units are compatible for summing
 * @param {string|null} unitA - First unit
 * @param {string|null} unitB - Second unit
 * @returns {boolean} True if units can be combined
 */
function areUnitsCompatible(unitA, unitB) {
  // Normalize empty strings to null for consistent comparison
  const normalizedA = unitA === '' ? null : unitA;
  const normalizedB = unitB === '' ? null : unitB;

  // Both null/empty = compatible (unitless items)
  if (normalizedA === null && normalizedB === null) {
    return true;
  }

  // One null, one not = incompatible
  if (normalizedA === null || normalizedB === null) {
    return false;
  }

  // Same unit = compatible
  const normA = normalizeUnit(normalizedA) || normalizedA?.toLowerCase();
  const normB = normalizeUnit(normalizedB) || normalizedB?.toLowerCase();

  if (normA === normB) {
    return true;
  }

  // Check if in same conversion group
  const convA = UNIT_CONVERSION[normA];
  const convB = UNIT_CONVERSION[normB];

  if (convA && convB && convA.group === convB.group) {
    return true;
  }

  return false;
}

// ============================================
// Ingredient Name Normalization
// ============================================

/**
 * Common compound ingredients that should normalize to a canonical form
 */
const COMPOUND_NORMALIZATIONS = {
  'salt and pepper': 'salt & pepper',
  'salt & pepper': 'salt & pepper',
  'salt n pepper': 'salt & pepper',
  'salt pepper': 'salt & pepper',
  'oil and vinegar': 'oil & vinegar',
  'oil & vinegar': 'oil & vinegar',
  'bread and butter': 'bread & butter',
  'bread & butter': 'bread & butter',
  'peanut butter and jelly': 'peanut butter & jelly',
  'peanut butter & jelly': 'peanut butter & jelly',
  'macaroni and cheese': 'macaroni & cheese',
  'macaroni & cheese': 'macaroni & cheese',
  'mac and cheese': 'macaroni & cheese',
  'mac & cheese': 'macaroni & cheese',
};

/**
 * Modifiers that should be stripped to find the core ingredient
 * These are preparation methods, textures, qualities, and sizes
 */
const MODIFIER_PATTERNS = [
  // Preparation methods
  /\b(shredded|grated|sliced|diced|chopped|minced|crushed|ground|whole|halved|quartered)\b/gi,
  /\b(cubed|julienned|chiffonade|rough[- ]?chopped|finely[- ]?chopped|coarsely[- ]?chopped)\b/gi,
  /\b(melted|softened|room[- ]?temperature|cold|chilled|frozen|thawed)\b/gi,
  /\b(toasted|roasted|sautéed|sauteed|fried|baked|grilled|smoked|cured|dried|dehydrated)\b/gi,
  /\b(blanched|steamed|poached|braised|caramelized|charred)\b/gi,
  /\b(peeled|unpeeled|seeded|unseeded|cored|pitted|trimmed|cleaned)\b/gi,
  /\b(beaten|whisked|whipped|creamed|mashed|pureed|puréed|blended)\b/gi,

  // Quality/grade descriptors
  /\b(extra[- ]?sharp|sharp|mild|medium|aged|young|mature|vintage)\b/gi,
  /\b(extra[- ]?virgin|virgin|pure|refined|unrefined|raw|organic|natural)\b/gi,
  /\b(fresh|freshly|dried|dry|canned|jarred|frozen|preserved)\b/gi,
  /\b(low[- ]?fat|lowfat|reduced[- ]?fat|fat[- ]?free|skim|whole|part[- ]?skim|2%|1%)\b/gi,
  /\b(low[- ]?sodium|sodium[- ]?free|no[- ]?salt[- ]?added|reduced[- ]?sodium)\b/gi,
  /\b(unsweetened|sweetened|sugar[- ]?free|no[- ]?sugar[- ]?added)\b/gi,
  /\b(light|lite|heavy|thick|thin|regular)\b/gi,

  // Size descriptors
  /\b(large|medium|small|extra[- ]?large|jumbo|baby|mini|petite)\b/gi,
  /\b(big|little|tiny)\b/gi,

  // Temperature/state
  /\b(unsalted|salted|lightly[- ]?salted)\b/gi,
  /\b(boneless|skinless|bone[- ]?in|skin[- ]?on)\b/gi,

  // Packaging descriptors (often appear in ingredient lists)
  /\b(packed|loosely[- ]?packed|tightly[- ]?packed)\b/gi,
];

/**
 * Core ingredient mappings - map specific variants to their base ingredient
 * Format: regex pattern -> canonical name
 */
const INGREDIENT_FAMILY_MAP = [
  // Cheese variants -> base cheese type
  {
    pattern:
      /\b(cheddar|sharp cheddar|mild cheddar|white cheddar|yellow cheddar|aged cheddar)\s*(cheese)?\b/i,
    canonical: 'cheddar cheese',
    display: 'Cheddar cheese',
  },
  {
    pattern: /\b(mozzarella|fresh mozzarella|part[- ]?skim mozzarella)\s*(cheese)?\b/i,
    canonical: 'mozzarella cheese',
    display: 'Mozzarella cheese',
  },
  {
    pattern: /\b(parmesan|parmigiano[- ]?reggiano|parm)\s*(cheese)?\b/i,
    canonical: 'parmesan cheese',
    display: 'Parmesan cheese',
  },
  {
    pattern: /\b(swiss|gruyere|gruyère|emmental|emmentaler)\s*(cheese)?\b/i,
    canonical: 'swiss cheese',
    display: 'Swiss cheese',
  },
  { pattern: /\b(feta)\s*(cheese)?\b/i, canonical: 'feta cheese', display: 'Feta cheese' },
  { pattern: /\b(goat cheese|chèvre|chevre)\b/i, canonical: 'goat cheese', display: 'Goat cheese' },
  {
    pattern: /\b(cream cheese|neufchâtel|neufchatel)\b/i,
    canonical: 'cream cheese',
    display: 'Cream cheese',
  },
  { pattern: /\b(ricotta)\s*(cheese)?\b/i, canonical: 'ricotta cheese', display: 'Ricotta cheese' },
  { pattern: /\b(cottage cheese)\b/i, canonical: 'cottage cheese', display: 'Cottage cheese' },
  {
    pattern: /\b(blue cheese|bleu cheese|gorgonzola|roquefort|stilton)\b/i,
    canonical: 'blue cheese',
    display: 'Blue cheese',
  },
  {
    pattern: /\b(monterey jack|pepper jack|colby[- ]?jack|colby)\s*(cheese)?\b/i,
    canonical: 'jack cheese',
    display: 'Jack cheese',
  },
  {
    pattern: /\b(provolone)\s*(cheese)?\b/i,
    canonical: 'provolone cheese',
    display: 'Provolone cheese',
  },
  {
    pattern: /\b(american cheese|american)\s*(cheese)?\b/i,
    canonical: 'american cheese',
    display: 'American cheese',
  },
  { pattern: /\b(brie)\s*(cheese)?\b/i, canonical: 'brie cheese', display: 'Brie cheese' },
  {
    pattern: /\b(camembert)\s*(cheese)?\b/i,
    canonical: 'camembert cheese',
    display: 'Camembert cheese',
  },
  {
    pattern: /\b(manchego)\s*(cheese)?\b/i,
    canonical: 'manchego cheese',
    display: 'Manchego cheese',
  },
  { pattern: /\b(asiago)\s*(cheese)?\b/i, canonical: 'asiago cheese', display: 'Asiago cheese' },
  { pattern: /\b(fontina)\s*(cheese)?\b/i, canonical: 'fontina cheese', display: 'Fontina cheese' },
  { pattern: /\b(havarti)\s*(cheese)?\b/i, canonical: 'havarti cheese', display: 'Havarti cheese' },
  { pattern: /\b(gouda)\s*(cheese)?\b/i, canonical: 'gouda cheese', display: 'Gouda cheese' },
  {
    pattern: /\b(pecorino|pecorino romano)\s*(cheese)?\b/i,
    canonical: 'pecorino cheese',
    display: 'Pecorino cheese',
  },

  // Butter variants
  {
    pattern: /\b(butter|unsalted butter|salted butter|sweet cream butter)\b/i,
    canonical: 'butter',
    display: 'Butter',
  },

  // Milk variants
  {
    pattern: /\b(milk|whole milk|2% milk|1% milk|skim milk|fat[- ]?free milk|nonfat milk)\b/i,
    canonical: 'milk',
    display: 'Milk',
  },
  {
    pattern: /\b(buttermilk|cultured buttermilk)\b/i,
    canonical: 'buttermilk',
    display: 'Buttermilk',
  },
  {
    pattern: /\b(half[- ]?and[- ]?half|half & half)\b/i,
    canonical: 'half and half',
    display: 'Half and half',
  },
  {
    pattern: /\b(heavy cream|heavy whipping cream|whipping cream)\b/i,
    canonical: 'heavy cream',
    display: 'Heavy cream',
  },
  { pattern: /\b(sour cream)\b/i, canonical: 'sour cream', display: 'Sour cream' },

  // Yogurt variants
  {
    pattern:
      /\b(yogurt|greek yogurt|plain yogurt|vanilla yogurt|low[- ]?fat yogurt|nonfat yogurt)\b/i,
    canonical: 'yogurt',
    display: 'Yogurt',
  },

  // Onion variants - more specific patterns first
  { pattern: /\b(red onion|purple onion)\b/i, canonical: 'red onion', display: 'Red onion' },
  {
    pattern: /\b(green onion|scallion|spring onion)\b/i,
    canonical: 'green onion',
    display: 'Green onion',
  },
  { pattern: /\b(shallot)\b/i, canonical: 'shallot', display: 'Shallot' },
  {
    pattern: /\b(onion|yellow onion|white onion|sweet onion|vidalia onion|spanish onion)\b/i,
    canonical: 'onion',
    display: 'Onion',
  },

  // Garlic variants
  {
    pattern: /\b(garlic|garlic clove|clove of garlic|cloves of garlic|garlic cloves)\b/i,
    canonical: 'garlic',
    display: 'Garlic',
  },
  { pattern: /\b(garlic powder)\b/i, canonical: 'garlic powder', display: 'Garlic powder' },
  { pattern: /\b(garlic salt)\b/i, canonical: 'garlic salt', display: 'Garlic salt' },
  {
    pattern: /\b(minced garlic|crushed garlic|chopped garlic)\b/i,
    canonical: 'garlic',
    display: 'Garlic',
  },

  // Salt variants - combine all salt types into one family (notes will show breakdown)
  {
    pattern:
      /\b(kosher salt|coarse salt|sea salt|flaky salt|fleur de sel|table salt|fine salt|iodized salt)\b/i,
    canonical: 'salt',
    display: 'Salt',
  },
  { pattern: /^salt$/i, canonical: 'salt', display: 'Salt' },

  // Pepper variants
  {
    pattern:
      /\b(black pepper|ground black pepper|freshly ground black pepper|cracked black pepper|peppercorns)\b/i,
    canonical: 'black pepper',
    display: 'Black pepper',
  },
  {
    pattern: /\b(white pepper|ground white pepper)\b/i,
    canonical: 'white pepper',
    display: 'White pepper',
  },
  {
    pattern: /\b(cayenne pepper|cayenne|ground cayenne)\b/i,
    canonical: 'cayenne pepper',
    display: 'Cayenne pepper',
  },

  // Oil variants
  {
    pattern: /\b(olive oil|extra virgin olive oil|virgin olive oil|evoo|light olive oil)\b/i,
    canonical: 'olive oil',
    display: 'Olive oil',
  },
  {
    pattern: /\b(vegetable oil|canola oil|neutral oil)\b/i,
    canonical: 'vegetable oil',
    display: 'Vegetable oil',
  },
  { pattern: /\b(coconut oil)\b/i, canonical: 'coconut oil', display: 'Coconut oil' },
  {
    pattern: /\b(sesame oil|toasted sesame oil)\b/i,
    canonical: 'sesame oil',
    display: 'Sesame oil',
  },
  { pattern: /\b(avocado oil)\b/i, canonical: 'avocado oil', display: 'Avocado oil' },

  // Flour variants
  {
    pattern: /\b(all[- ]?purpose flour|ap flour|plain flour)\b/i,
    canonical: 'all-purpose flour',
    display: 'All-purpose flour',
  },
  {
    pattern: /\b(bread flour|high[- ]?gluten flour)\b/i,
    canonical: 'bread flour',
    display: 'Bread flour',
  },
  { pattern: /\b(cake flour|pastry flour)\b/i, canonical: 'cake flour', display: 'Cake flour' },
  {
    pattern: /\b(whole wheat flour|whole[- ]?grain flour|wheat flour)\b/i,
    canonical: 'whole wheat flour',
    display: 'Whole wheat flour',
  },
  {
    pattern: /\b(self[- ]?rising flour|self[- ]?raising flour)\b/i,
    canonical: 'self-rising flour',
    display: 'Self-rising flour',
  },
  { pattern: /^flour$/i, canonical: 'all-purpose flour', display: 'All-purpose flour' },

  // Sugar variants
  {
    pattern: /\b(granulated sugar|white sugar|table sugar|cane sugar)\b/i,
    canonical: 'sugar',
    display: 'Sugar',
  },
  {
    pattern: /\b(brown sugar|light brown sugar|dark brown sugar|packed brown sugar)\b/i,
    canonical: 'brown sugar',
    display: 'Brown sugar',
  },
  {
    pattern: /\b(powdered sugar|confectioners sugar|confectioner's sugar|icing sugar|10x sugar)\b/i,
    canonical: 'powdered sugar',
    display: 'Powdered sugar',
  },
  { pattern: /^sugar$/i, canonical: 'sugar', display: 'Sugar' },

  // Tomato variants
  {
    pattern: /\b(tomato|roma tomato|plum tomato|beefsteak tomato|heirloom tomato)\b/i,
    canonical: 'tomato',
    display: 'Tomato',
  },
  {
    pattern: /\b(cherry tomato|grape tomato)\b/i,
    canonical: 'cherry tomato',
    display: 'Cherry tomato',
  },
  { pattern: /\b(tomato paste)\b/i, canonical: 'tomato paste', display: 'Tomato paste' },
  { pattern: /\b(tomato sauce|marinara)\b/i, canonical: 'tomato sauce', display: 'Tomato sauce' },
  {
    pattern: /\b(crushed tomato|diced tomato|canned tomato|whole tomato|san marzano)\b/i,
    canonical: 'canned tomato',
    display: 'Canned tomatoes',
  },
  {
    pattern: /\b(sun[- ]?dried tomato)\b/i,
    canonical: 'sun-dried tomato',
    display: 'Sun-dried tomatoes',
  },

  // Egg variants
  { pattern: /\b(egg|large egg|eggs|chicken egg)\b/i, canonical: 'egg', display: 'Egg' },
  { pattern: /\b(egg white|egg whites)\b/i, canonical: 'egg white', display: 'Egg white' },
  { pattern: /\b(egg yolk|egg yolks)\b/i, canonical: 'egg yolk', display: 'Egg yolk' },

  // Chicken variants
  {
    pattern: /\b(chicken breast|boneless chicken breast|skinless chicken breast|chicken cutlet)\b/i,
    canonical: 'chicken breast',
    display: 'Chicken breast',
  },
  {
    pattern: /\b(chicken thigh|boneless chicken thigh|skinless chicken thigh)\b/i,
    canonical: 'chicken thigh',
    display: 'Chicken thigh',
  },
  { pattern: /\b(ground chicken)\b/i, canonical: 'ground chicken', display: 'Ground chicken' },
  {
    pattern: /\b(whole chicken|roasting chicken)\b/i,
    canonical: 'whole chicken',
    display: 'Whole chicken',
  },

  // Beef variants
  {
    pattern: /\b(ground beef|lean ground beef|ground chuck|ground sirloin|minced beef)\b/i,
    canonical: 'ground beef',
    display: 'Ground beef',
  },
  {
    pattern:
      /\b(beef steak|steak|sirloin|ribeye|rib[- ]?eye|filet|fillet|strip steak|ny strip|new york strip|t[- ]?bone|porterhouse)\b/i,
    canonical: 'beef steak',
    display: 'Beef steak',
  },
  {
    pattern: /\b(beef roast|chuck roast|pot roast|brisket)\b/i,
    canonical: 'beef roast',
    display: 'Beef roast',
  },

  // Pork variants
  { pattern: /\b(ground pork)\b/i, canonical: 'ground pork', display: 'Ground pork' },
  {
    pattern: /\b(pork chop|bone[- ]?in pork chop|boneless pork chop)\b/i,
    canonical: 'pork chop',
    display: 'Pork chop',
  },
  { pattern: /\b(pork tenderloin|pork loin)\b/i, canonical: 'pork loin', display: 'Pork loin' },
  {
    pattern: /\b(bacon|thick[- ]?cut bacon|applewood bacon|smoked bacon)\b/i,
    canonical: 'bacon',
    display: 'Bacon',
  },
  { pattern: /\b(ham|smoked ham|honey ham|deli ham)\b/i, canonical: 'ham', display: 'Ham' },
  {
    pattern: /\b(sausage|italian sausage|breakfast sausage|pork sausage)\b/i,
    canonical: 'sausage',
    display: 'Sausage',
  },

  // Lemon/lime variants
  { pattern: /\b(lemon|fresh lemon|meyer lemon)\b/i, canonical: 'lemon', display: 'Lemon' },
  {
    pattern: /\b(lemon juice|fresh lemon juice|freshly squeezed lemon juice)\b/i,
    canonical: 'lemon juice',
    display: 'Lemon juice',
  },
  { pattern: /\b(lemon zest)\b/i, canonical: 'lemon zest', display: 'Lemon zest' },
  { pattern: /\b(lime|fresh lime|key lime)\b/i, canonical: 'lime', display: 'Lime' },
  {
    pattern: /\b(lime juice|fresh lime juice|freshly squeezed lime juice)\b/i,
    canonical: 'lime juice',
    display: 'Lime juice',
  },
  { pattern: /\b(lime zest)\b/i, canonical: 'lime zest', display: 'Lime zest' },

  // Vinegar variants
  {
    pattern: /\b(white vinegar|distilled white vinegar|distilled vinegar)\b/i,
    canonical: 'white vinegar',
    display: 'White vinegar',
  },
  {
    pattern: /\b(apple cider vinegar|cider vinegar)\b/i,
    canonical: 'apple cider vinegar',
    display: 'Apple cider vinegar',
  },
  {
    pattern: /\b(balsamic vinegar|aged balsamic)\b/i,
    canonical: 'balsamic vinegar',
    display: 'Balsamic vinegar',
  },
  {
    pattern: /\b(red wine vinegar)\b/i,
    canonical: 'red wine vinegar',
    display: 'Red wine vinegar',
  },
  {
    pattern: /\b(white wine vinegar)\b/i,
    canonical: 'white wine vinegar',
    display: 'White wine vinegar',
  },
  {
    pattern: /\b(rice vinegar|rice wine vinegar)\b/i,
    canonical: 'rice vinegar',
    display: 'Rice vinegar',
  },

  // Herb variants
  {
    pattern: /\b(parsley|fresh parsley|flat[- ]?leaf parsley|italian parsley|curly parsley)\b/i,
    canonical: 'parsley',
    display: 'Parsley',
  },
  { pattern: /\b(dried parsley)\b/i, canonical: 'dried parsley', display: 'Dried parsley' },
  {
    pattern: /\b(cilantro|fresh cilantro|coriander leaves)\b/i,
    canonical: 'cilantro',
    display: 'Cilantro',
  },
  {
    pattern: /\b(basil|fresh basil|sweet basil|thai basil)\b/i,
    canonical: 'basil',
    display: 'Basil',
  },
  { pattern: /\b(dried basil)\b/i, canonical: 'dried basil', display: 'Dried basil' },
  { pattern: /\b(oregano|fresh oregano)\b/i, canonical: 'oregano', display: 'Oregano' },
  { pattern: /\b(dried oregano)\b/i, canonical: 'dried oregano', display: 'Dried oregano' },
  { pattern: /\b(thyme|fresh thyme)\b/i, canonical: 'thyme', display: 'Thyme' },
  { pattern: /\b(dried thyme)\b/i, canonical: 'dried thyme', display: 'Dried thyme' },
  { pattern: /\b(rosemary|fresh rosemary)\b/i, canonical: 'rosemary', display: 'Rosemary' },
  { pattern: /\b(dried rosemary)\b/i, canonical: 'dried rosemary', display: 'Dried rosemary' },
  { pattern: /\b(sage|fresh sage)\b/i, canonical: 'sage', display: 'Sage' },
  { pattern: /\b(dried sage)\b/i, canonical: 'dried sage', display: 'Dried sage' },
  { pattern: /\b(mint|fresh mint|spearmint|peppermint)\b/i, canonical: 'mint', display: 'Mint' },
  { pattern: /\b(dill|fresh dill|dill weed)\b/i, canonical: 'dill', display: 'Dill' },
  { pattern: /\b(chives|fresh chives)\b/i, canonical: 'chives', display: 'Chives' },
  { pattern: /\b(bay leaf|bay leaves)\b/i, canonical: 'bay leaf', display: 'Bay leaf' },

  // Spice variants
  {
    pattern: /\b(cinnamon|ground cinnamon|cinnamon stick)\b/i,
    canonical: 'cinnamon',
    display: 'Cinnamon',
  },
  {
    pattern: /\b(nutmeg|ground nutmeg|whole nutmeg|freshly grated nutmeg)\b/i,
    canonical: 'nutmeg',
    display: 'Nutmeg',
  },
  { pattern: /\b(cumin|ground cumin|cumin seed)\b/i, canonical: 'cumin', display: 'Cumin' },
  {
    pattern: /\b(paprika|smoked paprika|sweet paprika|hot paprika|hungarian paprika)\b/i,
    canonical: 'paprika',
    display: 'Paprika',
  },
  {
    pattern: /\b(chili powder|chile powder)\b/i,
    canonical: 'chili powder',
    display: 'Chili powder',
  },
  { pattern: /\b(curry powder)\b/i, canonical: 'curry powder', display: 'Curry powder' },
  {
    pattern: /\b(ginger|fresh ginger|ground ginger|ginger root|minced ginger)\b/i,
    canonical: 'ginger',
    display: 'Ginger',
  },
  { pattern: /\b(turmeric|ground turmeric)\b/i, canonical: 'turmeric', display: 'Turmeric' },
  {
    pattern: /\b(coriander|ground coriander|coriander seed)\b/i,
    canonical: 'coriander',
    display: 'Coriander',
  },
  { pattern: /\b(allspice|ground allspice)\b/i, canonical: 'allspice', display: 'Allspice' },
  { pattern: /\b(cloves|ground cloves|whole cloves)\b/i, canonical: 'cloves', display: 'Cloves' },
  {
    pattern: /\b(cardamom|ground cardamom|cardamom pod)\b/i,
    canonical: 'cardamom',
    display: 'Cardamom',
  },

  // Broth/stock variants
  {
    pattern: /\b(chicken broth|chicken stock|low[- ]?sodium chicken broth)\b/i,
    canonical: 'chicken broth',
    display: 'Chicken broth',
  },
  {
    pattern: /\b(beef broth|beef stock|low[- ]?sodium beef broth)\b/i,
    canonical: 'beef broth',
    display: 'Beef broth',
  },
  {
    pattern: /\b(vegetable broth|vegetable stock|veggie broth)\b/i,
    canonical: 'vegetable broth',
    display: 'Vegetable broth',
  },

  // Soy sauce variants
  {
    pattern: /\b(soy sauce|low[- ]?sodium soy sauce|light soy sauce|dark soy sauce|tamari)\b/i,
    canonical: 'soy sauce',
    display: 'Soy sauce',
  },

  // Mustard variants
  { pattern: /\b(dijon mustard|dijon)\b/i, canonical: 'dijon mustard', display: 'Dijon mustard' },
  {
    pattern: /\b(yellow mustard|american mustard|prepared mustard)\b/i,
    canonical: 'yellow mustard',
    display: 'Yellow mustard',
  },
  {
    pattern: /\b(whole grain mustard|stone ground mustard|coarse mustard)\b/i,
    canonical: 'whole grain mustard',
    display: 'Whole grain mustard',
  },
  {
    pattern: /\b(dry mustard|mustard powder)\b/i,
    canonical: 'dry mustard',
    display: 'Dry mustard',
  },

  // Honey/syrup variants
  {
    pattern: /\b(honey|raw honey|clover honey|wildflower honey)\b/i,
    canonical: 'honey',
    display: 'Honey',
  },
  {
    pattern: /\b(maple syrup|pure maple syrup)\b/i,
    canonical: 'maple syrup',
    display: 'Maple syrup',
  },

  // Rice variants
  {
    pattern: /\b(white rice|long[- ]?grain rice|basmati rice|jasmine rice)\b/i,
    canonical: 'white rice',
    display: 'White rice',
  },
  {
    pattern: /\b(brown rice|long[- ]?grain brown rice)\b/i,
    canonical: 'brown rice',
    display: 'Brown rice',
  },
  {
    pattern: /\b(arborio rice|risotto rice)\b/i,
    canonical: 'arborio rice',
    display: 'Arborio rice',
  },
  { pattern: /^rice$/i, canonical: 'white rice', display: 'White rice' },

  // Pasta variants
  {
    pattern: /\b(spaghetti|thin spaghetti|angel hair)\b/i,
    canonical: 'spaghetti',
    display: 'Spaghetti',
  },
  { pattern: /\b(penne|rigatoni|ziti)\b/i, canonical: 'penne', display: 'Penne' },
  {
    pattern: /\b(fettuccine|fettuccini|tagliatelle)\b/i,
    canonical: 'fettuccine',
    display: 'Fettuccine',
  },
  {
    pattern: /\b(macaroni|elbow macaroni|elbow pasta)\b/i,
    canonical: 'macaroni',
    display: 'Macaroni',
  },
  {
    pattern: /\b(lasagna|lasagne|lasagna noodle|lasagna sheet)\b/i,
    canonical: 'lasagna noodles',
    display: 'Lasagna noodles',
  },

  // Bread variants
  {
    pattern: /\b(bread|white bread|sandwich bread|sliced bread)\b/i,
    canonical: 'bread',
    display: 'Bread',
  },
  {
    pattern: /\b(bread crumb|breadcrumb|panko|panko breadcrumb)\b/i,
    canonical: 'breadcrumbs',
    display: 'Breadcrumbs',
  },

  // Bean variants
  {
    pattern: /\b(black bean|canned black bean)\b/i,
    canonical: 'black beans',
    display: 'Black beans',
  },
  {
    pattern: /\b(kidney bean|red kidney bean|canned kidney bean)\b/i,
    canonical: 'kidney beans',
    display: 'Kidney beans',
  },
  {
    pattern: /\b(pinto bean|canned pinto bean)\b/i,
    canonical: 'pinto beans',
    display: 'Pinto beans',
  },
  {
    pattern: /\b(cannellini bean|white bean|great northern bean|navy bean)\b/i,
    canonical: 'white beans',
    display: 'White beans',
  },
  {
    pattern: /\b(chickpea|garbanzo bean|canned chickpea)\b/i,
    canonical: 'chickpeas',
    display: 'Chickpeas',
  },
  {
    pattern: /\b(lentil|green lentil|brown lentil|red lentil)\b/i,
    canonical: 'lentils',
    display: 'Lentils',
  },

  // Nut variants
  {
    pattern: /\b(almond|whole almond|sliced almond|slivered almond)\b/i,
    canonical: 'almonds',
    display: 'Almonds',
  },
  { pattern: /\b(walnut|walnut half|walnut piece)\b/i, canonical: 'walnuts', display: 'Walnuts' },
  { pattern: /\b(pecan|pecan half|pecan piece)\b/i, canonical: 'pecans', display: 'Pecans' },
  {
    pattern: /\b(peanut|roasted peanut|unsalted peanut|salted peanut)\b/i,
    canonical: 'peanuts',
    display: 'Peanuts',
  },
  { pattern: /\b(cashew|roasted cashew)\b/i, canonical: 'cashews', display: 'Cashews' },
  { pattern: /\b(pine nut|pignoli)\b/i, canonical: 'pine nuts', display: 'Pine nuts' },

  // Celery variants
  { pattern: /\b(celery|celery stalk|celery rib)\b/i, canonical: 'celery', display: 'Celery' },

  // Carrot variants
  { pattern: /\b(carrot|baby carrot)\b/i, canonical: 'carrot', display: 'Carrot' },

  // Potato variants
  {
    pattern: /\b(potato|russet potato|idaho potato|baking potato|yukon gold|yellow potato)\b/i,
    canonical: 'potato',
    display: 'Potato',
  },
  {
    pattern: /\b(red potato|new potato|baby potato|fingerling)\b/i,
    canonical: 'red potato',
    display: 'Red potato',
  },
  { pattern: /\b(sweet potato|yam)\b/i, canonical: 'sweet potato', display: 'Sweet potato' },

  // Lettuce/greens variants
  {
    pattern:
      /\b(lettuce|romaine|romaine lettuce|iceberg|iceberg lettuce|butter lettuce|bibb lettuce)\b/i,
    canonical: 'lettuce',
    display: 'Lettuce',
  },
  {
    pattern: /\b(spinach|baby spinach|fresh spinach)\b/i,
    canonical: 'spinach',
    display: 'Spinach',
  },
  {
    pattern: /\b(kale|curly kale|lacinato kale|tuscan kale)\b/i,
    canonical: 'kale',
    display: 'Kale',
  },
  { pattern: /\b(arugula|rocket)\b/i, canonical: 'arugula', display: 'Arugula' },
  {
    pattern: /\b(mixed greens|salad greens|spring mix|mesclun)\b/i,
    canonical: 'mixed greens',
    display: 'Mixed greens',
  },

  // Mushroom variants
  {
    pattern: /\b(mushroom|white mushroom|button mushroom|cremini|crimini|baby bella)\b/i,
    canonical: 'mushroom',
    display: 'Mushroom',
  },
  {
    pattern: /\b(portobello|portabella|portabello mushroom)\b/i,
    canonical: 'portobello mushroom',
    display: 'Portobello mushroom',
  },
  {
    pattern: /\b(shiitake|shiitake mushroom)\b/i,
    canonical: 'shiitake mushroom',
    display: 'Shiitake mushroom',
  },

  // Cucumber variants
  {
    pattern: /\b(cucumber|english cucumber|persian cucumber|hothouse cucumber)\b/i,
    canonical: 'cucumber',
    display: 'Cucumber',
  },

  // Avocado variants
  { pattern: /\b(avocado|hass avocado|ripe avocado)\b/i, canonical: 'avocado', display: 'Avocado' },

  // Corn variants
  {
    pattern: /\b(corn|sweet corn|corn kernel|canned corn|frozen corn)\b/i,
    canonical: 'corn',
    display: 'Corn',
  },
  {
    pattern: /\b(corn on the cob|ear of corn)\b/i,
    canonical: 'corn on the cob',
    display: 'Corn on the cob',
  },

  // Zucchini/squash variants
  { pattern: /\b(zucchini|courgette)\b/i, canonical: 'zucchini', display: 'Zucchini' },
  {
    pattern: /\b(yellow squash|summer squash)\b/i,
    canonical: 'yellow squash',
    display: 'Yellow squash',
  },
  {
    pattern: /\b(butternut squash)\b/i,
    canonical: 'butternut squash',
    display: 'Butternut squash',
  },
  { pattern: /\b(acorn squash)\b/i, canonical: 'acorn squash', display: 'Acorn squash' },
  {
    pattern: /\b(spaghetti squash)\b/i,
    canonical: 'spaghetti squash',
    display: 'Spaghetti squash',
  },

  // Broccoli/cauliflower
  {
    pattern: /\b(broccoli|broccoli floret|broccoli crown)\b/i,
    canonical: 'broccoli',
    display: 'Broccoli',
  },
  {
    pattern: /\b(cauliflower|cauliflower floret)\b/i,
    canonical: 'cauliflower',
    display: 'Cauliflower',
  },

  // Asparagus
  { pattern: /\b(asparagus|asparagus spear)\b/i, canonical: 'asparagus', display: 'Asparagus' },

  // Green beans
  {
    pattern: /\b(green bean|string bean|snap bean|haricot vert)\b/i,
    canonical: 'green beans',
    display: 'Green beans',
  },

  // Pea variants
  {
    pattern: /\b(pea|green pea|english pea|garden pea|frozen pea)\b/i,
    canonical: 'peas',
    display: 'Peas',
  },
  { pattern: /\b(snow pea)\b/i, canonical: 'snow peas', display: 'Snow peas' },
  {
    pattern: /\b(sugar snap pea|snap pea)\b/i,
    canonical: 'sugar snap peas',
    display: 'Sugar snap peas',
  },

  // Cabbage variants
  {
    pattern: /\b(cabbage|green cabbage|white cabbage)\b/i,
    canonical: 'cabbage',
    display: 'Cabbage',
  },
  {
    pattern: /\b(red cabbage|purple cabbage)\b/i,
    canonical: 'red cabbage',
    display: 'Red cabbage',
  },
  {
    pattern: /\b(napa cabbage|chinese cabbage)\b/i,
    canonical: 'napa cabbage',
    display: 'Napa cabbage',
  },

  // Eggplant
  { pattern: /\b(eggplant|aubergine)\b/i, canonical: 'eggplant', display: 'Eggplant' },

  // Hot pepper variants (keep separate from bell peppers)
  {
    pattern: /\b(jalapeño|jalapeno|jalapeño pepper|jalapeno pepper)\b/i,
    canonical: 'jalapeño',
    display: 'Jalapeño',
  },
  {
    pattern: /\b(serrano|serrano pepper)\b/i,
    canonical: 'serrano pepper',
    display: 'Serrano pepper',
  },
  {
    pattern: /\b(habanero|habanero pepper)\b/i,
    canonical: 'habanero pepper',
    display: 'Habanero pepper',
  },
  {
    pattern: /\b(poblano|poblano pepper)\b/i,
    canonical: 'poblano pepper',
    display: 'Poblano pepper',
  },
  {
    pattern: /\b(chipotle|chipotle pepper|chipotle in adobo)\b/i,
    canonical: 'chipotle pepper',
    display: 'Chipotle pepper',
  },

  // Vanilla variants
  {
    pattern: /\b(vanilla|vanilla extract|pure vanilla extract|vanilla bean)\b/i,
    canonical: 'vanilla extract',
    display: 'Vanilla extract',
  },

  // Chocolate variants
  {
    pattern:
      /\b(chocolate chip|semi[- ]?sweet chocolate chip|milk chocolate chip|dark chocolate chip)\b/i,
    canonical: 'chocolate chips',
    display: 'Chocolate chips',
  },
  {
    pattern: /\b(cocoa powder|unsweetened cocoa|dutch[- ]?process cocoa)\b/i,
    canonical: 'cocoa powder',
    display: 'Cocoa powder',
  },
  {
    pattern: /\b(baking chocolate|unsweetened chocolate)\b/i,
    canonical: 'baking chocolate',
    display: 'Baking chocolate',
  },

  // Baking essentials
  {
    pattern: /\b(baking soda|bicarbonate of soda)\b/i,
    canonical: 'baking soda',
    display: 'Baking soda',
  },
  { pattern: /\b(baking powder)\b/i, canonical: 'baking powder', display: 'Baking powder' },
  {
    pattern: /\b(yeast|active dry yeast|instant yeast|rapid rise yeast)\b/i,
    canonical: 'yeast',
    display: 'Yeast',
  },
  { pattern: /\b(cornstarch|corn starch)\b/i, canonical: 'cornstarch', display: 'Cornstarch' },

  // Mayonnaise variants
  {
    pattern: /\b(mayonnaise|mayo|light mayo|low[- ]?fat mayo)\b/i,
    canonical: 'mayonnaise',
    display: 'Mayonnaise',
  },

  // Ketchup
  { pattern: /\b(ketchup|catsup|tomato ketchup)\b/i, canonical: 'ketchup', display: 'Ketchup' },

  // Worcestershire
  {
    pattern: /\b(worcestershire sauce|worcestershire)\b/i,
    canonical: 'worcestershire sauce',
    display: 'Worcestershire sauce',
  },

  // Hot sauce
  {
    pattern: /\b(hot sauce|tabasco|franks|louisiana hot sauce|sriracha)\b/i,
    canonical: 'hot sauce',
    display: 'Hot sauce',
  },
];

/**
 * Strip modifier words from ingredient text to find core ingredient
 * @param {string} text - Ingredient text (lowercase)
 * @returns {string} Text with modifiers removed
 */
function stripModifiers(text) {
  let result = text;

  for (const pattern of MODIFIER_PATTERNS) {
    // Reset regex lastIndex for global patterns
    pattern.lastIndex = 0;
    result = result.replace(pattern, ' ');
  }

  // Clean up multiple spaces and trim
  return result.replace(/\s+/g, ' ').trim();
}

/**
 * Try to match an ingredient to a known family
 * @param {string} text - Ingredient text (lowercase, modifiers stripped)
 * @returns {{ canonical: string, display: string } | null}
 */
function matchIngredientFamily(text) {
  for (const mapping of INGREDIENT_FAMILY_MAP) {
    if (mapping.pattern.test(text)) {
      return { canonical: mapping.canonical, display: mapping.display };
    }
  }
  return null;
}

/**
 * Normalize an ingredient name to produce a canonical key and display name
 *
 * @param {string} nameOrText - Ingredient name or raw text
 * @returns {{ canonicalKey: string, displayName: string, attributes: Object }}
 */
function normalizeIngredientName(nameOrText) {
  if (!nameOrText || typeof nameOrText !== 'string') {
    return {
      canonicalKey: '',
      displayName: '',
      attributes: {},
    };
  }

  let text = nameOrText.trim();

  // Step 1: Basic normalization
  // - Collapse multiple spaces
  // - Strip trailing punctuation
  // - Normalize unicode (already handled by parser, but be safe)
  text = text.replace(/\s+/g, ' ').replace(/[.,;:!?]+$/, '');

  // Step 2: Lowercase for comparison
  const lower = text.toLowerCase();

  // Step 3: Check for compound normalizations first (e.g., "salt and pepper")
  if (COMPOUND_NORMALIZATIONS[lower]) {
    const canonical = COMPOUND_NORMALIZATIONS[lower];
    return {
      canonicalKey: canonical,
      displayName: capitalizeFirst(canonical),
      attributes: { compound: true },
    };
  }

  // Step 4: Bell pepper variant detection (before stripping modifiers)
  const bellPepperResult = detectBellPepper(lower);
  if (bellPepperResult) {
    return bellPepperResult;
  }

  // Step 5: Try to match ingredient family BEFORE stripping modifiers
  // This catches things like "unsalted butter" → "butter"
  const familyMatch = matchIngredientFamily(lower);
  if (familyMatch) {
    return {
      canonicalKey: familyMatch.canonical,
      displayName: familyMatch.display,
      attributes: { familyMatched: true },
    };
  }

  // Step 6: Strip modifiers and try family match again
  const stripped = stripModifiers(lower);
  if (stripped !== lower && stripped.length > 0) {
    const strippedFamilyMatch = matchIngredientFamily(stripped);
    if (strippedFamilyMatch) {
      return {
        canonicalKey: strippedFamilyMatch.canonical,
        displayName: strippedFamilyMatch.display,
        attributes: { familyMatched: true, modifiersStripped: true },
      };
    }
  }

  // Step 7: "and" → "&" normalization for short ingredient conjunctions
  // Only apply to patterns like "X and Y" where X and Y are short words
  const andPattern = /^(\w{2,12})\s+and\s+(\w{2,12})$/i;
  const andMatch = lower.match(andPattern);
  if (andMatch) {
    const normalized = `${andMatch[1]} & ${andMatch[2]}`;
    return {
      canonicalKey: normalized,
      displayName: capitalizeFirst(normalized),
      attributes: { compound: true },
    };
  }

  // Step 8: Standard normalization on stripped text
  // - Singularize common plurals
  // - Normalize spacing
  const textToSingularize = stripped.length > 0 ? stripped : lower;
  const singularized = singularize(textToSingularize);

  return {
    canonicalKey: singularized,
    displayName: capitalizeFirst(singularized),
    attributes: stripped !== lower ? { modifiersStripped: true } : {},
  };
}

/**
 * Detect if an ingredient is a bell pepper variant
 * @param {string} lower - Lowercased ingredient name
 * @returns {Object|null} Normalization result or null if not a bell pepper
 */
function detectBellPepper(lower) {
  // Check for explicit bell pepper mentions
  const bellPepperMatch = lower.match(/^(red|green|yellow|orange)?\s*bell\s+peppers?$/i);
  if (bellPepperMatch) {
    const color = bellPepperMatch[1]?.toLowerCase() || null;
    return {
      canonicalKey: 'bell pepper',
      displayName: 'Bell peppers',
      attributes: {
        isBellPepper: true,
        color: color,
      },
    };
  }

  // Check for "red/green/yellow pepper" (without "bell") - only if clearly a bell pepper context
  // IMPORTANT: Plain "pepper" should NOT match - it could be black pepper
  const colorPepperMatch = lower.match(/^(red|green|yellow|orange)\s+peppers?$/i);
  if (colorPepperMatch) {
    const color = colorPepperMatch[1].toLowerCase();
    // These colored peppers are typically bell peppers
    return {
      canonicalKey: 'bell pepper',
      displayName: 'Bell peppers',
      attributes: {
        isBellPepper: true,
        color: color,
      },
    };
  }

  return null;
}

/**
 * Simple singularization for common ingredient plurals
 * @param {string} word - Word to singularize
 * @returns {string} Singularized word
 */
function singularize(word) {
  // Special cases
  const irregulars = {
    tomatoes: 'tomato',
    potatoes: 'potato',
    leaves: 'leaf',
    halves: 'half',
    loaves: 'loaf',
    knives: 'knife',
    shelves: 'shelf',
  };

  if (irregulars[word]) {
    return irregulars[word];
  }

  // Common patterns
  if (word.endsWith('ies') && word.length > 4) {
    return word.slice(0, -3) + 'y';
  }

  if (
    word.endsWith('es') &&
    (word.endsWith('shes') ||
      word.endsWith('ches') ||
      word.endsWith('xes') ||
      word.endsWith('sses'))
  ) {
    return word.slice(0, -2);
  }

  if (word.endsWith('s') && !word.endsWith('ss') && word.length > 3) {
    return word.slice(0, -1);
  }

  return word;
}

/**
 * Capitalize first letter of a string
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
function capitalizeFirst(str) {
  if (!str) {
    return '';
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ============================================
// Aggregation Engine
// ============================================

/**
 * Aggregate ingredient lines from multiple recipes into a shopping list
 *
 * @param {Array<Object>} lines - Array of ingredient line objects
 * @param {Object} [options] - Aggregation options
 * @param {boolean} [options.groupByRecipe=false] - Keep recipe separation in output
 * @returns {Array<AggregatedItem>} Aggregated shopping list items
 *
 * Input format (per line):
 * {
 *   recipeId: string,
 *   originalText: string,
 *   quantity?: number|null,
 *   unit?: string|null,
 *   name?: string|null,
 *   ingredientName?: string|null,  // Alternative field name
 * }
 *
 * Output format (AggregatedItem):
 * {
 *   displayName: string,
 *   canonicalKey: string,
 *   totalQuantity: number|null,
 *   unit: string|null,
 *   components?: Array<{ label, quantity, unit }>,
 *   sourceLines: Array<{ recipeId, originalText, parsed }>,
 *   notes?: string,
 * }
 */
function aggregateIngredients(lines, _options = {}) {
  if (!Array.isArray(lines) || lines.length === 0) {
    return [];
  }

  // Map to group items by canonical key
  const groups = new Map();

  for (const line of lines) {
    // Extract name from various possible fields
    const rawName =
      line.name ||
      line.ingredientName ||
      line.ingredient_name ||
      extractNameFromText(line.originalText || line.rawText || '');

    // Normalize the ingredient name
    const { canonicalKey, displayName, attributes } = normalizeIngredientName(rawName);

    if (!canonicalKey) {
      // Skip items that can't be normalized
      continue;
    }

    // Get or create group
    if (!groups.has(canonicalKey)) {
      groups.set(canonicalKey, {
        canonicalKey,
        displayName,
        attributes,
        items: [],
      });
    }

    const group = groups.get(canonicalKey);

    // Normalize unit - may come from line or need to be parsed
    let unit = normalizeUnit(line.unit) || line.unit || null;

    // Parse quantity if needed
    let quantity = line.quantity;
    if ((quantity === undefined || quantity === null) && line.originalText) {
      // Parse the full ingredient text to extract quantity and unit
      const parsed = parseIngredientString(line.originalText);
      quantity = parsed.quantity;
      if (!unit && parsed.unit) {
        unit = normalizeUnit(parsed.unit) || parsed.unit;
      }
    }

    // Add item to group
    group.items.push({
      recipeId: line.recipeId || line.recipe_id || 'unknown',
      originalText: line.originalText || line.rawText || rawName,
      quantity: quantity ?? null,
      unit,
      attributes: { ...attributes },
    });
  }

  // Process each group into an AggregatedItem
  const results = [];

  for (const group of groups.values()) {
    const aggregated = processGroup(group);
    results.push(aggregated);
  }

  // Sort alphabetically by displayName
  results.sort((a, b) => a.displayName.localeCompare(b.displayName));

  return results;
}

/**
 * Process a group of items into an AggregatedItem
 * @param {Object} group - Group object with items
 * @returns {AggregatedItem} Aggregated item
 */
function processGroup(group) {
  const { canonicalKey, displayName, attributes, items } = group;

  // Build source lines
  const sourceLines = items.map((item) => ({
    recipeId: item.recipeId,
    originalText: item.originalText,
    parsed: {
      quantity: item.quantity,
      unit: item.unit,
      name: displayName,
    },
  }));

  // Handle bell pepper special case with color breakdown
  if (attributes.isBellPepper) {
    return processBellPepperGroup(canonicalKey, displayName, items, sourceLines);
  }

  // Standard aggregation: try to sum quantities if units are compatible
  const { totalQuantity, unit, canSum } = sumQuantities(items);

  const result = {
    displayName,
    canonicalKey,
    totalQuantity,
    unit,
    sourceLines,
  };

  // Add notes if we couldn't sum everything
  if (!canSum && items.length > 1) {
    result.notes = buildNotesFromItems(items);
  }

  return result;
}

/**
 * Process bell pepper group with color breakdown
 */
function processBellPepperGroup(canonicalKey, displayName, items, sourceLines) {
  // Group by color
  const colorGroups = new Map();
  let totalQuantity = 0;
  let hasValidQuantity = false;

  for (const item of items) {
    const color = item.attributes?.color || 'unspecified';

    if (!colorGroups.has(color)) {
      colorGroups.set(color, { quantity: 0, count: 0 });
    }

    const colorGroup = colorGroups.get(color);
    colorGroup.count++;

    if (item.quantity !== null && item.quantity !== undefined) {
      // Ensure numeric addition
      const numericQty =
        typeof item.quantity === 'string' ? parseFloat(item.quantity) : Number(item.quantity);
      if (!isNaN(numericQty)) {
        colorGroup.quantity += numericQty;
        totalQuantity += numericQty;
        hasValidQuantity = true;
      }
    }
  }

  // Build components array
  const components = [];
  for (const [color, data] of colorGroups) {
    if (color !== 'unspecified' || colorGroups.size === 1) {
      components.push({
        label: color,
        quantity: data.quantity || data.count,
        unit: null,
      });
    }
  }

  // Build notes string
  let notes = null;
  if (components.length > 1 || (components.length === 1 && components[0].label !== 'unspecified')) {
    const breakdown = components
      .filter((c) => c.label !== 'unspecified')
      .map((c) => `${c.quantity} ${c.label}`)
      .join(', ');
    if (breakdown) {
      notes = `Breakdown: ${breakdown}`;
    }
  }

  return {
    displayName,
    canonicalKey,
    totalQuantity: hasValidQuantity ? totalQuantity : null,
    unit: null, // Bell peppers are typically counted
    components: components.length > 0 ? components : undefined,
    sourceLines,
    notes,
  };
}

/**
 * Sum quantities from items if units are compatible
 * @param {Array} items - Items to sum
 * @returns {{ totalQuantity: number|null, unit: string|null, canSum: boolean }}
 */
function sumQuantities(items) {
  if (items.length === 0) {
    return { totalQuantity: null, unit: null, canSum: true };
  }

  // Check if all items have compatible units
  const firstUnit = items[0].unit;
  let allCompatible = true;
  let totalQuantity = 0;
  let hasAnyQuantity = false;

  for (const item of items) {
    if (!areUnitsCompatible(firstUnit, item.unit)) {
      allCompatible = false;
      break;
    }

    if (item.quantity !== null && item.quantity !== undefined) {
      // Ensure quantity is a number (database may return strings)
      const numericQuantity =
        typeof item.quantity === 'string' ? parseFloat(item.quantity) : Number(item.quantity);
      if (!isNaN(numericQuantity)) {
        // Convert to common unit if needed
        const converted = convertToCommonUnit(numericQuantity, item.unit, firstUnit);
        totalQuantity += converted;
        hasAnyQuantity = true;
      }
    }
  }

  if (!allCompatible) {
    return {
      totalQuantity: null,
      unit: null,
      canSum: false,
    };
  }

  return {
    totalQuantity: hasAnyQuantity ? totalQuantity : null,
    unit: firstUnit,
    canSum: true,
  };
}

/**
 * Convert quantity from one unit to another (within same group)
 */
function convertToCommonUnit(quantity, fromUnit, toUnit) {
  if (quantity === null || quantity === undefined) {
    return 0;
  }

  // Ensure quantity is a number
  const numericQty = typeof quantity === 'string' ? parseFloat(quantity) : Number(quantity);
  if (isNaN(numericQty)) {
    return 0;
  }

  const normFrom = normalizeUnit(fromUnit) || fromUnit?.toLowerCase();
  const normTo = normalizeUnit(toUnit) || toUnit?.toLowerCase();

  if (normFrom === normTo) {
    return numericQty;
  }

  const convFrom = UNIT_CONVERSION[normFrom];
  const convTo = UNIT_CONVERSION[normTo];

  if (!convFrom || !convTo || convFrom.group !== convTo.group) {
    // Can't convert - return as-is
    return numericQty;
  }

  // Convert: quantity * fromBase / toBase
  return (numericQty * convFrom.toBase) / convTo.toBase;
}

/**
 * Build notes string from items with incompatible units
 */
function buildNotesFromItems(items) {
  const parts = items.map((item) => {
    if (item.quantity !== null && item.unit) {
      return `${item.quantity} ${item.unit}`;
    } else if (item.quantity !== null) {
      return String(item.quantity);
    } else {
      return item.originalText;
    }
  });

  return `Mixed: ${parts.join(' + ')}`;
}

/**
 * Extract ingredient name from raw text (basic fallback)
 */
function extractNameFromText(text) {
  if (!text) {
    return '';
  }

  // Remove quantity patterns
  let name = text.replace(/^[\d\s½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞/.-]+/, '').trim();

  // Remove common unit words
  const units = Object.keys(UNIT_MAP);
  const unitPattern = new RegExp(`^(${units.join('|')})\\s+`, 'i');
  name = name.replace(unitPattern, '').trim();

  // Remove leading "of"
  name = name.replace(/^of\s+/i, '').trim();

  return name || text;
}

module.exports = {
  normalizeIngredientName,
  areUnitsCompatible,
  aggregateIngredients,
  // Expose for testing
  singularize,
  detectBellPepper,
  stripModifiers,
  matchIngredientFamily,
  COMPOUND_NORMALIZATIONS,
  UNIT_CONVERSION,
  MODIFIER_PATTERNS,
  INGREDIENT_FAMILY_MAP,
};
