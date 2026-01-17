# Manual Mobile QA Checklist

This checklist covers manual testing for mobile-first functionality. Test on actual mobile devices or browser DevTools mobile emulation (Chrome DevTools, Firefox Responsive Design Mode).

**Recommended test viewports:**
- iPhone SE (375x667)
- iPhone 12/13 (390x844)
- Pixel 5 (393x851)
- Desktop (1280x800+)

---

## 1. Mobile Navigation Drawer

### Prerequisites
- App running at http://localhost:3001
- Logged in as test user

### Test Steps

| # | Step | Expected Result | Pass |
|---|------|-----------------|------|
| 1.1 | On mobile viewport (<1024px), tap hamburger menu icon | Navigation drawer slides in from left | [ ] |
| 1.2 | Verify drawer contains: Recipes, Shopping Lists, Logout | All navigation items visible | [ ] |
| 1.3 | Press ESC key while drawer is open | Drawer closes | [ ] |
| 1.4 | Open drawer, tap outside drawer area | Drawer closes | [ ] |
| 1.5 | Open drawer, tap a navigation link | Drawer closes, navigates to page | [ ] |
| 1.6 | On desktop viewport (>=1024px), verify | No hamburger menu, horizontal nav visible | [ ] |

---

## 2. Authentication Flows

### Login Flow

| # | Step | Expected Result | Pass |
|---|------|-----------------|------|
| 2.1 | Navigate to /login while logged out | Login form displayed | [ ] |
| 2.2 | Enter invalid credentials, submit | Error message "Email or password is incorrect" | [ ] |
| 2.3 | Enter valid credentials, submit | Redirects to /recipes | [ ] |
| 2.4 | Refresh page after login | User remains logged in | [ ] |

### Logout Flow

| # | Step | Expected Result | Pass |
|---|------|-----------------|------|
| 2.5 | Click Logout in navigation | Redirects to /login, token cleared | [ ] |
| 2.6 | Navigate to /recipes after logout | Redirects to /login | [ ] |

### Token Expiration

| # | Step | Expected Result | Pass |
|---|------|-----------------|------|
| 2.7 | Manually delete token from localStorage, navigate | Redirects to /login | [ ] |
| 2.8 | Set expired token in localStorage, make API call | Redirects to /login | [ ] |

---

## 3. Recipe List Responsive Behavior

### Mobile View (< 1024px)

| # | Step | Expected Result | Pass |
|---|------|-----------------|------|
| 3.1 | Navigate to /recipes on mobile viewport | Recipe cards displayed in single column | [ ] |
| 3.2 | Verify card shows: image, title, description snippet | All elements visible, properly truncated | [ ] |
| 3.3 | Tap on a recipe card | Navigates to recipe detail page | [ ] |
| 3.4 | Scroll through recipe list | Smooth scrolling, no layout jumping | [ ] |

### Desktop View (>= 1024px)

| # | Step | Expected Result | Pass |
|---|------|-----------------|------|
| 3.5 | Navigate to /recipes on desktop viewport | Recipe cards displayed in grid (2-3 columns) | [ ] |
| 3.6 | Search/filter recipes | Results update, layout maintains grid | [ ] |

---

## 4. Shopping List Responsive Behavior

### Mobile View (< 1024px)

| # | Step | Expected Result | Pass |
|---|------|-----------------|------|
| 4.1 | Navigate to a shopping list on mobile | Tab interface visible (Items, Recipes) | [ ] |
| 4.2 | Tap "Items" tab | Shopping items list displayed | [ ] |
| 4.3 | Tap "Recipes" tab | Recipes panel displayed | [ ] |
| 4.4 | Check/uncheck an item | Item state updates, visual feedback | [ ] |
| 4.5 | On Recipes tab, tap remove recipe | Recipe removed, associated items removed | [ ] |

### Desktop View (>= 1024px)

| # | Step | Expected Result | Pass |
|---|------|-----------------|------|
| 4.6 | Navigate to shopping list on desktop | Sidebar layout visible (items + recipes panel) | [ ] |
| 4.7 | Verify sidebar shows recipes | Recipes panel on right side | [ ] |

### All/Remaining Filter

| # | Step | Expected Result | Pass |
|---|------|-----------------|------|
| 4.8 | Toggle to "Remaining" filter | Only unchecked items shown | [ ] |
| 4.9 | Check all items, verify "Remaining" shows empty | Empty state or "All items checked" message | [ ] |

---

## 5. Form Usability

### Login/Register Forms

| # | Step | Expected Result | Pass |
|---|------|-----------------|------|
| 5.1 | Tap email field on mobile | Keyboard shows with @ symbol easily accessible | [ ] |
| 5.2 | Tap password field | Password keyboard, show/hide toggle works | [ ] |
| 5.3 | Submit with empty fields | Validation errors visible, fields highlighted | [ ] |
| 5.4 | Verify tap targets are >= 44px height | Easy to tap without accidental taps | [ ] |

### Add/Edit Recipe Form

| # | Step | Expected Result | Pass |
|---|------|-----------------|------|
| 5.5 | Open Add Recipe on mobile | Form fields stack vertically | [ ] |
| 5.6 | Fill URL field | URL keyboard shows (no auto-capitalize) | [ ] |
| 5.7 | Fill number fields (servings, time) | Numeric keyboard shows | [ ] |
| 5.8 | Submit with validation errors | Errors visible, scroll to first error | [ ] |

---

## 6. Layout Sanity

### Horizontal Scroll Check

| # | Step | Expected Result | Pass |
|---|------|-----------------|------|
| 6.1 | Set viewport to 360px width | No horizontal scrollbar appears | [ ] |
| 6.2 | Set viewport to 375px width | No horizontal scrollbar appears | [ ] |
| 6.3 | Set viewport to 390px width | No horizontal scrollbar appears | [ ] |
| 6.4 | Navigate through all main pages at each width | Content fits without horizontal overflow | [ ] |

### Text and Images

| # | Step | Expected Result | Pass |
|---|------|-----------------|------|
| 6.5 | Verify long recipe titles truncate properly | Ellipsis or line clamp, no overflow | [ ] |
| 6.6 | Verify images scale responsively | Images fit container, no distortion | [ ] |
| 6.7 | Verify buttons don't overflow containers | Buttons wrap or stack on small screens | [ ] |

---

## 7. Performance (Optional)

| # | Step | Expected Result | Pass |
|---|------|-----------------|------|
| 7.1 | Load /recipes with 20+ recipes | Page loads within 2 seconds | [ ] |
| 7.2 | Navigate between pages | Transitions feel smooth (< 300ms) | [ ] |
| 7.3 | Open/close navigation drawer | Animation smooth, no jank | [ ] |

---

## Test Credentials

For manual testing, use these test credentials (development only):

```
Email: test@example.com
Password: Test123!
```

---

## Reporting Issues

When reporting issues found during QA:

1. Note the exact viewport size
2. Screenshot or screen recording
3. Browser/device used
4. Steps to reproduce
5. Expected vs actual behavior

Create GitHub issues with the `bug` label and `mobile` tag.
