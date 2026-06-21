# RC-009 Add explicit draft Resume/Discard and interrupted-work recovery

Status: ready-for-agent
Labels: ready-for-agent
Severity: P1
Issue ID: RC-009
Type: AFK
Owner: Agent RC-009, must invoke `$tdd`
Verifier: Verifier RC-009-V

## Parent

`.scratch/report-creation-repair/PRD.md`

## Report type, step, route, and entry point

- Report types: lost, found, sighting, adoption
- Steps: all creation steps, upload, submit
- Routes: repaired stack routes and chooser entry
- Entry points: starting a report when a saved draft exists; leaving with unsaved work; app restart after interruption

## Reproduction

1. Start a report and enter data.
2. Close or press Android Back.
3. Reopen the same report type.
4. Observe whether the user is offered Resume/Discard.
5. Interrupt upload/submission after media work once RC-002/RC-003 exist.

## Expected

- Meaningful changes are saved with debouncing and versioning.
- Leaving with unsaved work saves or asks to discard.
- Existing drafts offer explicit Resume and Discard actions.
- Restored drafts resume to a coherent step.
- Uploaded media and pending uploads reconcile after restart.
- Unknown submission result is reconciled before offering another submit.

## Actual

- Draft storage exists but restores silently.
- Incompatible drafts are silently ignored.
- Save is immediate on each draft change.
- Media/upload/submission recovery state is not modeled.

## User impact

Users can lose work unexpectedly, resume into contradictory state, or be forced to re-enter data after common upload/network failures.

## Evidence

- Code: `apps/expo/src/features/resilience/use-durable-creation-draft.ts`
- Code: `apps/expo/src/features/resilience/creation-drafts.ts`
- Screenshot: `.scratch/mobile-qa/20260621-130941/screenshots/02-after-back.png`

## Root cause

Confirmed. The draft mechanism is a persistence primitive, not a product recovery flow.

## What to build

Add a user-facing draft recovery model with Resume/Discard, schema migration, debounced save, coherent step restoration, upload reconciliation, and unknown submission result recovery.

## Acceptance criteria

- [ ] Draft schema version includes report type, current step, fields, selected location, local edited media refs, media order, primary image, upload status, and idempotency key.
- [ ] Draft saves after meaningful changes with debouncing.
- [ ] Leaving with unsaved work triggers save/discard behavior through navigation prevention.
- [ ] Reopening with a draft shows explicit Resume and Discard actions.
- [ ] Incompatible drafts are migrated or discarded with explanation.
- [ ] Restored state never renders contradictory active steps.
- [ ] Already uploaded media is reconciled through backend state after restart.
- [ ] Failed/interrupted upload can retry without losing other images/data.
- [ ] Timeout/unknown submission queries by idempotency key before another create attempt.
- [ ] Local draft is never treated as a submitted report.

## Required automated tests

- Draft serialization/versioning/migration tests.
- Resume/Discard component tests.
- Restoration-to-earliest-valid-step tests.
- Upload reconciliation tests.
- Unknown submission result reconciliation tests.

## Required manual verification

- Start each report type, enter data, leave, and verify Resume/Discard.
- Restart app during upload and retry.
- Simulate server timeout and confirm reconciliation.
- Verify discarded drafts do not leave submitted reports.

## Likely files and shared components

- `apps/expo/src/features/resilience/creation-drafts.ts`
- `apps/expo/src/features/resilience/use-durable-creation-draft.ts`
- Report journey state model
- Media upload state model
- Creation routes/navigation guards

## Backend, database, navigation, or storage implications

- Depends on upload-session backend state for reconciliation.
- May need idempotency lookup support from backend.
- Requires navigation prevent-remove integration.

## Dependencies and regression surfaces

- Blocked by: RC-004, RC-002.
- Regression surfaces: pet-profile drafts, existing durable draft tests, auth return flow.

## Non-goals

- Treating local drafts as submitted reports.
- Uploading media without backend authorization.

## Comments
