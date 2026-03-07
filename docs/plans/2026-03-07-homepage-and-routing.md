# Plan: beanies.family Homepage & Routing Update

> Date: 2026-03-07
> Related issues: none

## Context

Users with no local families are currently redirected to `/welcome` (WelcomeGate with Sign In / Create / Join cards). We want a proper public homepage that serves as the landing page for brand-new users, while preserving the existing flow for returning users who have cached families.

## Approach

### 1. New Route: `/home` → `HomePage.vue`

- New page: `src/pages/HomePage.vue`
- Simple, on-brand landing page with:
  - Beanies logo (celebrating variant) + wordmark + tagline
  - "Get Started" button → navigates to `/welcome`
  - "About" section — brief app description, beta/MVP badge, GitHub link
  - Language switcher (reuse from `LoginBackground.vue`)
  - Dark mode support, responsive
- Route: `{ path: '/home', name: 'Home', meta: { requiresAuth: false } }`

### 2. Routing Logic Changes

- `authStore.ts`: Expose `hasFamilies` ref, set during `initializeAuth()`
- `App.vue`: If `needsAuth && !hasFamilies` → redirect to `/home`; if `needsAuth && hasFamilies` → redirect to `/welcome`
- Add `/home` to the list of routes that skip auth redirect

### 3. Welcome Gate Update

- Add subtle "Learn more about beanies.family" link → `/home`

### 4. Translation Strings

- Add `homepage.*` keys to `uiStrings.ts` (both `en` and `beanie`)

### 5. Tests

- E2E: `e2e/specs/00-homepage.spec.ts` — fresh browser lands on `/home`, click through to `/welcome`
- Update `e2e/helpers/auth.ts` to handle landing on `/home` first

## Files affected

| Action | File                                    |
| ------ | --------------------------------------- |
| Create | `src/pages/HomePage.vue`                |
| Edit   | `src/router/index.ts`                   |
| Edit   | `src/stores/authStore.ts`               |
| Edit   | `src/App.vue`                           |
| Edit   | `src/components/login/WelcomeGate.vue`  |
| Edit   | `src/services/translation/uiStrings.ts` |
| Create | `e2e/specs/00-homepage.spec.ts`         |
| Edit   | `e2e/helpers/auth.ts`                   |
