# Project Status

> **Last updated:** 2026-02-17
> **Updated by:** Greg (initial creation)

## Current Phase

**Phase 1 — MVP** (In Progress)

## Completed Work

### Infrastructure

- Project scaffold with Vite + Vue 3 + TypeScript
- IndexedDB service with repositories (native IndexedDB APIs)
- Pinia stores for all entities (family, accounts, transactions, assets, goals, settings, sync, recurring, translation, memberFilter)
- Vue Router with all page routes (lazy-loaded)
- Dark mode / theme support
- E2E test infrastructure (Playwright — Chromium/Firefox/WebKit)
- Unit test infrastructure (Vitest with happy-dom)
- Linting (ESLint + Prettier + Stylelint + Husky pre-commit hooks)
- File-based sync via File System Access API (with encryption support)
- Exchange rate auto-fetching from free currency API
- Recurring transaction processor (daily/monthly/yearly)
- Multilingual support (English + Chinese) via MyMemory API with IndexedDB caching
- Project documentation: `docs/ARCHITECTURE.md`, `docs/adr/` (8 ADRs)

### UI Components

- Base component library: BaseButton, BaseCard, BaseInput, BaseModal, BaseSelect
- AppHeader, AppSidebar layout components

### Pages / Features

- Dashboard with summary cards (combined one-time + recurring totals)
- Accounts management (full CRUD, card-based layout)
- Transactions management (full CRUD, with date filter, category icons)
- Assets management (full CRUD, loan tracking, combined net worth)
- Goals management (full CRUD)
- Reports page (net worth, income vs expenses, extended date ranges, category breakdowns)
- Family member management (global member filter)
- Settings page (currency, theme, sync, encryption)
- First-run setup wizard
- Multi-currency display with global display currency selector

### Recent Fixes

- Restored ReportsPage that was wiped during bulk ESLint/Prettier formatting
- Added data-testid attributes to transaction items and account cards for E2E tests
- Fixed E2E tests to switch to transactions tab before interacting with elements
- Switched from idb library to native IndexedDB APIs

## In Progress

_(Nothing currently in progress)_

## Up Next (Phase 1 Remaining)

- [ ] Data validation and error handling improvements
- [ ] Responsive design polish
- [ ] Financial forecasting / projections page

## Future Phases

### Phase 2 — Enhanced Features

- [ ] Data import/export (CSV, etc.)
- [ ] PWA offline support (service worker)
- [ ] Google Drive sync (OAuth integration)
- [ ] Skip/modify individual recurring occurrences

### Phase 3 — AI & Advanced

- [ ] AI-powered insights (Claude/OpenAI/Gemini)
- [ ] Budget tracking and alerts
- [ ] Additional language support

## Known Issues

_(None currently tracked)_

## Decision Log

| Date       | Decision                                                | Rationale                                                            |
| ---------- | ------------------------------------------------------- | -------------------------------------------------------------------- |
| 2026-02-17 | Created docs/STATUS.md for project tracking             | Multiple contributors need shared context                            |
| 2026-02-17 | Added ARCHITECTURE.md and 8 ADR documents               | Document key decisions for contributor onboarding                    |
| Prior      | Switched from idb library to native IndexedDB APIs      | Reduce dependencies                                                  |
| Prior      | Chose File System Access API over Google Drive for sync | Simpler implementation, no OAuth needed, user controls file location |
| Prior      | Used AES-GCM + PBKDF2 for encryption                    | Industry standard, no external dependencies (Web Crypto API)         |
| Prior      | Stored amounts in original currency, convert on display | No data loss from premature conversion, flexible display             |
| Prior      | Recurring items as templates, not transactions          | Clean separation, catch-up processing, easy to preview               |
| Prior      | MyMemory API for translations                           | Free, CORS-enabled, no API key required                              |
