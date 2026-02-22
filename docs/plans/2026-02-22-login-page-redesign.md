# Plan: Login Page UI Redesign — Welcome Gate + Join Pod

> Date: 2026-02-22
> Related issues: #69 (login redesign), #62 (onboarding — deferred to follow-up)

## Context

The current LoginPage has a simple sign-in/sign-up tab layout. It doesn't support family members joining an existing family — only creating new families. Issue #69 calls for a redesign based on the v5 UI framework proposal with four distinct views: Welcome Gate, Sign In, Create Pod, and Join Pod. This also requires a client-side invite code mechanism so existing family owners can share their familyId with new members.

## Approach

Replace the tab-based LoginPage with a view-switching architecture:

1. **Welcome Gate** — Landing screen with brand hero, three action buttons: Sign In, Create Pod, Join Pod, plus "Continue without account" (dev only)
2. **Sign In** — Email + password form (same as current, cleaned up)
3. **Create Pod** — Sign up to create a new family (current sign-up form, renamed)
4. **Join Pod** — Sign up and join an existing family using an invite code (familyId)
5. **Verification** — Shared 6-digit code entry (used after both Create Pod and Join Pod)

### Join Pod flow

1. New member gets a family code (the familyId UUID) from the family owner
2. They enter the code + their details on the Join Pod screen
3. `authStore.signUpAndJoin()` registers them with Cognito using the existing familyId
4. After email verification + auto sign-in, they go to `/setup`

### Invite code sharing (FamilyPage)

On the Family Members page, an "Invite Family Member" button opens a modal showing the family code with copy button and a shareable link.

## Files affected

- `src/pages/LoginPage.vue` — Complete rewrite with view-switching architecture
- `src/stores/authStore.ts` — Added `signUpAndJoin()` action
- `src/router/index.ts` — Added `/join` redirect route
- `src/pages/FamilyPage.vue` — Added invite code modal
- `src/services/translation/uiStrings.ts` — Added ~20 new i18n keys
- `src/components/login/LoginBackground.vue` — New shared background wrapper
- `src/components/login/TrustBadges.vue` — New security badges component
- `src/components/login/VerificationCodeForm.vue` — New verification form
- `src/components/login/WelcomeGate.vue` — New landing screen
- `src/components/login/SignInView.vue` — New sign-in form
- `src/components/login/CreatePodView.vue` — New create pod form
- `src/components/login/JoinPodView.vue` — New join pod form
