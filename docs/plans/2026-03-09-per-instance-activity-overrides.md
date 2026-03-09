# Plan: Per-Instance Overrides for Recurring Activities

> Date: 2026-03-09

## Context

Recurring activities are stored as templates and expanded on-the-fly into virtual occurrences. Users need the ability to modify a single occurrence (e.g., change time for one week's piano lesson) or modify this occurrence and all future ones (e.g., permanently change the time starting from a given date). This mirrors the existing recurring transaction workflow.

## Approach

- Reuse `useRecurringEditScope` + `RecurringEditScopeModal` + `splitRecurringItem` pattern
- Extract shared activity scope logic into `useActivityScopeEdit` composable (DRY across FamilyPlannerPage and FamilyNookPage)
- Inline edits always apply to ALL occurrences; scope modal only for Edit/Delete buttons
- One new field: `parentActivityId` on FamilyActivity

## Files affected

- `src/types/models.ts` — Add `parentActivityId`
- `src/stores/activityStore.ts` — overridesByParent, expandRecurring, splitActivity, materializeOverride
- `src/composables/useActivityScopeEdit.ts` — New shared composable
- `src/components/planner/UpcomingActivities.vue` — Emit occurrence date
- `src/components/planner/DayAgendaSidebar.vue` — Emit occurrence date
- `src/components/nook/ScheduleCards.vue` — Emit occurrence date
- `src/components/planner/ActivityViewEditModal.vue` — occurrenceDate prop, scope-aware delete
- `src/pages/FamilyPlannerPage.vue` — Use composable
- `src/pages/FamilyNookPage.vue` — Use composable
- `src/stores/activityStore.test.ts` — Unit tests
- `e2e/specs/09-planner.spec.ts` — E2E tests
- `src/content/help/features.ts` — New help article
