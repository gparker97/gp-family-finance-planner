# Plan: Income-to-Goal Linking

> Date: 2026-03-05
> Related issues: Goal progress automation

## Context

Goal progress (`currentAmount`) is currently manual-only. The user wants income transactions (one-time and recurring) to automatically credit a portion toward a goal — e.g. $1,000 income → 20% ($200) → "Buy a Car" goal ($10,000 target). Guardrail: auto-cap to remaining amount if allocation exceeds what's needed.

## Design Decisions

1. **Flat fields on Transaction/RecurringItem** (not a nested object) — mirrors the existing `activityId` pattern, works cleanly with Automerge, and `CreateTransactionInput`/`UpdateTransactionInput` pick up new fields automatically via `Omit` type aliases.

2. **Goal progress computation in the store** (not the modal) — `transactionsStore` already does cross-store side effects for balance adjustments. The modal passes raw allocation fields; the store computes and applies the guardrailed amount. This avoids the modal needing to duplicate guardrail logic.

3. **Generalize `ActivityLinkDropdown` → `EntityLinkDropdown`** — the dropdown mechanism (inline panel, blur delay, transition, v-model, "None" option, on-brand styling) is identical. Only the data source and row rendering differ. One component serves both, eliminating duplication. `ActivityLinkDropdown` is only used in `TransactionModal.vue`, so the refactor is safe.

4. **Goal preview in modal** — the modal imports `goalsStore` read-only for the dropdown items and a display-only preview of the computed amount. The authoritative `appliedAmount` computation and guardrail enforcement happens in the store.

## Implementation

### Step 1: Data Model — `src/types/models.ts`

Add to `Transaction` interface (after `activityId` at line 146):

```typescript
goalId?: UUID;
goalAllocMode?: 'percentage' | 'fixed';
goalAllocValue?: number;    // 20 for 20%, or 200 for $200
goalAllocApplied?: number;  // actual amount credited (after guardrail, computed by store)
```

Add to `RecurringItem` interface (template — `goalAllocApplied` is computed at generation time):

```typescript
goalId?: UUID;
goalAllocMode?: 'percentage' | 'fixed';
goalAllocValue?: number;
```

No changes needed to `CreateTransactionInput`, `UpdateTransactionInput`, `CreateRecurringItemInput`, `UpdateRecurringItemInput` — they're all `Omit`-based and inherit automatically.

### Step 2: Generalize Dropdown — `src/components/ui/EntityLinkDropdown.vue`

**Create** `EntityLinkDropdown.vue` — extract the mechanism from `ActivityLinkDropdown.vue` (129 lines) into a generic, prop-driven component:

```typescript
interface Props {
  modelValue?: string;
  items: Array<{ id: string; icon?: string; label: string; secondary?: string }>;
  placeholder: string;
  emptyText: string;
}
```

Same mechanism verbatim: inline panel, `isOpen` ref, `toggle()`, `handleBlur()` with 150ms delay, `mousedown.prevent` on options, `Transition` fade, "None" option emitting `undefined`, `rounded-[14px]` / `var(--tint-slate-5)` styling.

**Update** `ActivityLinkDropdown.vue` to become a thin wrapper:

```vue
<script setup lang="ts">
import EntityLinkDropdown from './EntityLinkDropdown.vue';
import { useActivityStore } from '@/stores/activityStore';
import { useTranslation } from '@/composables/useTranslation';
import { useMemberInfo } from '@/composables/useMemberInfo';
import { computed } from 'vue';

defineProps<{ modelValue?: string }>();
defineEmits<{ 'update:modelValue': [value: string | undefined] }>();

const { t } = useTranslation();
const activityStore = useActivityStore();
const { getMemberName } = useMemberInfo();

const items = computed(() =>
  activityStore.activeActivities.map((a) => ({
    id: a.id,
    icon: a.icon || '📋',
    label: a.title,
    secondary: a.assigneeId ? getMemberName(a.assigneeId) : undefined,
  }))
);
</script>
<template>
  <EntityLinkDropdown
    :model-value="modelValue"
    :items="items"
    :placeholder="t('modal.selectActivity')"
    :empty-text="t('modal.noMoreActivities')"
    @update:model-value="$emit('update:modelValue', $event)"
  />
</template>
```

This preserves the existing API — TransactionModal's usage of `<ActivityLinkDropdown v-model="activityId" />` continues to work unchanged.

### Step 3: TransactionModal Integration — `src/components/transactions/TransactionModal.vue`

**New imports**: `useGoalsStore`, `EntityLinkDropdown`

**New form state** (after `activityId` ref at line 58):

