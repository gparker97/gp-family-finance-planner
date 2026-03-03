# Plan: Projected Recurring Transactions + Individual Editing

> Date: 2026-03-03

## Context

When a user creates a recurring transaction (e.g., monthly rent), only one actual transaction is created for current/past dates. Navigating to future months shows nothing because the recurring processor only generates transactions up to today. Users expect to see recurring transactions projected into future months and be able to edit individual occurrences with three scope options: "this only", "all occurrences", or "this and all future".

## Approach

### Part A — Show Projected Transactions

- `getDueDatesInRange()` exported from `recurringProcessor.ts` generates due dates within any date range
- Dedup guard in `processRecurringItems()` prevents duplicate transaction creation on app restart
- `DisplayTransaction` type extends `Transaction` with optional `isProjected` flag
- `useProjectedTransactions` composable generates ephemeral projected transactions for future months
- `TransactionsPage.vue` merges projections into display pipeline with dedup, dashed border styling, and "Projected" pill

### Part B — Edit Individual Projected Transactions

- `useRecurringEditScope` composable (Promise-based, like useConfirm) provides scope picker
- `RecurringEditScopeModal.vue` presents three scope options: "This Only", "All Occurrences", "This & All Future"
- "This only" materializes a projected transaction into a real Transaction, then opens editor
- "All" opens the RecurringItem template editor
- "This and future" splits the RecurringItem via `splitRecurringItem()` in recurringStore

### Part C — Translation Strings

- 9 new translation keys for projected labels and scope picker options

## Files affected

| File                                            | Action                                                 |
| ----------------------------------------------- | ------------------------------------------------------ |
| `src/services/recurring/recurringProcessor.ts`  | Added `getDueDatesInRange()` export; added dedup guard |
| `src/types/models.ts`                           | Added `DisplayTransaction` type alias                  |
| `src/utils/date.ts`                             | Exported `extractDatePart()` (was private)             |
| `src/composables/useProjectedTransactions.ts`   | **New** — projection composable                        |
| `src/composables/useRecurringEditScope.ts`      | **New** — scope picker composable                      |
| `src/components/ui/RecurringEditScopeModal.vue` | **New** — 3-option scope modal                         |
| `src/pages/TransactionsPage.vue`                | Merged projections, scope picker, projected styling    |
| `src/stores/recurringStore.ts`                  | Added `splitRecurringItem()` action with re-linking    |
| `src/services/translation/uiStrings.ts`         | Added 9 translation keys                               |
| `src/App.vue`                                   | Mounted `RecurringEditScopeModal`                      |
