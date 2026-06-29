# AEP-002 Admin shell and data-table polish

Status: ready-for-agent
Labels: ready-for-agent
Severity: P1
Issue ID: AEP-002
Type: AFK
Owner: Unassigned

## Parent

`.scratch/admin-dashboard-enterprise-polish/PRD.md`

## What to build

Polish the admin shell and reusable admin list UI around shadcn-style sidebar and data-table patterns.

## Acceptance criteria

- [ ] Operator-facing navigation no longer shows `Disponible`, old issue IDs, or roadmap status residue.
- [ ] Admin shell has sidebar collapse on desktop and a mobile drawer behavior.
- [ ] Admin pages expose breadcrumbs and a command/search affordance in the header.
- [ ] Reusable admin data-table components support filter bars, pagination controls, empty/error/loading states, and responsive mobile fallback.
- [ ] Existing admin dashboards adopt the shared table shell where practical without large unrelated rewrites.
- [ ] No admin route has horizontal document overflow at `320x568` or `390x844`.

## Required tests

- Next component tests for shell navigation without status residue.
- Next component tests for reusable data-table empty, loading, filtered-empty, and paginated states.
- Playwright screenshots for all admin routes at desktop and mobile widths.

## Notes

Use the local `@acme/ui` shadcn primitives already in the repo. Avoid marketing-style layouts; this is an operational tool.
