# Plan: Loan Repayment Linking & Recurring Payment System

> Date: 2026-03-15
> Related issues: #138 (https://github.com/gparker97/beanies-family/issues/138)
> Plan file: `docs/plans/2026-03-15-loan-repayment-linking.md`

## User Story

As a family member, I want to link outgoing transactions to asset loans or loan accounts so that payments automatically reduce the outstanding balance with proper amortization, and I want loans and activities to optionally create their own recurring payment transactions so everything stays connected without manual effort.

## Context

Currently, asset loans track `outstandingBalance` as static metadata — there's no connection between an outgoing transaction (e.g., monthly mortgage payment) and the loan it pays off. Users must manually update loan balances. Similarly, activities with fees have no link to the transactions that pay for them. This feature creates a unified linking system where outgoing transactions can be tied to loans or activities, with automatic balance reduction for loans using standard amortization.

### Current State

- **Asset loans** (`Asset.loan: AssetLoan`): Track loan amount, outstanding balance, interest rate, monthly payment, term — but no link to transactions
- **Loan accounts** (account type `'loan'`): Just a balance field, no interest rate / term / monthly payment fields
- **Activities**: Have `feeAmount`, `feeSchedule`, `feeCurrency`, `feePayerId` — but no link to payment transactions
- **Transactions**: Can link to activities (`activityId`) or goals (`goalId`) — but not to loans
- **Recurring items**: Can link to goals — but not to loans or activities

### Desired State

- Outgoing transactions can link to **either** an activity **or** a loan (mutually exclusive)
- Linked loan transactions automatically compute amortization (interest vs. principal split) and reduce the outstanding balance
- Asset loans, loan accounts, and activities can all create linked recurring payment transactions via a shared "Create recurring payment?" prompt
- Loan accounts gain interest rate, monthly payment, term, and start date fields (matching AssetLoan)
- Activity "who pays" (`feePayerId`) is replaced by `payFromAccountId` — the account inherently identifies the payer

## Requirements

### Data Model Changes

