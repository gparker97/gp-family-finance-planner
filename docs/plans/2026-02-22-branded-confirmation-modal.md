# Plan: Issue #56 — Replace Native confirm/alert with Branded Confirmation Modal

> Date: 2026-02-22
> Related issues: #56

## Context

Every destructive action (delete account, transaction, asset, goal, member, passkey) uses the browser's native `window.confirm()` dialog, which is unstyled, blocks the thread, and breaks the branded experience. One `window.alert()` is also used for a validation message. There are 9 instances across 6 files, with 5 using hardcoded English strings (no i18n).

## Approach

Follow the `useCelebration` singleton pattern already in the codebase: module-level reactive state, a standalone trigger function (`confirm()`), and a rendering component placed once in `App.vue`. The key addition is that `confirm()` returns a `Promise<boolean>` so callers can `await` the user's decision.

## Files affected

### Created

- `src/composables/useConfirm.ts` — Module-level singleton with `confirm()`, `alert()` trigger functions
- `src/components/ui/ConfirmModal.vue` — Branded modal wrapping `BaseModal` + `BaseButton` + `BeanieIcon`

### Modified

- `src/services/translation/uiStrings.ts` — Add ~15 i18n keys for dialog titles and messages
- `src/App.vue` — Add `<ConfirmModal />` alongside `<CelebrationOverlay />`
- `src/pages/AccountsPage.vue` — Replace `confirm(...)`
- `src/pages/TransactionsPage.vue` — Replace `confirm(...)` (2 instances)
- `src/pages/AssetsPage.vue` — Replace `confirm(...)`
- `src/pages/GoalsPage.vue` — Replace `confirm(...)` (2 instances)
- `src/pages/FamilyPage.vue` — Replace `alert(...)` + `confirm(...)`
- `src/components/settings/PasskeySettings.vue` — Replace `confirm(...)`
