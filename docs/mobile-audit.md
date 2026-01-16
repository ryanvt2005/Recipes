# Mobile Readiness Audit

**Date:** January 2026
**Application:** Recipe Manager
**Auditor:** Claude Code
**Related Issue:** #14

## Executive Summary

This document provides a comprehensive audit of the Recipe Manager web application's mobile readiness. The application currently has **partial responsive support** with several critical gaps that need to be addressed before it can be considered fully mobile-friendly.

**Overall Mobile Readiness Score: 6/10**

---

## 1. Application Routes Inventory

All routes are defined in `frontend/src/App.jsx` using React Router v6.

| Route | Component | Auth Required | Mobile Status |
|-------|-----------|---------------|---------------|
| `/` | HomePage | No | ✅ Good |
| `/login` | LoginPage | No | ✅ Good |
| `/register` | RegisterPage | No | ⚠️ Form issues |
| `/recipes` | RecipesPage | Yes | ✅ Good |
| `/recipes/new` | AddRecipePage | Yes | ✅ Good |
| `/recipes/:id` | RecipeDetailPage | Yes | ⚠️ Layout issues |
| `/shopping-lists` | ShoppingListsPage | Yes | ✅ Good |
| `/shopping-lists/:id` | ShoppingListPage | Yes | ❌ Critical issues |

---

## 2. Page-by-Page Analysis

### 2.1 HomePage (`/`)

**File:** `frontend/src/pages/HomePage.jsx`

**Layout:** Hero section with 3-column feature grid

**Current Responsive Behavior:**
- Hero section: Single column, centered text
- Feature cards: `md:grid-cols-3` (1 column on mobile, 3 on desktop)
- Call-to-action buttons: Centered, full width on mobile

**Mobile Issues:** None identified

**Recommendations:** None needed

---

### 2.2 LoginPage (`/login`)

**File:** `frontend/src/pages/LoginPage.jsx`

**Layout:** Centered card form with max-width constraint

**Current Responsive Behavior:**
- Container: `max-w-md` centered
- Padding: `px-4 sm:px-6 lg:px-8` (responsive)
- Form: Single column layout

**Mobile Issues:** None identified

**Recommendations:** None needed

---

### 2.3 RegisterPage (`/register`)

**File:** `frontend/src/pages/RegisterPage.jsx`

**Layout:** Centered card form with name fields side-by-side

**Current Responsive Behavior:**
- Container: `max-w-md` centered
- Name fields: `grid-cols-2` (ALWAYS 2 columns)

**Mobile Issues:**
1. **CRITICAL:** Name fields (first/last) use `grid-cols-2` without responsive fallback
   - On 360px screens, each field gets ~170px width
   - Input fields become cramped and hard to use

**Recommendations:**
- Change `grid-cols-2` to `grid-cols-1 sm:grid-cols-2`

**Location:** Line ~74

---

### 2.4 RecipesPage (`/recipes`)

**File:** `frontend/src/pages/RecipesPage.jsx`

**Layout:** Search bar + recipe grid + floating action button + modal