1. **Transaction model** gains `loanId?: UUID` field — links to an asset loan (by asset ID) or loan account (by account ID). Mutually exclusive with `activityId`.
2. **Transaction model** gains `loanInterestPortion?: number` and `loanPrincipalPortion?: number` — stored after amortization calculation.
3. **Account model** (for type `'loan'`) gains optional fields: `interestRate?: number`, `monthlyPayment?: number`, `loanTermMonths?: number`, `loanStartDate?: ISODateString`, `payFromAccountId?: UUID`.
4. **AssetLoan model** gains `payFromAccountId?: UUID`.
5. **AssetLoan model** gains `linkedRecurringItemId?: UUID` — reference to the auto-created recurring transaction.
6. **Account model** (for type `'loan'`) gains `linkedRecurringItemId?: UUID`.
7. **FamilyActivity model** gains `payFromAccountId?: UUID` and `linkedRecurringItemId?: UUID`.
8. **FamilyActivity model**: `feePayerId` becomes deprecated (superseded by `payFromAccountId` — the account's `memberId` identifies the payer).
9. **RecurringItem model** gains `loanId?: UUID` — same linking as transactions.

### Amortization Calculation

10. **Shared utility** `calculateAmortization(outstandingBalance, annualInterestRate, paymentAmount)` returns `{ interestPortion, principalPortion, newBalance }`.
    - Formula: `monthlyRate = annualRate / 100 / 12`, `interest = balance × monthlyRate`, `principal = payment - interest`
    - If payment > balance + interest, principal is capped to balance (final payment scenario)
11. **One-time extra payments** on loans: entire amount goes to principal (no interest split).
12. When a linked transaction is saved, the loan's `outstandingBalance` is reduced by the `principalPortion`.
13. When a recurring transaction generates a linked loan transaction, same amortization + balance reduction applies.

### Transaction Modal — Link Payment Section

14. Replace the current standalone `ActivityLinkDropdown` with a two-step "Link Payment" section:
    - **Step 1**: `TogglePillGroup` with `[📋 Activity]` `[🏦 Loan]` — neither selected by default. Needs `clearable` prop on TogglePillGroup so tapping the selected pill deselects it.
    - **Step 2**: When Activity selected → `ActivityLinkDropdown`. When Loan selected → new `LoanLinkDropdown` (wraps `EntityLinkDropdown`, lists asset loans + loan accounts).
    - **Step 3**: When entity selected → amount field locks to entity's payment amount. Shows 🔒 icon + caption "Amount set by linked [loan/activity] payment". For loans: shows amortization breakdown card (interest/principal/remaining).
15. This section appears for outgoing transactions only (both recurring and one-time).
16. For one-time transactions linked to a loan: full payment amount goes to principal (no interest split), with a note explaining this.

### Recurring Payment Prompt (Shared Component)

17. **New component `RecurringPaymentPrompt.vue`** — reusable across asset loans, loan accounts, and activities.
    - Toggle "Create monthly payment" (default: ON)
    - Account dropdown "Pay from" (uses existing account picker pattern, filtered to non-loan/non-credit-card accounts)
    - Summary line: "$2,000/mo from Chase Checking starting Mar 2026"
    - When saved with toggle ON: creates a RecurringItem linked to the entity, with the entity's payment amount and selected pay-from account.
18. **Asset modal** → loan section: `RecurringPaymentPrompt` appears after monthly payment field when `loan.hasLoan` is true and `monthlyPayment > 0`.
19. **Loan account modal** (new/edit): `RecurringPaymentPrompt` appears after monthly payment field.
20. **Activity modal** → fee section: `RecurringPaymentPrompt` appears after fee amount field when `feeAmount > 0`. Replace the current "Who Pays" (`feePayerId`) field with this prompt.

### Loan Link Dropdown

21. **New component `LoanLinkDropdown.vue`** — wraps `EntityLinkDropdown`, lists:
    - All assets with `loan.hasLoan === true` and `loan.outstandingBalance > 0` — shows asset name + "Loan" + monthly payment
    - All loan accounts with `isActive === true` and `balance > 0` — shows account name + monthly payment
    - Grouped or visually separated: "Asset Loans" and "Account Loans"

### TogglePillGroup Enhancement

22. Add `clearable?: boolean` prop to `TogglePillGroup`. When true, clicking the already-selected pill deselects it (emits `undefined` or empty string).

### Amount Locking

23. When a transaction is linked to an activity or loan, the amount field becomes read-only:
    - Visually: muted background, 🔒 icon, explanatory caption
    - The `CurrencyAmountInput` component may need a `readonly` or `disabled` prop, or the locking can be handled at the `TransactionModal` level by swapping to a display-only element.

### Balance Reduction on Save

24. When saving a transaction with `loanId` set:
    - If the loan is an asset loan: update `asset.loan.outstandingBalance` via assetsStore
    - If the loan is a loan account: update `account.balance` via accountsStore
    - Store `loanInterestPortion` and `loanPrincipalPortion` on the transaction
25. When deleting a transaction with `loanId` set: reverse the balance reduction (add principal back).

### Linked Entity Updates

26. When a loan's `monthlyPayment` is updated, its linked recurring transaction's amount is also updated.
27. When an activity's `feeAmount` is updated, its linked recurring transaction's amount is also updated.
28. When a loan or activity's `payFromAccountId` is updated, the linked recurring transaction's `accountId` is also updated.

### View/Display

29. **TransactionViewEditModal**: When viewing a transaction linked to a loan, show the loan name + amortization breakdown (interest/principal/remaining) as read-only info.
30. **Asset detail / loan section**: Show link to the recurring payment transaction if one exists.
31. **Help documentation**: Add help section explaining amortization calculation with the ⓘ info bubble convention.

### Translation Keys

32. Add all new translation keys for: link payment labels, loan link dropdown placeholders, amortization breakdown labels, recurring payment prompt labels, amount locked captions, help text.

## Important Notes & Caveats

- **`activityId` and `loanId` are mutually exclusive** on a transaction — setting one clears the other.
- **`feePayerId` on activities is deprecated** but not removed yet — existing data can remain, new activities will use `payFromAccountId` instead.
- **Amortization is calculated at transaction save time**, not stored on the loan. This means the breakdown is always based on the balance at the time of payment.
- **Loan account fields** (interestRate, monthlyPayment, etc.) are optional — existing loan accounts without them continue to work as before. They just can't create linked recurring transactions until the fields are populated.
- **The RecurringPaymentPrompt component** must handle both create and edit flows — when editing an entity that already has a linked recurring item, the toggle should show as ON and the account should show the current pay-from account.
- **Currency matching**: The pay-from account's currency should match the loan/activity currency. Filter the account dropdown accordingly.
- **Final payment**: When `outstandingBalance` reaches 0 (or very close due to rounding), the linked recurring item should be flagged or the user notified.

## Assumptions

> **Review these before implementation.**

1. The `EntityLinkDropdown` component works unchanged for the new `LoanLinkDropdown` — it just receives different items.
2. The existing `RecurringItem` model and recurring processor can be extended with `loanId` without breaking existing recurring items.
3. Automerge documents accept the new optional fields without migration.
4. The `CurrencyAmountInput` or `AmountInput` component can be made read-only without a new component.
5. The existing account picker/dropdown patterns can be reused for the "Pay from" field.
6. Standard amortization (fixed payment, decreasing interest) is the correct model for all loan types in this app.

## Approach

### Phase 1: Data Layer & Amortization Utility

1. Update `models.ts` — add new fields to Transaction, Account, AssetLoan, FamilyActivity, RecurringItem
2. Create `src/utils/amortization.ts` — shared amortization calculation utility
3. Update `transactionsStore.ts` — loan balance reduction on save/delete
4. Update `recurringProcessor.ts` — loan linking support when generating transactions

### Phase 2: TogglePillGroup Enhancement

5. Add `clearable` prop to `TogglePillGroup`

### Phase 3: Shared Components

6. Create `LoanLinkDropdown.vue` — wraps EntityLinkDropdown with loan items
7. Create `RecurringPaymentPrompt.vue` — shared toggle + account picker

### Phase 4: Transaction Modal

8. Update `TransactionModal.vue` — link type selector (Activity/Loan), amount locking, amortization preview
9. Update `TransactionViewEditModal.vue` — display linked loan info

### Phase 5: Entity Modals

10. Update asset modal — add RecurringPaymentPrompt to loan section
11. Update loan account modal — add new fields + RecurringPaymentPrompt
12. Update activity modal — replace feePayerId with RecurringPaymentPrompt

### Phase 6: Linked Entity Sync

13. Update assetsStore / accountsStore — sync monthly payment changes to linked recurring items
14. Update activityStore — sync fee amount changes to linked recurring items

### Phase 7: Translation, Help & Cleanup

15. Add all translation keys
16. Add help documentation for amortization
17. Update tests

## Files Affected

| File                                                       | Change                                                                       |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `src/types/models.ts`                                      | New fields on Transaction, Account, AssetLoan, FamilyActivity, RecurringItem |
| `src/utils/amortization.ts`                                | **NEW** — shared amortization calculation                                    |
| `src/stores/transactionsStore.ts`                          | Loan balance reduction on save/delete                                        |
| `src/services/recurring/recurringProcessor.ts`             | Loan linking for generated transactions                                      |
| `src/components/ui/TogglePillGroup.vue`                    | Add `clearable` prop                                                         |
| `src/components/ui/LoanLinkDropdown.vue`                   | **NEW** — loan entity dropdown                                               |
| `src/components/ui/RecurringPaymentPrompt.vue`             | **NEW** — shared payment prompt                                              |
| `src/components/transactions/TransactionModal.vue`         | Link type selector, amount locking, amortization preview                     |
| `src/components/transactions/TransactionViewEditModal.vue` | Display linked loan info                                                     |
| `src/components/planner/ActivityModal.vue`                 | Replace feePayerId with RecurringPaymentPrompt                               |
| Asset modal (find exact file)                              | Add RecurringPaymentPrompt to loan section                                   |
| Loan account modal (find exact file)                       | Add new loan fields + RecurringPaymentPrompt                                 |
| `src/stores/assetsStore.ts`                                | Sync loan changes to linked recurring items                                  |
| `src/stores/accountsStore.ts`                              | Sync loan account changes to linked recurring items                          |
| `src/stores/activityStore.ts`                              | Sync fee changes to linked recurring items                                   |
| `src/services/translation/uiStrings.ts`                    | All new translation keys                                                     |
| Help center content                                        | Amortization explanation                                                     |
| Test files                                                 | New tests for amortization, linking, balance reduction                       |

## Acceptance Criteria

- [ ] Outgoing transactions can be linked to an activity OR a loan (mutually exclusive) via a clear two-step UI
- [ ] When linked, the transaction amount locks to the entity's payment amount with clear visual explanation
- [ ] Loan-linked transactions calculate and store interest/principal split using standard amortization
- [ ] Loan-linked transactions reduce the loan's outstanding balance by the principal portion on save
- [ ] Deleting a loan-linked transaction reverses the balance reduction
- [ ] One-time extra loan payments apply full amount to principal
- [ ] Asset loans, loan accounts, and activities all show "Create recurring payment?" prompt when relevant
- [ ] The RecurringPaymentPrompt is a single shared component used across all three entity types
- [ ] Loan accounts gain interest rate, monthly payment, term, and start date fields
- [ ] Activity "Who Pays" field is replaced by pay-from account selection via RecurringPaymentPrompt
- [ ] Updating a loan's monthly payment or activity's fee amount syncs to the linked recurring transaction
- [ ] Updating payFromAccountId syncs to the linked recurring transaction's accountId
- [ ] TransactionViewEditModal shows loan info (amortization breakdown) for linked transactions
- [ ] TogglePillGroup supports clearable mode
- [ ] Help documentation explains amortization calculation
- [ ] All translation keys added (en + beanie)
- [ ] All tests pass, type-check clean, lint clean, build succeeds

## Testing Plan

1. **Amortization utility**: Unit tests for `calculateAmortization()` — standard payment, final payment (overpay), zero interest, edge cases
2. **Transaction linking**: Create outgoing transaction linked to asset loan — verify balance reduction, interest/principal stored
3. **Transaction linking**: Create outgoing transaction linked to loan account — verify balance reduction
4. **Transaction linking**: Create outgoing transaction linked to activity — verify amount locks to fee
5. **Transaction deletion**: Delete loan-linked transaction — verify balance restored
6. **One-time extra payment**: Create one-time loan payment — verify full amount to principal
7. **Recurring payment prompt**: Create asset loan with recurring payment — verify RecurringItem created with correct amount/account
8. **Recurring payment prompt**: Create loan account with recurring payment — verify same
9. **Recurring payment prompt**: Create activity with fee + recurring payment — verify same
10. **Recurring generation**: Verify recurring processor creates loan-linked transactions with amortization
11. **Entity sync**: Update loan monthly payment — verify linked recurring item updates
12. **Entity sync**: Update payFromAccountId — verify linked recurring item's accountId updates
13. **UI**: Verify TogglePillGroup clearable mode works
14. **UI**: Verify amount locking with visual indicators
15. **UI**: Verify amortization breakdown card renders correctly
16. **Dark mode**: Verify all new UI elements
17. **Mobile**: Verify layout on narrow viewports
