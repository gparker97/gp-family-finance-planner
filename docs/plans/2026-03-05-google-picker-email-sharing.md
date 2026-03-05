# Plan: Google Picker API + Optional Email Sharing for Join Flow

> Date: 2026-03-05
> Related: Google Drive join flow fails because `drive.file` scope can't read files shared by other users

## Context

When a family member scans an invite QR code, the join flow calls `syncStore.loadFromGoogleDrive(fileId)` to load the `.beanpod` file. The `drive.file` OAuth scope only grants access to files the app created or files the user explicitly "opened" via Google Picker. Since the invitee didn't create the file, the API returns 404.

**Solution:** Use the Google Picker API to let the invitee select the shared file (grants `drive.file` access to that file), and optionally let the owner pre-share the file via email from the invite modal.

## Approach

1. Add `isValidEmail()` to `src/utils/email.ts`
2. Create `src/services/google/drivePicker.ts` — loads Picker script, opens file selector filtered to `.beanpod` files
3. Add `src/types/google-picker.d.ts` — ambient type declarations for google.picker namespace
4. Add `shareFileWithEmail()` to `src/services/google/driveService.ts` — POST to Drive permissions API
5. Modify `JoinPodView.vue` — show Picker button when `cloudLoadFailed && targetProvider === 'google_drive'`, re-uses existing `attemptFileLoad()` flow
6. Modify `FamilyPage.vue` — add optional email sharing section in invite modal (Google Drive only)
7. Add 10 translation keys to `uiStrings.ts`

## Files affected

| File                                                 | Change                                 | Type   |
| ---------------------------------------------------- | -------------------------------------- | ------ |
| `src/utils/email.ts`                                 | Add `isValidEmail()`                   | Modify |
| `src/services/google/drivePicker.ts`                 | Picker API service                     | New    |
| `src/types/google-picker.d.ts`                       | Ambient type declarations              | New    |
| `src/services/google/driveService.ts`                | Add `shareFileWithEmail()`             | Modify |
| `src/components/login/JoinPodView.vue`               | Picker button when cloud load fails    | Modify |
| `src/pages/FamilyPage.vue`                           | Optional email sharing in invite modal | Modify |
| `src/services/translation/uiStrings.ts`              | 10 new keys                            | Modify |
| `src/services/google/__tests__/drivePicker.test.ts`  | Picker service tests                   | New    |
| `src/services/google/__tests__/driveService.test.ts` | shareFileWithEmail tests               | Modify |
| `src/utils/__tests__/email.test.ts`                  | isValidEmail tests                     | New    |
| `e2e/specs/06-magic-link-join.spec.ts`               | Picker fallback E2E                    | Modify |
