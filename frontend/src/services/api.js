/**
 * @deprecated Use imports from '../api' instead
 *
 * This file is kept for backward compatibility.
 * New code should import from the centralized API modules:
 *
 *   import { auth, recipes, shoppingLists } from '../api';
 *   // or
 *   import { authApi, recipesApi, shoppingApi } from '../api';
 */

export { http as default, auth, recipes, shoppingLists } from '../api';
