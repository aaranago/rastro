# RC-010 Complete lost, found, and adoption submission using ready media IDs

Status: verified-automated
Labels: verified-automated
Severity: P0
Issue ID: RC-010
Type: AFK
Owner: Agent RC-010, must invoke `$tdd`
Verifier: Verifier RC-010-V

## Parent

`.scratch/report-creation-repair/PRD.md`

## Report type, step, route, and entry point

- Report types: lost, found, adoption
- Steps: details/photos/location/contact/review/submit/success
- Routes: repaired creation stack routes and backend report create/detail/nearby
- Entry points: all report-type chooser entry points after member auth

## Reproduction

1. Open Lost, Found, or Adoption creation.
2. Add a photo via current add tile.
3. Try to publish.
4. Inspect backend records and nearby/detail queries.

## Expected

- Required photos are ready media IDs owned by the submitting user.
- Type-specific fields map to the backend schema.
- Submission creates exactly one persisted report with media associations.
- Detail/nearby refetch renders remote images from object storage.

## Actual

- Current photo path inserts fixtures/local URIs.
- Current publish path lacks shell handlers.
- Backend currently accepts client media metadata, not ready media IDs.

## User impact

The three photo-required report types cannot be completed with trustworthy persisted media.

## Evidence

- Screenshot: `.scratch/mobile-qa/20260621-130941/screenshots/12-lost-submit-missing-handler.png`
- Code: validator requires media for non-sighting reports.
- Code: type-specific screens have publish props but shell does not supply them.
- Code: repository inserts media rows directly from client metadata.

## Root cause

Confirmed. The UI, validator, and backend media model are not reconciled around ready media ownership.

## What to build

Complete lost, found, and adoption report submission on top of the repaired state model, stack navigation, location picker, and media upload lifecycle. The submit payload should reference ready media records only, and success should be based on backend confirmation and clean refetch.

## Acceptance criteria

- [ ] Lost report creation submits with required pet identity/details, location, contact, and at least one ready media ID.
- [ ] Found report creation submits with found-specific fields, location, contact, and at least one ready media ID.
- [ ] Adoption creation submits with adoption-specific profile/details, location, contact, and at least one ready media ID.
- [ ] Irrelevant fields are not shown or sent just to satisfy a shared form.
- [ ] Backend verifies all referenced media are ready and owned by the submitter.
- [ ] Report and media associations are transactional or have compensating cleanup.
- [ ] Duplicate taps/retries do not create duplicate reports.
- [ ] Success displays real report ID/state.
- [ ] Clean detail/nearby refetch returns the report and remote images.
- [ ] App restart still renders report and images.

## Required automated tests

- Type-specific schema/mapping unit tests.
- Component tests for each report type's required fields and validation.
- Backend integration tests for ready media ownership and cross-user rejection.
- Idempotent create tests for each type.
- Clean refetch tests for detail/nearby media.

## Required manual verification

- Complete the essential path for lost, found, and adoption.
- Confirm object storage images render after restart.
- Inspect backend records and object keys.
- Verify repeated submit taps create one report.

## Likely files and shared components

- Type-specific creation screens/view models/types
- `apps/expo/src/features/report-creation/*`
- `packages/validators/src/index.ts`
- `packages/api/src/router/report.ts`
- `packages/api/src/report-repository.ts`
- `packages/db/src/schema.ts`
- Nearby/detail media adapters

## Backend, database, navigation, or storage implications

- Depends on ready media IDs from RC-003/RC-002.
- May require validator contract changes from media metadata to media IDs.
- May require report repository changes for transactional media association.

## Dependencies and regression surfaces

- Blocked by: RC-003, RC-002, RC-004.
- Regression surfaces: existing public report detail, nearby feed, adoption/lost/found tests.

## Non-goals

- Redesigning unrelated browse/detail screens except for necessary refetch/render correctness.

## Comments

### 2026-06-22 verification checkpoint

- Implemented with `$tdd` after RC-002 and RC-003 verified the ready-media contract.
- Fresh Verifier RC-010-V returned no findings for lost, found, and adoption submit transforms, ready media IDs, refetch/restart wiring, and duplicate submit guards.
- Focused adapter and route tests passed as part of the full Expo suite: `pnpm -F @acme/expo exec vitest run` passed with 67 files and 391 tests; `pnpm -F @acme/expo exec tsc --noEmit --pretty false` and `pnpm -F @acme/expo lint` also passed.
