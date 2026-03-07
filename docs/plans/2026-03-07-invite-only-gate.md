# Plan: Invite-Only Gate for Family Creation

> Date: 2026-03-07

## Context

beanies.family is in beta. We need a soft gate requiring an "invite bean" token to create a new family. Users without a token can request one via a form that posts to Slack. The join flow (existing family via invite link) is unchanged.

## Approach

### Token Validation

- Valid tokens stored as **SHA-256 hashes** in `VITE_INVITE_BEAN_HASHES` env var (comma-separated hex strings)
- **Reuse** `hashInviteToken(token)` from `src/services/crypto/inviteService.ts` (already does SHA-256 via Web Crypto)
- New file `src/utils/inviteToken.ts` with two thin functions:
  - `isInviteGateEnabled()` → `false` when env var is empty (disables gate)
  - `validateInviteToken(token)` → hash via `hashInviteToken()`, check against env var hashes
- Tokens trimmed + lowercased before hashing (case-insensitive)
- Generate tokens: `echo -n "my-token" | sha256sum | cut -d' ' -f1`

### UI: `InviteGateOverlay.vue`

Single component, absolute overlay on blurred CreatePodView. Three states via `mode` ref:

**Token mode** (default): Title, description, `BaseInput` for token, `BaseButton` "Unlock". Valid → emit `unlocked`; invalid → inline error.

**Request mode** (toggle link): `BaseInput` × 3 (Name required, Email required + `isValidEmail()`, Message optional). `BaseButton` "Send Request" → `fetch()` POST to Slack webhook (`VITE_INVITE_WEBHOOK_URL`). Success → confirmed mode. Failure → inline error.

**Confirmed mode**: Confirmation message + `BaseButton` "Back to Home" → `router.push('/home')`.

**Reused existing code:** `BaseInput`, `BaseButton`, `isValidEmail()` (`src/utils/email.ts`), `hashInviteToken()` (`src/services/crypto/inviteService.ts`), `useTranslation()`.

### LoginPage Integration (`src/pages/LoginPage.vue`)

When `activeView === 'create'` and `isInviteGateEnabled()`:

- Add `blur-sm pointer-events-none` to CreatePodView wrapper
- Render `InviteGateOverlay` as absolute sibling
- On `@unlocked` → remove blur, hide overlay

### E2E Bypass

- `InviteGateOverlay`: if `import.meta.env.DEV && sessionStorage.getItem('e2e_auto_auth') === 'true'` → auto-emit `unlocked` on mount (same pattern as TrustDeviceModal)
- Tests clicking create-pod-button without `bypassLoginIfNeeded` need `e2e_auto_auth` set before the click

## Files

### Create

| File                                         | Purpose                                                                      |
| -------------------------------------------- | ---------------------------------------------------------------------------- |
| `src/utils/inviteToken.ts`                   | `isInviteGateEnabled()` + `validateInviteToken()` (reuses `hashInviteToken`) |
| `src/components/login/InviteGateOverlay.vue` | Overlay: token input, request form, confirmation                             |
| `src/utils/__tests__/inviteToken.test.ts`    | Unit tests for token validation                                              |

### Modify

| File                                     | Change                                                      |
| ---------------------------------------- | ----------------------------------------------------------- |
| `src/pages/LoginPage.vue`                | Blur CreatePodView + render overlay when gate active        |
| `src/services/translation/uiStrings.ts`  | Add `inviteGate.*` keys (en + beanie)                       |
| `.env.example`                           | Add `VITE_INVITE_BEAN_HASHES` and `VITE_INVITE_WEBHOOK_URL` |
| `e2e/helpers/auth.ts`                    | Set `e2e_auto_auth` before create-pod-button click          |
| `e2e/specs/01-setup-flow.spec.ts`        | Set `e2e_auto_auth` before create button in validation test |
| `e2e/specs/08-google-drive-sync.spec.ts` | Set `e2e_auto_auth` before create/load buttons              |

## Verification

1. `npm run type-check` — no TS errors
2. `npm run test:run` — unit tests pass (including inviteToken tests)
3. `npm run build` — production build succeeds
4. Manual: `/welcome` → Create → blurred form + overlay → invalid token → error → valid token → unblurs
5. Manual: request form → fill → Send → Slack message received → confirmation → Back to Home
6. E2E: `npx playwright test` — all pass with gate bypassed
