# ADMIN-006 Persisted admin settings and publish gates

Status: verified-runbook
Labels: verified-runbook
Severity: P0
Issue ID: ADMIN-006
Type: AFK
Owner: Unassigned

## Parent

`.scratch/admin-dashboard-overhaul/PRD.md`

## What to build

Replace in-memory admin settings with persisted settings for Review Mode and verified-email publish requirements. Add `/admin/ajustes` for settings management and enforce the settings in the relevant publish paths.

## Acceptance criteria

- [x] Settings are persisted in the database and survive server restart.
- [x] `/admin/ajustes` shows Review Mode and verified-email publish requirement.
- [x] Admins can toggle settings with confirmation, clear copy, and success/error feedback.
- [x] Adoption publish flow respects Review Mode.
- [x] Report/listing publish paths respect verified-email requirement when enabled.
- [x] Default state matches product docs: email verification is configurable and off by default unless explicitly enabled.
- [x] Settings changes produce audit events or are ready to be included by ADMIN-010.

## Required automated tests

- DB/repository tests for settings read/write defaults.
- API/router tests for admin-only settings mutations.
- Publish-path tests for Review Mode and verified-email enforcement.
- Next component/action tests for settings toggles.

## Required visual verification

- Playwright screenshots for `/admin/ajustes` default state, toggled state, and error state.
- Playwright reload/server restart simulation where practical to prove persistence.

## Blocked by

- ADMIN-001

## Notes

Do not keep the current `admin-moderation.ts` in-memory settings as production behavior.

ADMIN-006 implementation verified persistence with DB-backed settings,
repository/router tests, and Playwright coverage for `/admin/ajustes` default,
error, toggled, reload, and fresh Next server restart states.

Visual evidence:

- `/tmp/rastro-admin-006-default.png`
- `/tmp/rastro-admin-006-error.png`
- `/tmp/rastro-admin-006-toggled.png`
- `/tmp/rastro-admin-006-reload-persistence.png`
- `/tmp/rastro-admin-006-restart-persistence.png`
