# 04 - Integrate production map and manual location picking

Status: ready-for-agent
Severity: P1
Journey: Location selection and Cerca map browsing
Screens: `Cerca` map mode, manual pin flow, creation location step

## Problem

The app renders a colored rectangle with fixed cards instead of real map tiles, and manual pin selection is backed by a hardcoded fixture.

## Reproduction

1. Open `Cerca`.
2. Select a manual zone.
3. Switch to `Mapa`.
4. Attempt to pan, zoom, view attribution, recenter, or inspect provider loading/error state.
5. Tap `Elegir punto en el mapa` from the no-location state.

## Expected

The app displays a production map provider with real tiles, attribution, markers based on persisted coordinates, and a real manual pin placement flow.

## Actual

The map is a styled `View`; marker cards are absolutely positioned using hardcoded percentage positions. Manual pin chooses a static Santa Cruz coordinate.

## Impact

Users cannot trust location data, cannot inspect spatial context, and screen-reader users lack a meaningful map alternative.

## Evidence

- `.scratch/mobile-qa/20260619-195333/screenshots/04-nearby-initial.png`
- `.scratch/mobile-qa/20260619-195333/screenshots/06-nearby-map-zona-sur.png`
- `apps/expo/src/features/nearby/nearby-screen.tsx:922`
- `apps/expo/src/features/nearby/nearby-screen.tsx:978`
- `apps/expo/src/features/nearby/nearby-screen.tsx:1210`
- `apps/expo/src/features/nearby/nearby-screen.tsx:1455`
- `apps/expo/src/features/nearby/nearby-fixtures.ts:56`
- `apps/expo/package.json:20`

## Root Cause

Confirmed. No production map SDK dependency or provider configuration exists, and the UI simulates markers over a blank canvas.

## Acceptance Criteria

- Add a supported production map provider using environment/secret configuration, never hardcoded keys.
- Render real map tiles and required attribution.
- Show report markers from persisted latitude/longitude.
- Cluster or otherwise handle dense/overlapping markers at low zoom.
- Selecting a marker shows a useful preview and an action to open full report detail.
- List selection and marker selection remain synchronized.
- Current-location and recenter controls work when permission is granted.
- Manual location selection opens a real map pin flow and persists the chosen origin/draft location.
- Provider loading, no-results, offline, and provider-error states are visible and recoverable.
- Map controls, attribution, markers, and previews are not covered by bottom navigation or the `Reportar` action.
- A list alternative remains accessible to screen-reader users.

## Required Automated Tests

- Component tests for marker/list synchronization using a mocked map component.
- State tests for preserving camera, filters, and selected result across navigation.
- Tests for provider error/offline fallback retaining list access.
- Manual-pin selection state tests.

## Required Manual Verification

- Verify real tiles on Android emulator and smallest supported viewport.
- Grant and deny location permission and verify both paths.
- Pan/zoom/select markers and open detail.
- Verify attribution remains visible.
- Test offline/provider error behavior.

## Affected Files

- `apps/expo/package.json`
- `apps/expo/app.config.ts`
- `apps/expo/src/features/nearby/*`
- New shared map/location-picker component files
- Location permission helpers
- `docs/dev/mobile-runbook.md`

## Backend, Database, Map, or Storage Implications

Needs map provider key/config path. Persisted marker data depends on issue 02 and issue 03.

## Dependencies

- Issue 02 for persisted coordinates.
- Issue 03 for API-backed browse data.
- Map provider credentials/environment variables.

## Regression Surfaces

- Expo dev-client build.
- Android/iOS permissions.
- Nearby result rendering.
- Creation location step.

## Non-Goals

- Do not use fake tiles, static screenshots, or drawn map rectangles.
- Do not put provider secrets in the mobile client source.
