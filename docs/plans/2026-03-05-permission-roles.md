# Plan: Implement Permission Roles (Finance, Activities, Admin)

> Date: 2026-03-05
> Related issues: #132

## Context

The FamilyMemberModal UI has three permission toggles (Can view finances, Can edit activities, Can manage pod) that are purely cosmetic — they render but are never saved or enforced. This plan wires them into functional permissions.

## Decisions

- **Owner** always has full access — bypasses all checks
- **Admin** (canManagePod=true) automatically grants Finance + Activities
- **Todos** unrestricted for all users
- **Settings**: All users see General, Security, Install App, About. Admin-only: Family Data Options, AI Insights, Exchange Rates, Data Management

## Approach

1. Add `canViewFinances`, `canEditActivities`, `canManagePod` optional boolean fields to `FamilyMember` interface
2. Extend `applyDefaults` in familyMemberRepository for backward compatibility
3. Create `usePermissions()` composable (~30 lines) reading from familyStore.currentMember
4. Wire FamilyMemberModal to save/load permission fields + add `readOnly` prop
5. Add NoAccessPage (modeled on NotFoundPage) + 4 translation strings
6. Route guard: `requiresFinance` meta on 8 finance routes, `beforeEach` guard redirecting to `/no-access`
7. Filter Piggy Bank section in sidebar + finance tabs in mobile nav
8. Gate activity editing on planner page (hide add button, read-only modal)
9. Gate family page CRUD (hide add/edit/delete, read-only modal)
10. Gate admin settings sections (Family Data, AI, Exchange Rates, Data Management)

## Files affected

| File                                                            | Change type                                      |
| --------------------------------------------------------------- | ------------------------------------------------ |
| `src/types/models.ts`                                           | Add 3 fields                                     |
| `src/services/automerge/repositories/familyMemberRepository.ts` | Extend defaults                                  |
| `src/composables/usePermissions.ts`                             | **New** (~30 lines)                              |
| `src/components/family/FamilyMemberModal.vue`                   | Wire save/load + readOnly prop                   |
| `src/services/translation/uiStrings.ts`                         | Add 4 strings                                    |
| `src/pages/NoAccessPage.vue`                                    | **New** (modeled on NotFoundPage)                |
| `src/router/index.ts`                                           | Route meta + beforeEach guard + /no-access route |
| `src/components/common/AppSidebar.vue`                          | Filter Piggy Bank section                        |
| `src/components/common/MobileBottomNav.vue`                     | Filter finance tabs                              |
| `src/pages/FamilyPlannerPage.vue`                               | Hide add button + pass readOnly                  |
| `src/components/planner/ActivityModal.vue`                      | Add readOnly prop                                |
| `src/pages/FamilyPage.vue`                                      | Gate CRUD buttons + readOnly modal               |
| `src/pages/SettingsPage.vue`                                    | Hide admin sections                              |
