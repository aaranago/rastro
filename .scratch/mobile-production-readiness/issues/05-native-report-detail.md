# 05 - Build native persisted report details

Status: ready-for-agent
Severity: P1
Journey: Opening a marker or list card
Screens: Native report detail routes

## Problem

Opening a nearby report shows a generic public-link fallback instead of a native detail screen with report content.

## Reproduction

1. Open `Cerca`.
2. Select `Zona Sur, La Paz`.
3. Switch to `Mapa`.
4. Tap a marker/card.
5. Observe the route showing only a report ID and `Abrir pagina publica`.

## Expected

The native app fetches and displays a complete persisted report with media, type/status, pet/event fields, safe location, distance, contact/privacy actions, share/report actions, and owner lifecycle controls where authorized.

## Actual

The route renders a generic deep-link screen and asks the user to open a public page.

## Impact

Users cannot inspect report details, act safely, contact/respond, or understand status within the app.

## Evidence

- `.scratch/mobile-qa/20260619-195333/screenshots/07-report-detail-from-map.png`
- `apps/expo/src/app/(tabs)/(nearby)/reportes/perdidos/[reportId].tsx:5`
- `apps/expo/src/features/reports/public-report-deep-link-screen.tsx:46`
- `apps/nextjs/src/public-lost-reports.ts:91`
- `apps/nextjs/src/app/reportes/perdidos/[reportId]/page.tsx:31`

## Root Cause

Confirmed. Native detail routes and the web public page are fixture/deep-link fallbacks rather than backend report reads.

## Acceptance Criteria

- Native routes fetch persisted report detail by ID and type.
- Details include large correctly cropped images, type/status, pet identity or unknown-name state, species, breed, color, size, distinguishing traits, event date/time, approximate location, distance from selected origin, and lifecycle state.
- A small real map or action to view on the main map is available.
- Contact/response respects the privacy model and never exposes private contact data unintentionally.
- Share, save/follow where supported, report/block/moderation actions, and owner edit/resolve/delete controls are present only when supported/authorized.
- Loading, not-found, offline/stale, permission, and server-error states are recoverable.
- Back navigation restores nearby filters, selected result, and map/list state.
- The public-link fallback is used only when native detail cannot be synced and is labeled as fallback.

## Required Automated Tests

- Detail route fetch success/loading/error/not-found tests.
- Authorization/owner-action visibility tests.
- Back-navigation state restoration test.
- Media loading and broken-image state tests.
- Accessibility tests for headings, image labels, buttons, and focus order.

## Required Manual Verification

- Open detail from list and map.
- Verify images load from persisted media.
- Navigate back and confirm state restoration.
- Test unauthorized and owner sessions.
- Test offline/stale detail behavior.

## Affected Files

- `apps/expo/src/app/(tabs)/(nearby)/reportes/**/[reportId].tsx`
- `apps/expo/src/features/reports/*`
- `apps/nextjs/src/app/reportes/**`
- `apps/nextjs/src/public-lost-reports.ts`
- API detail router from issue 02

## Backend, Database, Map, or Storage Implications

Depends on issue 02 for detail API and issue 06 for persisted media URLs.

## Dependencies

- Issue 02.
- Issue 06 for complete media behavior.

## Regression Surfaces

- Deep-link routing.
- Nearby navigation.
- Web public pages.
- Auth-sensitive owner controls.

## Non-Goals

- Do not add hardcoded detail records.
- Do not expose exact private coordinates unless explicitly supported by the privacy model.
