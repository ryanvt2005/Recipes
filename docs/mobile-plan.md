# Mobile Implementation Plan

**Date:** January 2026
**Application:** Recipe Manager
**Related Issue:** #14
**Prerequisite:** `docs/mobile-audit.md`

## Overview

This document outlines the implementation plan to make the Recipe Manager application fully mobile-responsive. The plan is organized into 6 steps, each with specific deliverables and acceptance criteria.

---

## Implementation Steps

### Step 1: Fix Critical Layout Issues

**Priority:** Highest
**Estimated Scope:** 3 files, ~50 lines changed

#### 1.1 Fix Registration Form Name Fields

**File:** `frontend/src/pages/RegisterPage.jsx`

**Current:**
```jsx
<div className="grid grid-cols-2 gap-4">
```

**Change To:**
```jsx
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
```

**Acceptance Criteria:**
- [ ] Name fields stack vertically on screens < 640px
- [ ] Name fields display side-by-side on screens >= 640px

---

#### 1.2 Fix Shopping List Sidebar

**File:** `frontend/src/pages/ShoppingListPage.jsx`

**Current Behavior:** Sidebar always visible with fixed 320px width

**Change To:**
1. Hide sidebar on mobile by default
2. Add toggle button to show/hide sidebar
3. Use slide-in drawer pattern on mobile

**Implementation:**

```jsx
// Add state for sidebar visibility
const [sidebarOpen, setSidebarOpen] = useState(false);

// Sidebar container
<aside className={`
  fixed inset-y-0 right-0 z-40 w-80 bg-white shadow-lg transform transition-transform duration-300
  lg:relative lg:translate-x-0 lg:shadow-none
  ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}
`}>
  {/* Sidebar content */}
</aside>

// Mobile toggle button (shown only on mobile)
<button
  className="lg:hidden fixed bottom-20 right-4 z-30 ..."
  onClick={() => setSidebarOpen(!sidebarOpen)}
>
  {/* Icon */}
</button>

// Overlay for mobile (when sidebar open)
{sidebarOpen && (
  <div
    className="fixed inset-0 bg-black/50 z-30 lg:hidden"
    onClick={() => setSidebarOpen(false)}
  />
)}
```

**Acceptance Criteria:**
- [ ] Sidebar hidden by default on screens < 1024px
- [ ] Toggle button visible on mobile
- [ ] Sidebar slides in from right when toggled
- [ ] Overlay appears behind sidebar on mobile
- [ ] Tapping overlay closes sidebar
- [ ] Sidebar always visible on desktop (lg+)

---

### Step 2: Implement Mobile Navigation

**Priority:** High
**Estimated Scope:** 1 file, ~100 lines changed

**File:** `frontend/src/components/Layout.jsx`

#### 2.1 Add Mobile Menu State

```jsx
const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
```

#### 2.2 Add Hamburger Button

```jsx
<button
  className="md:hidden p-2"
  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
  aria-label="Toggle menu"
>
  {mobileMenuOpen ? (
    <XMarkIcon className="h-6 w-6" />
  ) : (
    <Bars3Icon className="h-6 w-6" />
  )}
</button>
```

#### 2.3 Hide Desktop Navigation on Mobile

```jsx
<nav className="hidden md:flex items-center space-x-6">
  {/* Existing nav links */}
</nav>
```

#### 2.4 Add Mobile Navigation Drawer

```jsx
{/* Mobile menu overlay */}
{mobileMenuOpen && (
  <div className="fixed inset-0 z-50 md:hidden">
    <div
      className="fixed inset-0 bg-black/50"
      onClick={() => setMobileMenuOpen(false)}
    />
    <nav className="fixed top-0 right-0 bottom-0 w-64 bg-white shadow-xl p-6">
      <div className="flex flex-col space-y-4">
        <Link to="/recipes" onClick={() => setMobileMenuOpen(false)}>
          Recipes
        </Link>
        <Link to="/shopping-lists" onClick={() => setMobileMenuOpen(false)}>
          Shopping Lists
        </Link>
        {/* User menu items */}
      </div>
    </nav>
  </div>
)}
```

