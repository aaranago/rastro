# 08 - Make durable mobile storage keys SecureStore-safe

Status: closed
Severity: P1
Journey: Launch, creation drafts, retry/offline recovery
Screens: Onboarding, report creation, offline retry flows

## Problem

Durable state uses colon-containing keys that Expo SecureStore rejects. This breaks onboarding completion, creation drafts, and retry queue persistence.

## Reproduction

1. Launch the app in the Android dev client.
2. Dismiss the first-run tour.
3. Start a report draft or enqueue a retry item in code/tests.
4. Inspect runtime logs.
5. Restart the app and observe state may not restore.

## Expected

All durable keys used with SecureStore satisfy platform key constraints. Load/save failures are handled and visible where user data might be lost.

## Actual

SecureStore throws `Invalid key provided to SecureStore` for keys like `rastro:shell:onboarding-v1`, `rastro:drafts:*`, and `rastro:retry-queue:v1`.

## Impact

Users can repeatedly see onboarding, lose interrupted report drafts, or lose queued retry work after restart with no useful error.

## Evidence

- `.scratch/mobile-qa/20260619-195333/logs/logcat.txt`
- `apps/expo/src/features/resilience/storage.ts:9`
- `apps/expo/src/features/shell/shell-onboarding.ts:29`
- `apps/expo/src/features/resilience/creation-drafts.ts:62`
- `apps/expo/src/features/resilience/retry-queue.ts:79`
- `apps/expo/src/features/resilience/use-durable-creation-draft.ts:89`

## Root Cause

Confirmed. The storage wrapper passes caller keys directly to SecureStore even when they include unsupported characters.

## Acceptance Criteria

- All keys passed to SecureStore are platform-safe.
- Existing logical keys can still be used by feature code, or constants are migrated consistently.
- Storage tests cover colon-containing logical keys.
- Onboarding completion persists across app restart.
- Creation drafts persist across app restart.
- Retry queue entries persist across app restart.
- Load/save errors are caught; user-visible draft persistence failures use alert semantics where applicable.
- Runtime logs no longer include `Invalid key provided to SecureStore`.

## Required Automated Tests

- Unit tests for storage adapter key normalization or key constants.
- Tests for onboarding storage key.
- Tests for creation draft repository save/load/remove with namespaced keys.
- Tests for retry queue save/load/remove with namespaced key.
- Test for storage error handling not producing unhandled promise rejections.

## Required Manual Verification

- Dismiss onboarding, force-stop/restart app, confirm tour does not return.
- Start a sighting draft, force-stop/restart app, confirm draft restores.
- Inspect logcat after these steps for absence of invalid-key errors.

## Affected Files

- `apps/expo/src/features/resilience/storage.ts`
- `apps/expo/src/features/shell/shell-onboarding.ts`
- `apps/expo/src/features/resilience/creation-drafts.ts`
- `apps/expo/src/features/resilience/retry-queue.ts`
- `apps/expo/src/features/resilience/use-durable-creation-draft.ts`
- Related resilience/onboarding tests

## Backend, Database, Map, or Storage Implications

Mobile storage only. No backend schema required.

## Dependencies

None.

## Regression Surfaces

- Auth token/session storage if the shared adapter is reused.
- Onboarding tests.
- Draft persistence tests.
- Offline retry tests.

## Non-Goals

- Do not change the report creation UX beyond visible persistence-error handling if needed.
- Do not implement backend retry processing here.

## Comments

### 2026-06-19 implementation

Implemented with TDD by implementation agent `019ee261-6eb7-7842-8e36-5d663de107ff`.

- `createExpoSecureStoreKeyValueStorage` now maps logical namespaced keys to SecureStore-safe keys before calling the native boundary.
- Durable draft autosave/load failures are caught and exposed through hook state instead of producing unhandled rejections.
- Creation editors using durable drafts render a visible Spanish `accessibilityRole="alert"` message when draft persistence fails.
- Onboarding completion was manually verified after app data clear, skip, force-stop, and relaunch; the tour did not return and logcat no longer contained `Invalid key provided to SecureStore`.

Independent verifier `019ee277-7283-7002-a3c8-203a79f3d85f` passed all acceptance criteria.

Verification commands:

- `pnpm -F @acme/expo test`
- `pnpm -F @acme/expo typecheck`
- `pnpm -F @acme/expo lint`
- `pnpm -F @acme/expo format`
- `pnpm exec fallow audit --base HEAD --format json --quiet 2>/dev/null || true`

Known residual outside this issue: pet profile draft clearing still has adjacent fire-and-forget risks in `pet-profiles-screen.tsx`; track separately if full draft-clear failure handling is prioritized.
