# AR26-003 Alert subscriptions and push tokens

Status: ready-for-agent
Labels: ready-for-agent
Severity: P0
Type: AFK

## Problem

Alert subscription settings and push token registration are local-only. The documented user story requires durable alerts for pets lost near the member when the report is less than a day old.

## What to build

Persist alert subscriptions and device push tokens, then send eligible report-created notifications using the PostGIS search boundary.

## Acceptance criteria

- [ ] API persists member alert radius/location/category settings.
- [ ] Expo persists Expo push token and associates it with the authenticated member.
- [ ] Report-created notification matching excludes reports older than 24 hours.
- [ ] Sponsor placements cannot influence push eligibility or recovery priority.
- [ ] Members can pause/unsubscribe from alerts.
- [ ] Tests cover matching, age cutoff, unsubscribe, missing token, and permission-denied copy.
- [ ] Device verification proves settings survive restart and backend state refresh.

## Suggested ownership

- Alerts backend owner: DB, API, matching/job path.
- Expo alerts owner: settings adapter, push-token registration, device states.

