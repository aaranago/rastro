# 07 - Wire report creation end to end

Status: ready-for-agent
Severity: P1
Journey: Lost, found, sighting, and adoption report creation
Screens: Global report sheet and all creation modals

## Problem

Creation forms are not complete transactional journeys. They use fixture photos/locations, optional publish callbacks, no real upload lifecycle, no backend response, and no persisted result in nearby browsing.

## Reproduction

1. Open `Reportar`.
2. Choose `Reportar avistamiento`.
3. Add a photo and location.
4. Complete fields and submit.
5. Restart/refetch and attempt to find the submitted report in `Cerca`.

## Expected

The full flow selects report type, adds real photos, selects/confirm map location, validates required fields, reviews, submits to backend, handles retry, and shows the newly persisted report in list/map after refetch.

## Actual

Photos and location can be fixture/local, publish can simulate success, and no persisted backend report appears.

## Impact

The most important contribution journey is misleading and cannot satisfy real pet-finding needs.

## Evidence

- `.scratch/mobile-qa/20260619-195333/screenshots/09-report-sheet.png`
- `.scratch/mobile-qa/20260619-195333/screenshots/10-sighting-auth-gate.png`
- `.scratch/mobile-qa/20260619-195333/screenshots/13-sighting-after-add-photo.png`
- `apps/expo/src/features/shell/shell-overlays.tsx:612`
- `apps/expo/src/features/sighting-report-creation/sighting-report-creation-screen.tsx:93`
- `apps/expo/src/features/sighting-report-creation/sighting-report-creation-screen.tsx:119`
- `apps/expo/src/features/sighting-report-creation/sighting-report-creation-screen.tsx:141`

## Root Cause

Confirmed. The creation UI exists ahead of backend, storage, and map contracts and is wired through optional callbacks.

## Acceptance Criteria

- Each supported report type asks only relevant questions and validates required fields inline.
- Required-field indicators are not color-only.
- Keyboard-safe layouts scroll and focus to the first invalid field.
- Drafts persist across close/reopen, app background, and restart.
- Back navigation warns before losing unsaved work.
- Location is selected or confirmed with a real map provider.
- Photos upload via issue 06 before or during submit with progress and retry.
- Submission uses issue 02 backend create endpoint with durable idempotency.
- Success only appears after persisted backend response.
- Retry after network/upload/server failure does not require re-entering completed fields.
- Newly submitted report appears in the correct nearby list/map query after clean refetch.
- Duplicate taps do not create duplicate reports or media.

## Required Automated Tests

- Per-type validation tests.
- Draft persistence and unsaved-work prompt tests.
- Upload failure/retry integration tests.
- Submit idempotency and duplicate-tap tests.
- Post-submit nearby invalidation/refetch test.
- Accessibility tests for labels, errors, selected options, and progress announcements.

## Required Manual Verification

- Complete the minimum acceptance scenario with a sighting and two real images.
- Restart the app and confirm report/media reload.
- Simulate upload and submit failures and retry.
- Confirm denied location permission path still supports manual map pin.

## Affected Files

- `apps/expo/src/features/shell/shell-overlays.tsx`
- `apps/expo/src/features/*-report-creation/*`
- `apps/expo/src/features/adoption-listing-creation/*`
- `apps/expo/src/features/report-creation/*`
- `apps/expo/src/features/resilience/*`
- API client integration files

## Backend, Database, Map, or Storage Implications

Depends on real report API, map provider, media upload, and retry/idempotency contracts.

## Dependencies

- Issue 02.
- Issue 04.
- Issue 06.
- Issue 08 for durable state reliability.

## Regression Surfaces

- Global report sheet.
- Auth gating.
- Draft stores.
- Nearby cache invalidation.
- Report detail routing.

## Non-Goals

- Do not use simulated success or local-only inserted cards.
- Do not include synthetic report feed data.
