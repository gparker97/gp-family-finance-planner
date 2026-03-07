# Plan: Onboarding Wizard Redesign (Issue #62)

> Date: 2026-03-07
> Related issues: #62

## Context

Redesigns onboarding as a friendly 3-step wizard modal on /nook after pod creation. Users can skip at any time and restart from Settings.

## Approach

Custom full-screen overlay with 4 step views (Welcome, Money, Family, Complete). E2E auto-skip via `e2e_auto_auth` sessionStorage flag. No new Pinia store - wizard state lives in component refs.

## Files affected

### New files

- `src/constants/activityPresets.ts`
- `src/components/onboarding/OnboardingWizard.vue`
- `src/components/onboarding/OnboardingStepHeader.vue`
- `src/components/onboarding/OnboardingSectionLabel.vue`
- `src/components/onboarding/OnboardingProgressPips.vue`
- `src/components/onboarding/OnboardingWelcome.vue`
- `src/components/onboarding/OnboardingMoney.vue`
- `src/components/onboarding/OnboardingRecurringModal.vue`
- `src/components/onboarding/OnboardingFamily.vue`
- `src/components/onboarding/OnboardingComplete.vue`

### Modified files

- `src/pages/FamilyNookPage.vue`
- `src/pages/SettingsPage.vue`
- `src/stores/authStore.ts`
- `src/services/translation/uiStrings.ts`
- `src/components/planner/ActivityModal.vue`
- `e2e/helpers/auth.ts`