**Acceptance Criteria:**
- [ ] Hamburger icon visible on screens < 768px
- [ ] Desktop nav hidden on mobile
- [ ] Mobile menu slides in from right
- [ ] Menu links close the drawer when clicked
- [ ] Overlay closes menu when tapped
- [ ] User info/logout accessible in mobile menu

---

### Step 3: Improve Touch Targets

**Priority:** Medium
**Estimated Scope:** 2 files, ~20 lines changed

#### 3.1 Update Button Base Styles

**File:** `frontend/src/index.css`

**Current:**
```css
.btn {
  @apply ... px-4 py-2 ...
}
```

**Change To:**
```css
.btn {
  @apply ... px-4 py-3 md:py-2 ...
}
```

This ensures:
- Mobile: 12px vertical padding (larger touch target)
- Desktop: 8px vertical padding (compact)

#### 3.2 Update Recipe Card Checkboxes

**File:** `frontend/src/pages/RecipesPage.jsx`

Increase checkbox container size:

```jsx
<div className="absolute top-2 left-2 z-10 p-2">
  <input
    type="checkbox"
    className="w-6 h-6 md:w-5 md:h-5 ..."
  />
</div>
```

**Acceptance Criteria:**
- [ ] All buttons have minimum 44px height on mobile
- [ ] Checkboxes are easily tappable (24x24px minimum)
- [ ] Touch targets don't overlap

---

### Step 4: Responsive Typography

**Priority:** Medium
**Estimated Scope:** 3 files, ~30 lines changed

#### 4.1 RecipeDetailPage Headings

**File:** `frontend/src/pages/RecipeDetailPage.jsx`

```jsx
// Recipe title
<h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">
  {recipe.title}
</h1>

// Section headings
<h2 className="text-xl md:text-2xl font-semibold">
  Ingredients
</h2>
```

#### 4.2 HomePage Headings

**File:** `frontend/src/pages/HomePage.jsx`

```jsx
<h1 className="text-3xl md:text-4xl lg:text-5xl font-bold">
  Your Personal Recipe Collection
</h1>
```

**Acceptance Criteria:**
- [ ] Headings don't cause horizontal overflow on mobile
- [ ] Text hierarchy maintained across breakpoints
- [ ] Body text remains readable (16px minimum)

---

### Step 5: Responsive Images and Layout

**Priority:** Medium
**Estimated Scope:** 2 files, ~15 lines changed

#### 5.1 Recipe Detail Image Height

**File:** `frontend/src/pages/RecipeDetailPage.jsx`

**Current:**
```jsx
<img className="... h-96 ..." />
```

**Change To:**
```jsx
<img className="... h-48 sm:h-64 md:h-96 ..." />
```

This provides:
- Mobile (< 640px): 192px height
- Tablet (640-768px): 256px height
- Desktop (768px+): 384px height

#### 5.2 Modal Full-Screen on Mobile

**File:** `frontend/src/components/ShoppingListSelectorModal.jsx`

**Current:**
```jsx
<div className="... max-w-2xl w-full mx-4 ...">
```

**Change To:**
```jsx
<div className="... max-w-2xl w-full mx-0 sm:mx-4 sm:rounded-lg ...">
```

**Acceptance Criteria:**
- [ ] Recipe images don't dominate mobile viewport
- [ ] Modal is full-width on mobile, constrained on desktop
- [ ] No horizontal scrolling on any page

---

### Step 6: Testing and Polish

**Priority:** Low
**Estimated Scope:** Testing only, minor fixes

#### 6.1 Device Testing Checklist

