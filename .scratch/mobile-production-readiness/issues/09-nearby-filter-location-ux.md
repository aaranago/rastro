# 09 - Repair nearby location, filters, and empty states

Status: ready-for-agent
Severity: P2
Journey: Location selection and Cerca browsing
Screens: `Cerca` no-location, list mode, map mode

## Problem

Nearby context and filters are visually ambiguous. The no-location state uses a large question-mark placeholder, manual map pin is not real, all filters look similarly prominent, and state is not durably persisted.

## Reproduction

1. Launch with location denied.
2. Open `Cerca`.
3. Observe the no-location state and manual actions.
4. Choose `Zona Sur, La Paz`.
5. Inspect radius/category controls and switch between list/map/detail.

## Expected

Users understand search origin, location source, radius, categories, result count, and list/map mode within two seconds. Recovery actions are useful and visible.

## Actual

The screen repeats headings, uses pill-heavy controls, hides/overlaps manual actions, and includes a generic question mark.

## Impact

Users cannot confidently understand where they are searching or how filters affect results, and denied-permission users see an unfinished state.

## Evidence

- `.scratch/mobile-qa/20260619-195333/screenshots/04-nearby-initial.png`
- `.scratch/mobile-qa/20260619-195333/screenshots/05-nearby-list-zona-sur.png`
- `apps/expo/src/features/nearby/nearby-screen.tsx:90`
- `apps/expo/src/features/nearby/nearby-screen.tsx:172`
- `apps/expo/src/features/nearby/nearby-screen.tsx:414`
- `apps/expo/src/features/nearby/nearby-screen.tsx:612`
- `apps/expo/src/features/nearby/nearby-screen.tsx:1035`

## Root Cause

Confirmed. Nearby state is mostly local UI state with placeholder no-location artwork and equal-weight filter chips.

## Acceptance Criteria

- No generic question mark or developer placeholder appears in production empty/location states.
- Current device location, manual city/zone, search result, and manual pin are distinct states.
- Radius and category controls have clear selected/unselected states and 48 dp targets.
- A concise summary appears when multiple filters are active.
- Result count appears where useful.
- Reset filter action is available.
- Empty states offer recovery actions: increase radius, change filters, select another area, or retry.
- Filters, selected result, camera/list mode, and scroll position survive list/map/detail navigation.
- Durable restoration after app restart is implemented where expected.

## Required Automated Tests

- Component tests for no-location recovery actions.
- Tests for radius/category selected-state labels.
- State persistence tests for filters across navigation.
- Snapshot or accessibility tests for long Spanish labels and large text.

## Required Manual Verification

- Location denied, unavailable, granted, and later-granted flows.
- Smallest viewport and largest supported font scale.
- Switch list/map/detail/back and confirm state preservation.

## Affected Files

- `apps/expo/src/features/nearby/nearby-screen.tsx`
- `apps/expo/src/features/nearby/nearby-location-state.ts`
- `apps/expo/src/features/nearby/nearby-view-model.ts`
- `apps/expo/src/features/resilience/*`
- Design token/shared control files

## Backend, Database, Map, or Storage Implications

Full completion depends on issue 03 and issue 04 for real data/map behavior.

## Dependencies

- Issue 03 for real results.
- Issue 04 for manual pin.
- Issue 08 for reliable durable restoration.

## Regression Surfaces

- Nearby result filtering.
- Location permission prompt flow.
- Bottom navigation state preservation.

## Non-Goals

- Do not hide missing map/backend functionality behind visual polish.
- Do not add decorative artwork unless it improves comprehension.
