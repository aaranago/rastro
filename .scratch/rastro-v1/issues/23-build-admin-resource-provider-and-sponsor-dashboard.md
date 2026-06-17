# Build admin Resource Provider and sponsor dashboard

Status: ready-for-agent
Type: AFK

## Parent

`.scratch/rastro-v1/PRD.md`

## What to build

Build the Next.js admin dashboard path for managing Resource Provider profiles, Verification Badges, and Local Sponsor Placements.

## Acceptance criteria

- [ ] Admins can create, edit, and deactivate Resource Provider profiles.
- [ ] Admins can grant or revoke Verification Badges.
- [ ] Admins can create, edit, schedule, and deactivate Local Sponsor Placements.
- [ ] Sponsor placement management prevents sponsored recovery ranking or push notification placement.
- [ ] The dashboard supports core provider fields and optional external links.
- [ ] Non-admin members cannot access provider/sponsor management.

## Blocked by

- `.scratch/rastro-v1/issues/20-build-resource-provider-profiles-and-verification-badge-display.md`
- `.scratch/rastro-v1/issues/21-display-local-sponsor-placements-without-affecting-recovery-priority.md`

## Context

Admin and resource-provider management lives in the Next.js web app.
