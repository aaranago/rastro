# RC-008 Wire a real report location picker into creation

Status: manual-qa-needed
Labels: manual-qa-needed
Severity: P1
Issue ID: RC-008
Type: AFK
Owner: Agent RC-008, must invoke `$tdd`
Verifier: Verifier RC-008-V

## Parent

`.scratch/report-creation-repair/PRD.md`

## Report type, step, route, and entry point

- Report types: lost, found, sighting, adoption
- Step: location
- Current route: type-specific creation screens launched from chooser
- Entry points: all report-type chooser entry points

## Reproduction

1. Open each creation flow.
2. Inspect location section.
3. Try to choose/change location.
4. Review location values before publish.

## Expected

- User can select or confirm the event location.
- Permission request happens in context and handles denial/revocation.
- Exact/internal and public/approximate location behavior is clear.
- Location persists into review and backend create input.

## Actual

- Screens initialize with fixture default locations.
- Optional `onChoose...Location` callbacks are not wired through the shell modals.
- No real report-location picker is available in the creation path.

## User impact

Reports can be created with misleading fixture locations or without a real user-confirmed event location, making the report unsafe or useless.

## Evidence

- Creation screenshots show default La Paz fixture values.
- Code: type-specific screens set default fixtures such as `exactSightingLocation`.
- Code: shell creation modals do not pass location picker callbacks.
- Nearby has location services, but report creation does not expose them.

## Root cause

Confirmed. Report creation has local fixture location defaults and no wired picker route/sheet for report event location.

## What to build

Integrate a real report-location picker into the creation journey. Reuse existing location/map primitives where appropriate, but make the event-location contract explicit for report creation.

## Acceptance criteria

- [ ] Location step requires user confirmation or selection, not silent fixture data.
- [ ] Location permission is requested only after a user action.
- [ ] Denied, limited/unavailable, offline, and manual fallback states are recoverable.
- [ ] Selected exact location and public precision are shown in review.
- [ ] Backend create receives validated Bolivia coordinates, label, location cell, and expose-exact flag.
- [ ] Clean refetch returns the same public location behavior.
- [ ] Keyboard, map controls, and Continue action are not covered by system UI.

## Required automated tests

- Unit tests for location draft mapping to `reportLocationInputSchema`.
- Component tests for confirm/change location behavior.
- Permission denial and manual fallback tests.
- Integration test ensuring submitted location persists and refetches.

## Required manual verification

- Test with location permission granted and denied.
- Select map/manual location for each report type.
- Verify review and backend record.
- Verify safe area/keyboard behavior.

## Likely files and shared components

- `apps/expo/src/features/maps/*`
- `apps/expo/src/features/nearby/nearby-expo-location-adapter.ts`
- Type-specific creation screens/view models
- Shared report creation state model
- Backend create mapping tests

## Backend, database, navigation, or storage implications

- No schema migration expected; `ReportLocation` already exists.
- May need route/sheet navigation for map picker.

## Dependencies and regression surfaces

- Blocked by: RC-004, RC-005.
- Regression surfaces: Nearby location behavior, map provider setup, location permission copy.

## Non-goals

- Changing public location privacy policy outside creation.
- Redesigning Nearby search.

## Comments

- 2026-06-22: Agent RC-008 implemented with `$tdd` via delegated contract, picker adapter/screen, and creation-screen wiring slices. Added a shared `ReportLocationDraft` contract, a real report location picker, explicit current-location permission action, recoverable denied/unavailable/manual/map fallback states, creation-route adapter wiring, and lost/found/sighting/adoption draft/review/publish mappings. Removed silent fixture location defaults from clean drafts.
- 2026-06-22: Verifier RC-008-V2 found P1 geofence drift: out-of-Bolivia pins inside the rectangular Bolivia bounds, including Arica, Chile and Tacna, Peru, were still accepted. Agent RC-008-FIX-BOLIVIA fixed this with `$tdd` by replacing rectangle-only validation with a shared bounds-plus-border-ring predicate used before picker confirmation and publish/create transforms. Added tests for Arica/Tacna rejection and Cobija/Puerto Suarez acceptance.
- 2026-06-22: Fresh Verifier RC-008-V3 returned no findings. Verified picker wiring for lost/found/sighting/adoption, explicit permission request timing, recoverable denied/unavailable/manual/map-unavailable states, draft/review/publish location flow, and stricter Bolivia geofence coverage. Focused RC-008 suite passed: 59 files, 332 tests. `pnpm -F @acme/expo typecheck`, `pnpm -F @acme/expo lint`, and `pnpm exec fallow audit --base HEAD --format json --quiet 2>/dev/null || true` pass; Fallow reports inherited findings only. Remaining human QA: real iOS/Android permission dialogs, native map provider availability/configuration, tap/drag pin behavior on device, and visual review across small devices.
- 2026-06-22: UX refinement replaced the La Paz-sector manual choices with a Bolivia-wide department selector using all nine departments: La Paz, Santa Cruz, Cochabamba, Chuquisaca, Tarija, Oruro, Potosi, Beni, and Pando. Sucre is represented as the city option under Chuquisaca. The picker now uses an accessible dropdown-like department control before city selection and preserves department/municipality into `ReportLocationDraft`. Focused picker/nearby tests, full Expo tests, Expo typecheck, lint, and format pass. Fresh verifier inspection found no location-picker issues; targeted Android UI pass was partial only because an old draft validation state blocked reaching the picker quickly.
- 2026-06-22: Native recheck loaded `.env` through `dotenv-cli`, rebuilt the Android dev client, and verified manual map mode exposes an Android `Google Map` view instead of `Mapa no disponible`. Runbook/map-provider docs now use env-loaded Expo commands because the key in `.env` is not visible to plain Expo CLI commands in this repo.
