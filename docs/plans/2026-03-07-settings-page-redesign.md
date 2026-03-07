# Plan: Settings Page Redesign (Issue #61)

> Date: 2026-03-07

## Context

The Settings page is 880 lines with settings in a flat 2-column BaseCard grid. Redesign into three sections: profile header, clickable card grid (each opens a modal), and quick settings toggles.

## Approach

- Profile header with avatar, name, email, edit button
- 6-card grid (3 cols desktop, 2 tablet, 1 mobile) — each card opens a BaseModal
- Quick toggles row: Dark Mode, Beanie Mode, Sound Effects using ToggleSwitch
- About footer (minimal)
- All existing settings logic stays in SettingsPage (no extraction)

## Files affected

1. `src/components/settings/SettingsCard.vue` — NEW: reusable clickable card
2. `src/components/settings/ProfileHeader.vue` — NEW: profile header
3. `src/components/settings/ExchangeRateSettings.vue` — Add standalone prop
4. `src/pages/SettingsPage.vue` — Major rewrite
5. `src/services/translation/uiStrings.ts` — New translation keys