```typescript
const goalId = ref<string | undefined>(undefined);
const goalAllocMode = ref<'percentage' | 'fixed'>('percentage');
const goalAllocValue = ref<number | undefined>(undefined);
```

**Computed** for dropdown items:

```typescript
const goalItems = computed(() =>
  goalsStore.activeGoals
    .filter((g) => g.currency === currency.value)
    .map((g) => ({
      id: g.id,
      icon: '🎯',
      label: g.name,
      secondary: `${formatCurrency(g.currentAmount)} / ${formatCurrency(g.targetAmount)}`,
    }))
);
```

**Computed** for display-only preview (not authoritative — store does final computation):

```typescript
const goalAllocPreview = computed(() => {
  if (!goalId.value || !goalAllocValue.value || !amount.value) return null;
  const goal = goalsStore.goals.find((g) => g.id === goalId.value);
  if (!goal) return null;
  const raw =
    goalAllocMode.value === 'percentage'
      ? (amount.value * goalAllocValue.value) / 100
      : goalAllocValue.value;
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
  return { amount: Math.min(raw, remaining), remaining, capped: raw > remaining };
});
```

**Template** — new section after category chips (step 5), before schedule toggle (step 6), visible only for income:

```html
<ConditionalSection :show="direction === 'in' && goalItems.length > 0">
  <FormFieldGroup :label="t('goalLink.title')" optional>
    <EntityLinkDropdown
      v-model="goalId"
      :items="goalItems"
      :placeholder="t('goalLink.selectGoal')"
      :empty-text="t('goalLink.noGoals')"
    />
  </FormFieldGroup>
  <ConditionalSection :show="!!goalId">
    <FormFieldGroup :label="t('goalLink.allocMode')">
      <TogglePillGroup v-model="goalAllocMode" :options="allocModeOptions" />
    </FormFieldGroup>
    <FormFieldGroup :label="..." required>
      <!-- percentage: BaseInput type=number min=1 max=100 with % suffix -->
      <!-- fixed: AmountInput -->
    </FormFieldGroup>
    <p v-if="goalAllocPreview" class="text-xs text-[var(--color-text-muted)]">
      → {{ formatCurrency(goalAllocPreview.amount) }} of {{
      formatCurrency(goalAllocPreview.remaining) }} remaining
      <span v-if="goalAllocPreview.capped"> ({{ t('goalLink.capped') }})</span>
    </p>
  </ConditionalSection>
</ConditionalSection>
```

**`handleSave()`** — include goal fields in all three emit paths:

- One-time payload: add `goalId`, `goalAllocMode`, `goalAllocValue` (store computes `goalAllocApplied`)
- Recurring payload: add `goalId`, `goalAllocMode`, `goalAllocValue`
- Editing recurring: same

**`onEdit`** — populate goal fields from existing transaction/recurring data.
**`onNew`** — clear goal fields.
**Watch `direction`** — when switching to 'out', clear `goalId` (and allocation fields).
**Watch `goalId`** — when cleared, reset `goalAllocMode`/`goalAllocValue`.

### Step 4: Store-Level Goal Progress — `src/stores/transactionsStore.ts`

**New import**: `useGoalsStore`

**Helper** (after `adjustAccountBalance` at line 210, mirrors its pattern):

```typescript
function computeGoalAllocApplied(
  allocMode: 'percentage' | 'fixed' | undefined,
  allocValue: number | undefined,
  txAmount: number
): number {
  if (!allocMode || !allocValue) return 0;
  return allocMode === 'percentage' ? (txAmount * allocValue) / 100 : allocValue;
}

async function adjustGoalProgress(
  goalId: string | undefined,
  appliedAmount: number | undefined,
  reverse = false
): Promise<void> {
  if (!goalId || !appliedAmount) return;
  const goalsStore = useGoalsStore();
  const goal = goalsStore.goals.find((g) => g.id === goalId);
  if (!goal) return;
  const delta = reverse ? -appliedAmount : appliedAmount;
  const newAmount = Math.max(0, goal.currentAmount + delta);
  await goalsStore.updateProgress(goal.id, newAmount);
}
```

**`createTransaction()`** — after balance adjustment (line 237), add:

```typescript
// Apply goal allocation
if (input.goalId && input.goalAllocMode && input.goalAllocValue) {
  const goalsStore = useGoalsStore();
  const goal = goalsStore.goals.find((g) => g.id === input.goalId);
  if (goal) {
    const raw = computeGoalAllocApplied(input.goalAllocMode, input.goalAllocValue, input.amount);
    const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
    const applied = Math.min(raw, remaining);
    if (applied > 0) {
      // Store the applied amount on the transaction
      await transactionRepo.updateTransaction(transaction.id, { goalAllocApplied: applied });
      transaction.goalAllocApplied = applied;
      await adjustGoalProgress(input.goalId, applied);
    }
  }
}
```

