# Plan: Fix Google OAuth re-consent loop on PWA refresh

> Date: 2026-03-04
> Related: PWA re-authentication bug report

## Context

On PWA (or any device without a stored refresh token), users are forced to re-consent to Google on every page refresh. Desktop works fine because it retains the refresh token from the initial `createNew()` call.

**Root cause**: Two compounding issues:

1. **Missing `forceConsent`**: `getValidToken()` falls back to `requestAccessToken()` without `forceConsent`. This uses `prompt: 'select_account'`, but Google only issues refresh tokens with `prompt: 'consent'`. Without a refresh token, every page refresh triggers a popup.

2. **No storage resilience**: The refresh token is stored ONLY in IndexedDB (`beanies-file-handles`). On PWA/mobile, IndexedDB can be evicted by the browser under storage pressure, iOS Safari's 7-day eviction policy, or OS-level storage management. Once evicted, the token is lost permanently.

## Approach

### Layer 1: Fix the `forceConsent` bug (ensures refresh token is obtained)

**`googleAuth.ts` — `getValidToken()`**: Pass `forceConsent: !refreshToken` when falling back to interactive auth. This ensures Google returns a refresh_token when we don't have one.

**`googleDriveProvider.ts` — 401 fallbacks**: Same fix for the `read()` and `write()` 401 catch blocks. Add `hasRefreshToken()` export to `googleAuth.ts` for cross-module access.

### Layer 2: Request persistent storage (prevents browser eviction)

**`App.vue` — on app startup**: Call `navigator.storage.persist()` to request persistent storage.

### Layer 3: Dual-write refresh token to localStorage (defense in depth)

**`fileHandleStore.ts`**: When storing/loading the refresh token, also write/read from `localStorage` as a fallback.

## Files affected

| File                                                                | Change                                                         |
| ------------------------------------------------------------------- | -------------------------------------------------------------- |
| `src/services/google/googleAuth.ts`                                 | Add `hasRefreshToken()` export; fix `getValidToken()`          |
| `src/services/sync/providers/googleDriveProvider.ts`                | Import `hasRefreshToken`; pass `forceConsent` in 401 fallbacks |
| `src/services/sync/fileHandleStore.ts`                              | Dual-write refresh token to localStorage as fallback           |
| `src/App.vue`                                                       | Request persistent storage via `navigator.storage.persist()`   |
| `src/services/google/__tests__/googleAuth.test.ts`                  | Add `hasRefreshToken` tests                                    |
| `src/services/sync/providers/__tests__/googleDriveProvider.test.ts` | Update 401 fallback tests to verify `forceConsent`             |
