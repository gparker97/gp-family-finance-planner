# Plan: Role Selection + Simplified Joiner Onboarding

> Date: 2026-02-22
> Related issues: #69 (login redesign follow-up)

## Context

The Login Page UI Redesign (Welcome Gate + Join Pod) was implemented. Two adjustments were needed:

1. **Role selection**: When inviting or joining a family, the user must choose whether they are a parent or child so the proper `ageGroup` is assigned (`adult` vs `child`).
2. **Simplified joiner onboarding**: Members who join an existing family should NOT go through the full 3-step setup wizard (which prompts them to create a data file — that doesn't make sense since a data file already exists). Instead, they see a simple 1-step profile form: name, gender, date of birth, and profile color.

Additionally, `familyStore.isSetupComplete` was fixed to also consider joiners (members with `role === 'member'`), and `showLayout` in App.vue was updated to exclude the `JoinFamily` route.

A new admin API (Lambda + API Gateway) was added for server-side Cognito operations like deleting a member's account.

## Approach

- Add i18n keys for role selection and joiner onboarding
- Add Parent/Child toggle to invite modal in FamilyPage
- Read `role` query param in JoinPodView and pass `ageGroup` to `signUpAndJoin()`
- Add optional `ageGroup` param to `signUpAndJoin()` in authStore
- Fix `isSetupComplete` to consider members (not just owners)
- Add joiner detection + simplified 1-step profile form to SetupPage
- Fix `showLayout` to exclude `JoinFamily` route
- Create Lambda + API Gateway infrastructure for admin operations
- Create client-side admin API service
- Call admin API when deleting a member from FamilyPage
- Update architecture docs and create ADR-013

## Files affected

### Modified

- `src/services/translation/uiStrings.ts`
- `src/pages/FamilyPage.vue`
- `src/components/login/JoinPodView.vue`
- `src/stores/authStore.ts`
- `src/stores/familyStore.ts`
- `src/pages/SetupPage.vue`
- `src/App.vue`
- `infrastructure/main.tf`
- `infrastructure/outputs.tf`
- `docs/ARCHITECTURE.md`
- `/tmp/wiki/Architecture.md`
- `/tmp/wiki/Architectural-Decision-Records.md`

### Created

- `src/services/api/adminApi.ts`
- `infrastructure/modules/api/main.tf`
- `infrastructure/modules/api/variables.tf`
- `infrastructure/modules/api/outputs.tf`
- `infrastructure/modules/api/lambda/delete-user.mjs`
- `docs/adr/013-admin-api-lambda.md`
- `/tmp/wiki/ADR-013-Admin-API-Lambda.md`
