# AEP-004 Real moderation workflow decisions

Status: ready-for-agent
Labels: ready-for-agent
Severity: P0
Issue ID: AEP-004
Type: AFK
Owner: Unassigned

## Parent

`.scratch/admin-dashboard-enterprise-polish/PRD.md`

## What to build

Add server-side moderation list filtering/pagination, direct queue-item lookup, false-report decisions, and provider-report resolution states.

## Acceptance criteria

- [ ] Report moderation queue supports the shared list contract with filters for type, visibility, false-report state, city, department, risk, and reason where applicable.
- [ ] Provider moderation queue supports the shared list contract with filters for reason, city, department, verification, status, and reporter suspension.
- [ ] Direct detail endpoints return one queue item by ID and return `NOT_FOUND` for missing/deleted targets.
- [ ] Report targets support `mark_false` and `unmark_false` decisions with admin actor, timestamp, reason/note, and audit events.
- [ ] False-marked reports are excluded from public/mobile reads like hidden reports.
- [ ] Provider-report review items support `pending`, `dismissed_false_report`, `resolved_action_taken`, and `resolved_no_action` with resolution metadata and audit events.

## Required tests

- DB schema tests for new enum values/columns.
- Repository/API tests for queue pagination/filtering/detail, false mark/unmark, provider resolution states, and audit events.
- Public/mobile report read tests proving false-marked reports are excluded.
- Next tests for moderation action forms and state feedback.