**Current Responsive Behavior:**
- Recipe grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` (excellent)
- Search bar: Full width
- FAB: Fixed position bottom-right (good for mobile)
- Pagination: Flex wrap

**Mobile Issues:** None critical

**Recommendations:**
- Consider larger touch targets for recipe card checkboxes

---

### 2.5 RecipeDetailPage (`/recipes/:id`)

**File:** `frontend/src/pages/RecipeDetailPage.jsx`

**Layout:** Hero image + meta info + 2-column ingredients/instructions

**Current Responsive Behavior:**
- Image: Full width, `h-96` fixed height
- Meta info: Flex wrap (good)
- Content: `md:grid-cols-5` (ingredients 2-col, instructions 3-col)

**Mobile Issues:**
1. **MEDIUM:** Recipe image at `h-96` (384px) may dominate mobile screens
2. **LOW:** Heading text sizes not responsive

**Recommendations:**
- Consider `h-48 md:h-96` for image height
- Add responsive text sizing: `text-2xl md:text-3xl`

**Location:** Lines ~280-350

---

### 2.6 AddRecipePage (`/recipes/new`)

**File:** `frontend/src/pages/AddRecipePage.jsx`

**Layout:** Two option cards + extraction form

**Current Responsive Behavior:**
- Option cards: `grid-cols-1 sm:grid-cols-2` (good)
- Form inputs: Full width
- Buttons: Full width

**Mobile Issues:** None identified

**Recommendations:** None needed

---

### 2.7 ShoppingListsPage (`/shopping-lists`)

**File:** `frontend/src/pages/ShoppingListsPage.jsx`

**Layout:** Single column list of shopping list cards

**Current Responsive Behavior:**
- Cards: Full width, stacked
- Empty state: Centered

**Mobile Issues:** None identified

**Recommendations:** None needed

---

### 2.8 ShoppingListPage (`/shopping-lists/:id`)

**File:** `frontend/src/pages/ShoppingListPage.jsx`

**Layout:** 2-column layout with main content + recipe sidebar

**Current Responsive Behavior:**
- Main content: `flex-1`
- Sidebar: `w-80 flex-shrink-0` (FIXED 320px width)

**Mobile Issues:**
1. **CRITICAL:** Sidebar has fixed `w-80` width with no mobile collapse
   - Creates horizontal overflow on phones
   - Sidebar content not accessible without horizontal scrolling
2. **MEDIUM:** No toggle to show/hide sidebar on mobile

**Recommendations:**
- Hide sidebar on mobile: `hidden lg:block`
- Add mobile toggle button to show/hide recipe sources
- Consider bottom sheet pattern for mobile sidebar

**Location:** Lines ~300-400

---

## 3. Component Analysis

### 3.1 Layout Component

**File:** `frontend/src/components/Layout.jsx`

**Structure:** Header + Main + Footer

**Current Responsive Behavior:**
- Container: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` (good)
- Navigation: Horizontal flex layout
- User menu: Dropdown with absolute positioning

**Mobile Issues:**
1. **CRITICAL:** No mobile hamburger menu
   - Navigation links display horizontally
   - Will wrap/overflow on narrow screens
2. **MEDIUM:** User menu dropdown may overflow screen edge

**Recommendations:**
- Implement hamburger menu for mobile navigation
- Add `hidden md:flex` for desktop nav links
- Add mobile menu drawer/overlay

---

### 3.2 ShoppingListSelectorModal

**File:** `frontend/src/components/ShoppingListSelectorModal.jsx`

**Layout:** Overlay modal with scrollable content

**Current Responsive Behavior:**
- Modal: `max-w-2xl w-full mx-4` (good)
- Max height: `max-h-[85vh]` (good)
- Content: Scrollable overflow

**Mobile Issues:** None critical

**Recommendations:**
- Consider full-screen modal on mobile (`mx-0` on small screens)

---

### 3.3 RecipeNotes Component

**File:** `frontend/src/components/RecipeNotes.jsx`

**Layout:** Card with textarea

**Current Responsive Behavior:**
- Card: Full width within parent
- Textarea: Full width

**Mobile Issues:** None identified

---

## 4. Global CSS Analysis

**File:** `frontend/src/index.css`

### 4.1 Base Styles

**Current State:**
- Uses Tailwind CSS base, components, utilities layers
- Custom component classes defined (`.btn`, `.input`, `.card`)
- Print styles comprehensive

### 4.2 Button Styles

```css
.btn {
  @apply inline-flex items-center justify-center px-4 py-2 ...
}
```

**Mobile Issues:**
- `py-2` (8px vertical padding) may result in tap targets < 44px
- Recommended minimum touch target: 44x44px

**Recommendations:**
- Consider `py-3` for mobile or add mobile-specific variant

### 4.3 Print Styles

**Current State:** Excellent coverage for printing recipes and shopping lists

---

## 5. Tailwind Configuration

**File:** `frontend/tailwind.config.js`

**Current Configuration:**
- Default breakpoints (sm: 640px, md: 768px, lg: 1024px, xl: 1280px)
- Custom primary color (red palette)
- No mobile-specific plugins