| Device | Width | Status |
|--------|-------|--------|
| iPhone SE | 375px | [ ] |
| iPhone 14 | 390px | [ ] |
| Samsung Galaxy | 360px | [ ] |
| iPad Mini | 768px | [ ] |
| Desktop | 1024px+ | [ ] |

#### 6.2 Functional Testing

- [ ] All pages load without horizontal scroll
- [ ] Navigation works on all devices
- [ ] Forms are usable on mobile
- [ ] Modals don't overflow
- [ ] Touch targets are adequate
- [ ] Print functionality still works

#### 6.3 Performance Testing

- [ ] Page load time on mobile networks
- [ ] Touch response time
- [ ] Scroll performance

---

## Implementation Checkpoints

### Checkpoint 1: Critical Fixes Complete

**Includes:** Steps 1.1, 1.2
**Deliverables:**
- Registration form responsive
- Shopping list sidebar collapsible
- No horizontal overflow

### Checkpoint 2: Navigation Complete

**Includes:** Step 2
**Deliverables:**
- Mobile hamburger menu
- Mobile navigation drawer
- Smooth transitions

### Checkpoint 3: Touch Optimization Complete

**Includes:** Steps 3, 4
**Deliverables:**
- 44px touch targets
- Responsive typography
- Improved usability

### Checkpoint 4: Full Mobile Support

**Includes:** Steps 5, 6
**Deliverables:**
- All responsive images
- Full-screen modals on mobile
- Complete device testing
- Documentation updated

---

## Files to Modify

| Step | File | Changes |
|------|------|---------|
| 1.1 | RegisterPage.jsx | 1 line |
| 1.2 | ShoppingListPage.jsx | ~40 lines |
| 2 | Layout.jsx | ~80 lines |
| 3.1 | index.css | 2 lines |
| 3.2 | RecipesPage.jsx | 5 lines |
| 4.1 | RecipeDetailPage.jsx | 10 lines |
| 4.2 | HomePage.jsx | 5 lines |
| 5.1 | RecipeDetailPage.jsx | 2 lines |
| 5.2 | ShoppingListSelectorModal.jsx | 2 lines |

**Total Estimated Changes:** ~150 lines across 8 files

---

## Dependencies

### Required Icons (Heroicons)

```jsx
import {
  Bars3Icon,      // Hamburger menu
  XMarkIcon,      // Close button
  ChevronRightIcon // Sidebar toggle
} from '@heroicons/react/24/outline';
```

These icons are already available via `@heroicons/react` package.

### No New Dependencies Required

All changes use existing:
- Tailwind CSS utilities
- React state management
- Heroicons library

---

## Rollback Plan

Each step can be rolled back independently by reverting the specific commit. Recommended commit strategy:

1. Commit after each numbered step (1.1, 1.2, 2, etc.)
2. Use descriptive commit messages
3. Tag checkpoints for easy rollback

Example:
```bash
git tag mobile-checkpoint-1  # After Step 1 complete
git tag mobile-checkpoint-2  # After Step 2 complete
```

---

## Success Metrics

### Quantitative

- [ ] 0 horizontal scroll issues on 360px screens
- [ ] 100% of touch targets >= 44px
- [ ] Page load < 3s on 3G connection

### Qualitative

- [ ] User can complete all tasks on mobile
- [ ] Navigation is intuitive
- [ ] Forms are easy to fill out
- [ ] Overall experience is pleasant

---

## Timeline Recommendation

| Step | Estimated Effort |
|------|------------------|
| Step 1 (Critical) | 2-3 hours |
| Step 2 (Navigation) | 3-4 hours |
| Step 3 (Touch) | 1 hour |
| Step 4 (Typography) | 1 hour |
| Step 5 (Images/Modal) | 1 hour |
| Step 6 (Testing) | 2-3 hours |

**Total:** 10-15 hours of development work

---

## Related Documents

- `docs/mobile-audit.md` - Detailed audit findings
- `DEPLOYMENT.md` - Deployment process
- Issue #14 - GitHub issue tracking this work
