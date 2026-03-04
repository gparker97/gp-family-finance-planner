# Plan: Fix Google Drive OAuth Errors on New Account Registration

> Date: 2026-03-04
> Related: Production bug — new Google account can't register a family data file

## Context

Two errors occur when creating a new family with a Google account never used before:

1. **First attempt**: "authorization scope was not enough" — Google's granular consent allows users to deselect scopes, and the app never validates the granted scopes
2. **Second attempt**: "File not found: 1O6JqMNlkJ4vQr96OE7VAw8-x9EFMIWR8" — the `localStorage` folder cache (`beanies_drive_folder_id`) is **global across all Google accounts**. A cached folder ID from a previous account is reused, causing a 404 when the new account can't access it

### Root causes

| #   | Bug                                                                                                                                                                                                  | Location                    |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| 1   | **Global folder cache** — `cachedFolderId` persists in localStorage across Google accounts. `createNew()` reuses it via `getOrCreateAppFolder()` without verifying the current account can access it | `driveService.ts:14-22, 34` |
| 2   | **No scope validation** — Neither Lambda nor client checks that `drive.file` is in the granted scopes. Google's granular consent lets users deselect it                                              | `googleAuth.ts:180-207`     |
| 3   | **Silent refresh inherits bad scopes** — If a token with insufficient scopes is stored, `attemptSilentRefresh()` returns a new token with the same insufficient scopes                               | `googleAuth.ts:228-266`     |
| 4   | **No cleanup on auth failure** — When `createNew()` fails, stale tokens and folder cache remain, poisoning the next attempt                                                                          | `CreatePodView.vue:148-149` |

## Approach

### 1. Clear folder cache in `createNew()` (`googleDriveProvider.ts`)

Before calling `getOrCreateAppFolder()`, call `clearFolderCache()`. This ensures a fresh folder lookup for the new account.

### 2. Force consent in `createNew()` (`googleDriveProvider.ts`)

Pass `{ forceConsent: true }` to `requestAccessToken()`. Since `createNew()` is a one-time operation during family creation, we always want a fresh consent screen with all scopes explicitly granted.

### 3. Add scope validation after token exchange (`googleAuth.ts`)

In `performPopupAuth()`, after `exchangeCodeForTokens()`, validate that the returned `scope` field contains `drive.file`. If not, clear the stored refresh token and throw a descriptive error.

### 4. Clean up on failure in `handleChooseGoogleDriveStorage()` (`CreatePodView.vue`)

In the catch block, clear stale state so the next retry starts fresh by calling `clearFolderCache()`.

## Files affected

| File                                                 | Change                                                                                      |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `src/services/sync/providers/googleDriveProvider.ts` | Call `clearFolderCache()` and `requestAccessToken({ forceConsent: true })` in `createNew()` |
| `src/services/google/googleAuth.ts`                  | Add scope validation in `performPopupAuth()` after token exchange                           |
| `src/components/login/CreatePodView.vue`             | Clear folder cache on auth failure in catch block                                           |