**`updateTransaction()`** — after balance reversal/application:

```typescript
// Reverse old goal allocation, apply new
if (original) {
  await adjustGoalProgress(original.goalId, original.goalAllocApplied, true);
}
if (updated) {
  // Recompute applied amount with guardrail
  if (updated.goalId && updated.goalAllocMode && updated.goalAllocValue) {
    const goalsStore = useGoalsStore();
    const goal = goalsStore.goals.find((g) => g.id === updated.goalId);
    if (goal) {
      const raw = computeGoalAllocApplied(
        updated.goalAllocMode,
        updated.goalAllocValue,
        updated.amount
      );
      const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
      const applied = Math.min(raw, remaining);
      await transactionRepo.updateTransaction(updated.id, { goalAllocApplied: applied });
      updated.goalAllocApplied = applied;
      await adjustGoalProgress(updated.goalId, applied);
    }
  }
}
```

**`deleteTransaction()`** — after balance reversal: `await adjustGoalProgress(transaction.goalId, transaction.goalAllocApplied, true);`

**`deleteTransactionsByRecurringItemId()`** — in the loop: `await adjustGoalProgress(tx.goalId, tx.goalAllocApplied, true);`

### Step 5: Recurring Processor — `src/services/recurring/recurringProcessor.ts`

In `createTransactionFromRecurring()` (after line 236):

```typescript
// Goal allocation
if (item.goalId && item.goalAllocMode && item.goalAllocValue) {
  const goal = await goalRepo.getGoalById(item.goalId);
  if (goal && !goal.isCompleted) {
    const raw =
      item.goalAllocMode === 'percentage'
        ? (item.amount * item.goalAllocValue) / 100
        : item.goalAllocValue;
    const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
    const applied = Math.min(raw, remaining);
    if (applied > 0) {
      input.goalId = item.goalId;
      input.goalAllocMode = item.goalAllocMode;
      input.goalAllocValue = item.goalAllocValue;
      input.goalAllocApplied = applied;
    }
  }
}
```

After successful transaction creation (after line 246):

```typescript
if (input.goalAllocApplied && input.goalId) {
  const goal = await goalRepo.getGoalById(input.goalId);
  if (goal) {
    await goalRepo.updateGoalProgress(input.goalId, goal.currentAmount + input.goalAllocApplied);
  }
}
```

**New import**: `goalRepository` (as `goalRepo`).

Note: The recurring processor uses repository methods directly (not stores) because it runs outside the Vue reactivity context. `goalRepo.updateGoalProgress()` already handles auto-completion (`isCompleted = true` when `currentAmount >= targetAmount`).

### Step 6: Translation Strings — `src/services/translation/uiStrings.ts`

Add `goalLink` section:

```typescript
goalLink: {
  title: { en: 'Link to Goal', beanie: 'link to goal' },
  selectGoal: { en: 'Select Goal', beanie: 'select goal' },
  allocMode: { en: 'Allocation Mode', beanie: 'allocation mode' },
  percentage: { en: 'Percentage', beanie: 'percentage' },
  fixedAmount: { en: 'Fixed Amount', beanie: 'fixed amount' },
  preview: { en: '{amount} of {remaining} remaining', beanie: '{amount} of {remaining} remaining' },
  capped: { en: 'Reduced to meet goal', beanie: 'reduced to meet goal' },
  noGoals: { en: 'No active goals in this currency', beanie: 'no active goals in this currency' },
},
```

## Testing

### Unit Tests — `src/stores/transactionsStore.test.ts`

Add new `describe('transactionsStore - Goal Allocation Sync')` block following the existing "Account Balance Sync" pattern:

- **Mock** `goalRepository` alongside existing transaction/account repo mocks
- **Import** `useGoalsStore`
- **Seed** `goalsStore.goals` with a mock goal (`targetAmount: 10000, currentAmount: 0, currency: 'USD'`)
- **Tests**:
  1. `createTransaction with percentage goal allocation should update goal progress` — create income $1000 with 20% allocation → goal `currentAmount` becomes 200
  2. `createTransaction with fixed goal allocation should update goal progress` — create income $1000 with $300 fixed → goal `currentAmount` becomes 300
  3. `createTransaction should cap allocation to remaining goal amount` — goal has `currentAmount: 9900, targetAmount: 10000`, create income $1000 with 50% ($500) → only $100 applied
  4. `deleteTransaction should reverse goal progress` — create then delete → goal `currentAmount` returns to 0
  5. `updateTransaction should reverse old and apply new allocation` — update allocation from 20% to 50% → goal adjusts
  6. `deleteTransactionsByRecurringItemId should reverse goal progress for each` — bulk delete reverses all

