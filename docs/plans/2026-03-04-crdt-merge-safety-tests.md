# Plan: Unit Tests for Cross-Device CRDT Merge Safety

> Date: 2026-03-04
> Related: Critical production bug — `decryptBeanpodPayload()` called `loadDoc()` which silently replaced the in-memory doc singleton, causing local changes to be lost during cross-device merge

## Context

A critical data-loss bug was fixed: `decryptBeanpodPayload()` in `fileSync.ts` previously called `loadDoc(binary)`, which has the side effect of replacing the `currentDoc` singleton. During cross-device merge, this meant the local doc was overwritten by the remote doc _before_ `mergeDoc()` ran, making the merge a no-op and losing local changes.

The fix was to use `Automerge.load()` directly (returns a standalone doc without modifying the singleton). This is a critical invariant that must be permanently guarded by tests.

## Approach

### File: `src/services/sync/fileSync.test.ts` (replace existing TODO stubs)

Use the **real Automerge + real Web Crypto** pattern (matching `docService.test.ts` and `familyKeyService.test.ts`). No mocks for Automerge or crypto — test the actual round-trip.

Environment: `@vitest-environment node` (crypto available natively in Node).

#### Test setup

```typescript
// Before each test:
// 1. resetDoc() — clear singleton
// 2. Generate a real AES-256-GCM family key via generateFamilyKey()
// 3. initDoc() — create an empty Automerge document as the singleton
```

#### Tests to write

**1. `decryptBeanpodPayload does NOT replace currentDoc singleton`** (the regression guard)

- `initDoc()` and add a local member via `changeDoc()`
- `saveDoc()` → encrypt → build envelope → `decryptBeanpodPayload(envelope, key)`
- Assert `getDoc()` still has the local member (singleton unchanged)
- Assert the returned doc is a separate valid Automerge document

**2. `decryptBeanpodPayload returns a valid standalone Automerge doc`**

- Create a doc with data, serialize → encrypt → envelope
- `decryptBeanpodPayload()` returns a doc with the same data
- Verify the returned doc can be passed to `mergeDoc()` without error

**3. `full merge preserves local changes when merging remote doc`** (end-to-end merge simulation)

- `initDoc()` with a shared ancestor member
- Fork: `saveDoc()` → create a "remote" doc from the binary with `Automerge.change()` adding remote-only data
- Make local-only changes via `changeDoc()` (adding a local account)
- Encrypt the remote doc → envelope → `decryptBeanpodPayload()` → `mergeDoc()`
- Assert merged `getDoc()` has: ancestor member + local account + remote data

**4. `V4 encrypt/decrypt round-trip preserves Automerge document`**

- `initDoc()` with members, accounts, settings
- `createBeanpodV4()` → `parseBeanpodV4()` → `decryptBeanpodPayload()`
- Assert all data in returned doc matches original

**5. `parseBeanpodV4 rejects invalid input`**

- Invalid JSON → throws
- Wrong version → throws
- Missing fields → throws

**6. `detectFileVersion identifies V4 format`**

- V4 JSON → returns `'4.0'`
- Invalid JSON → returns `null`
- Wrong version → returns `null`

## Files affected

| File                                 | Change                                    |
| ------------------------------------ | ----------------------------------------- |
| `src/services/sync/fileSync.test.ts` | Replace TODO stubs with 6 real test cases |

## Verification

1. `npx vitest run src/services/sync/fileSync.test.ts` — all new tests pass
2. `npm run type-check` — no errors
3. `npx vitest run` — full suite still passes (625+ tests)