**Recommendations:**
- Consider adding `touch-action` utilities
- Consider `@tailwindcss/forms` plugin for better mobile form styling

---

## 6. Viewport Configuration

**File:** `frontend/index.html`

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

**Status:** ✅ Correctly configured

---

## 7. Critical Issues Summary

### Priority 1 (Must Fix)

| Issue | Location | Impact | Effort |
|-------|----------|--------|--------|
| Shopping list sidebar doesn't collapse | ShoppingListPage.jsx:300+ | Horizontal overflow on mobile | Medium |
| No mobile navigation menu | Layout.jsx | Nav links overflow/wrap | High |
| Register form name fields not responsive | RegisterPage.jsx:74 | Cramped inputs on mobile | Low |

### Priority 2 (Should Fix)

| Issue | Location | Impact | Effort |
|-------|----------|--------|--------|
| Recipe image too tall on mobile | RecipeDetailPage.jsx | Image dominates viewport | Low |
| Touch targets may be too small | index.css (.btn) | Harder to tap buttons | Low |
| Heading sizes not responsive | Various pages | Oversized text on mobile | Low |

### Priority 3 (Nice to Have)

| Issue | Location | Impact | Effort |
|-------|----------|--------|--------|
| Full-screen modal on mobile | ShoppingListSelectorModal | Better UX | Medium |
| Checkbox touch targets | RecipesPage.jsx | Harder to select recipes | Low |

---

## 8. Responsive Patterns Currently Used

### Working Well

```
✅ grid-cols-1 sm:grid-cols-2 lg:grid-cols-3  (Recipe grid)
✅ px-4 sm:px-6 lg:px-8                        (Container padding)
✅ max-w-md, max-w-2xl, max-w-7xl              (Width constraints)
✅ mx-4                                         (Modal margins)
✅ flex flex-wrap                               (Meta info wrapping)
```

### Missing Patterns Needed

```
❌ hidden md:block / md:hidden                  (Show/hide elements)
❌ flex-col md:flex-row                         (Direction changes)
❌ text-xl md:text-2xl lg:text-3xl              (Responsive text)
❌ h-48 md:h-96                                 (Responsive heights)
❌ py-3 md:py-2                                 (Touch target sizing)
```

---

## 9. Browser/Device Testing Notes

### Recommended Test Devices

| Device | Width | Priority |
|--------|-------|----------|
| iPhone SE | 375px | High |
| iPhone 14 | 390px | High |
| iPhone 14 Pro Max | 430px | Medium |
| Samsung Galaxy S21 | 360px | High |
| iPad Mini | 768px | Medium |
| iPad Pro | 1024px | Low |

### Test Checklist

- [ ] All pages render without horizontal scroll
- [ ] Navigation is accessible
- [ ] Forms are usable (inputs not cramped)
- [ ] Buttons/checkboxes are tappable (44x44px)
- [ ] Modals don't overflow viewport
- [ ] Text is readable without zooming
- [ ] Images don't dominate viewport

---

## 10. Next Steps

1. Review this audit document
2. Prioritize issues based on user impact
3. Create implementation plan (see `docs/mobile-plan.md`)
4. Implement fixes in order of priority
5. Re-test on mobile devices
6. Deploy and monitor

---

## Appendix A: File Reference

| File | Lines | Purpose |
|------|-------|---------|
| App.jsx | ~50 | Route definitions |
| Layout.jsx | ~120 | Master layout |
| HomePage.jsx | ~100 | Landing page |
| LoginPage.jsx | ~80 | Login form |
| RegisterPage.jsx | ~120 | Registration form |
| RecipesPage.jsx | ~300 | Recipe listing |
| RecipeDetailPage.jsx | ~550 | Recipe detail |
| AddRecipePage.jsx | ~350 | Recipe creation |
| ShoppingListsPage.jsx | ~150 | Lists overview |
| ShoppingListPage.jsx | ~450 | List detail |
| ShoppingListSelectorModal.jsx | ~250 | Modal component |
| index.css | ~170 | Global styles |
| tailwind.config.js | ~30 | Tailwind config |