### Unit Tests — `src/services/recurring/recurringProcessor.test.ts`

Add tests to existing suite:

- **Mock** `goalRepository` alongside existing mocks
- **Tests**:
  1. `should apply goal allocation when processing recurring income` — recurring item with `goalId` + 20% → created transaction has `goalAllocApplied`, goal progress updated
  2. `should cap goal allocation to remaining amount` — goal nearly complete → allocation capped
  3. `should skip allocation for completed goals` — `isCompleted: true` → no allocation

### Unit Tests — `src/components/transactions/TransactionModal.test.ts`

Add tests for goal linking UI:

- **Mock** `goalRepository`
- **Tests**:
  1. `should show goal link section when direction is 'in'` — mount with direction toggled to 'in', verify EntityLinkDropdown rendered
  2. `should hide goal link section when direction is 'out'` — default state, verify not rendered
  3. `should include goal fields in emitted save payload` — fill form with goal allocation, trigger save, assert emitted data includes `goalId`, `goalAllocMode`, `goalAllocValue`
  4. `should clear goal fields when switching direction to 'out'` — set goal, switch to 'out', switch back to 'in', verify goal cleared

### E2E Test — `e2e/specs/03-transactions.spec.ts`

Add one integration test:

1. `should link income transaction to goal and update progress` — seed a goal via TestDataFactory, create income transaction with goal link, verify goal page shows updated progress

## Files Affected

| File                                                   | Change                                                                    |
| ------------------------------------------------------ | ------------------------------------------------------------------------- |
| `src/types/models.ts`                                  | +4 fields on Transaction, +3 on RecurringItem                             |
| `src/components/ui/EntityLinkDropdown.vue`             | **New** — generic dropdown extracted from ActivityLinkDropdown            |
| `src/components/ui/ActivityLinkDropdown.vue`           | **Simplified** — thin wrapper around EntityLinkDropdown                   |
| `src/components/transactions/TransactionModal.vue`     | Goal allocation section, form state, save logic                           |
| `src/stores/transactionsStore.ts`                      | `computeGoalAllocApplied()`, `adjustGoalProgress()`, integrated into CRUD |
| `src/services/recurring/recurringProcessor.ts`         | ~10 lines for goal allocation at generation time                          |
| `src/services/translation/uiStrings.ts`                | `goalLink.*` keys                                                         |
| `src/stores/transactionsStore.test.ts`                 | New "Goal Allocation Sync" test suite (~6 tests)                          |
| `src/services/recurring/recurringProcessor.test.ts`    | 3 new goal allocation tests                                               |
| `src/components/transactions/TransactionModal.test.ts` | 4 new goal linking UI tests                                               |
| `e2e/specs/03-transactions.spec.ts`                    | 1 new goal-linked transaction E2E test                                    |

## Reused Existing Code (No New Primitives)

| Existing                           | Reuse                                                            |
| ---------------------------------- | ---------------------------------------------------------------- |
| `ActivityLinkDropdown` mechanism   | Generalized into `EntityLinkDropdown` — same code, prop-driven   |
| `TogglePillGroup`                  | percentage/fixed mode toggle (same as BudgetSettingsModal)       |
| `BaseInput`                        | percentage number input                                          |
| `AmountInput`                      | fixed amount input                                               |
| `ConditionalSection`               | show/hide goal fields                                            |
| `FormFieldGroup`                   | labels and layout                                                |
| `goalsStore.updateProgress()`      | existing goal progress update with auto-completion + celebration |
| `goalRepo.updateGoalProgress()`    | existing repo method used in recurringProcessor                  |
| `adjustAccountBalance` pattern     | mirrored for `adjustGoalProgress`                                |
| `activityId` field pattern         | mirrored for `goalId` + allocation fields                        |
| Test patterns from existing suites | mock setup, store seeding, assertion style                       |

## What We Are NOT Adding

- No separate allocations collection — allocation lives on the transaction as flat fields
- No multi-goal allocation — one goal per transaction (simple, extensible later)
- No cross-currency allocation — goal must match transaction currency
- No changes to the Goal model — `currentAmount` updated via existing `updateProgress()`
- No new pages, modals, or composables
- No manual `computeGoalAllocApplied` in the modal — store is authoritative
