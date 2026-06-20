# 03 - Replace production nearby fixtures with API-backed browsing

Status: closed
Severity: P1
Journey: Cerca list and nearby search
Screens: `Cerca` list and map modes

## Problem

Cerca presents static fixture reports as if they are real nearby results. The adapter filters an in-memory array and the fixtures include stock/placeholder URLs.

## Reproduction

1. Decline location or use a manual zone.
2. Open `Cerca`.
3. Select `Zona Sur, La Paz`.
4. Observe hardcoded reports such as Bruno.
5. Inspect `nearby-fixtures.ts` and `nearby-static-adapter.ts`.

## Expected

Production browsing reads persisted lost, found, sighting, and adoption reports from the backend. When the backend has no matching data, the UI shows a genuine empty state.

## Actual

The production route defaults to `createStaticNearbyLostReportsAdapter`, backed by hardcoded report fixtures.

## Impact

Users cannot trust whether listed pets are real, newly submitted reports cannot appear after restart/refetch, and the app may present synthetic reports as genuine.

## Evidence

- `.scratch/mobile-qa/20260619-195333/screenshots/05-nearby-list-zona-sur.png`
- `apps/expo/src/features/nearby/nearby-fixtures.ts:73`
- `apps/expo/src/features/nearby/nearby-fixtures.ts:224`
- `apps/expo/src/features/nearby/nearby-static-adapter.ts:17`
- `apps/expo/src/app/(tabs)/(nearby)/index.tsx:16`

## Root Cause

Confirmed. The default nearby adapter is a static fixture source and the backend has no report browsing router yet.

## Acceptance Criteria

- Production `Cerca` uses the report API from issue 02 by default.
- Fixture adapters remain available only for tests, stories, or explicitly marked dev/demo modes.
- Empty, loading, error, stale, and offline states distinguish real backend state from cached data.
- List and map modes consume the same filtered result set.
- Radius and category filters are included in API requests.
- Obsolete requests are canceled or ignored when filters/location change.
- Newly persisted reports appear after a clean refetch and app restart.
- No stock, hardcoded, local `file://`, or fixture media appears in production feeds.

## Required Automated Tests

- Adapter test mapping API response into nearby view models.
- Component test for empty backend response.
- Component/integration test proving list and map receive the same result IDs.
- Test proving stale data is visibly marked after a failed refresh.
- Test proving fixture adapters are not used by the production route.

## Required Manual Verification

- Run the app against an empty database and verify a genuine empty state.
- Create or seed a real persisted report and verify it appears in `Cerca`.
- Change radius/category filters and inspect network requests.
- Restart the app and confirm results refetch from backend rather than static data.

## Affected Files

- `apps/expo/src/features/nearby/nearby-screen.tsx`
- `apps/expo/src/features/nearby/nearby-fixtures.ts`
- `apps/expo/src/features/nearby/nearby-static-adapter.ts`
- `apps/expo/src/features/nearby/nearby-stale-cache-adapter.ts`
- `apps/expo/src/app/(tabs)/(nearby)/index.tsx`
- API client integration files

## Backend, Database, Map, or Storage Implications

Depends on issue 02 for persisted report data and geospatial queries.

## Dependencies

- Issue 02 must provide nearby browse API contract.

## Regression Surfaces

- Nearby list rendering.
- Nearby offline/stale cache.
- Detail navigation from result cards.
- Map marker source data.

## Non-Goals

- Do not implement map tiles in this issue; see issue 04.
- Do not add fallback production fixtures.

## Verification

- Implementation agent: `019ee2bf-f017-7131-b87e-944a3a1c50cc`
- Independent verifier: `019ee2d1-6954-75d0-8681-80317e93cc82`
- Automated verification passed: `pnpm -F @acme/expo test`, `pnpm -F @acme/expo typecheck`, `pnpm -F @acme/expo lint`, `pnpm -F @acme/expo format`.
- Fallow audit passed with no introduced findings.
- Live `report.nearby` check against localhost:3000 returned HTTP 200 for an empty query, then returned a temporarily inserted persisted report with canonical media, and returned empty again after cleanup.
