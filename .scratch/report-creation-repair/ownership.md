# Report Creation Repair Ownership

Status: ready-for-agent
Labels: ready-for-agent
Created: 2026-06-21

Each implementation owner must invoke `$tdd`. Each verifier must be fresh: they must not implement the issue they verify.

| Issue  | Severity | Implementation agent | Verifier          | Owned files / areas                                                                         | Blocked by                                           | Status          |
| ------ | -------- | -------------------- | ----------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------- | --------------- |
| RC-001 | P0       | Agent RC-001         | Verifier RC-001-V | Sighting creation publish adapter, tRPC create call, query invalidation/refetch, tests      | Real device/backend verification                     | ready-for-human |
| RC-007 | P1       | Agent RC-007         | Verifier RC-007-V | Report chooser, shell icon system, chooser tests/screenshots                                | None                                                 | ready-for-agent |
| RC-004 | P1       | Agent RC-004         | Verifier RC-004-V | Report journey state model, progress UI, step validation gates                              | RC-001 contract reuse                                | ready-for-agent |
| RC-005 | P1       | Agent RC-005         | Verifier RC-005-V | Expo Router creation routes, stack headers, safe areas, keyboard footer, unsaved prevention | RC-004                                               | ready-for-agent |
| RC-008 | P1       | Agent RC-008         | Verifier RC-008-V | Report location picker, permission handling, location persistence/review                    | RC-004, RC-005                                       | ready-for-agent |
| RC-003 | P0       | Agent RC-003         | Verifier RC-003-V | Backend media/upload schema, storage adapter, env docs, cleanup job, storage tests          | Reachable test MinIO/S3 config for final integration | ready-for-human |
| RC-002 | P0       | Agent RC-002         | Verifier RC-002-V | Native image picker/crop/edit/manager, upload client, media draft state                     | RC-003                                               | ready-for-agent |
| RC-010 | P0       | Agent RC-010         | Verifier RC-010-V | Lost/found/adoption submit transforms, ready media IDs, refetch/restart                     | RC-003, RC-002, RC-004                               | ready-for-agent |
| RC-009 | P1       | Agent RC-009         | Verifier RC-009-V | Draft Resume/Discard, migration, upload/submission recovery                                 | RC-004, RC-002                                       | ready-for-agent |
| RC-011 | P1       | Agent RC-011         | Verifier RC-011-V | Accessibility labels/states, large text, safe-area QA, regression evidence                  | RC-002, RC-004, RC-005, RC-007                       | ready-for-agent |

## Coordination rules

- Do not run overlapping implementation agents on shared files at the same time.
- Agent RC-001 and Agent RC-007 can run independently first.
- Agent RC-004 should start after RC-001 has stabilized the submit contract, or explicitly own any needed contract changes.
- Agent RC-003 can run in parallel with UI state/navigation work because it owns backend/storage boundaries.
- Agent RC-002 must wait for RC-003 upload-session contracts.
- Agent RC-010 must wait for RC-002 and RC-003 because lost, found, and adoption require verified media.
- Run `pnpm exec fallow audit --base HEAD --format json --quiet 2>/dev/null || true` before committing non-trivial JavaScript or TypeScript changes.

## Comments

- 2026-06-21: RC-001 verifier returned P1 date-format drift. Fixed by requiring ISO date-time before enabling sighting publish and before converting to backend input. Focused and package tests pass.
- 2026-06-21: RC-003 verifier returned three findings: upload draft/report type context was not persisted/enforced, completion did not verify all required object metadata, and cleanup had no runtime entrypoint. Fixed with DB columns/migration, repository/router enforcement, metadata verification, and `/api/jobs/report-media-cleanup`.
