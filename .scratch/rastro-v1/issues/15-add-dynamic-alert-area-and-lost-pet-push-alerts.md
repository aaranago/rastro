# Add Dynamic Alert Area and lost-pet push alerts

Status: ready-for-agent
Type: AFK

## Parent

`.scratch/rastro-v1/PRD.md`

## What to build

Let members opt into nearby lost-pet alerts based on a Dynamic Alert Area and Alert Radius. Alerts should fire for new matching Lost Pet Reports without continuous GPS polling or always-on sockets.

## Acceptance criteria

- [ ] A member can enable/disable an Alert Subscription.
- [ ] The alert area uses current location when available and last detected location as fallback.
- [ ] The member can choose an Alert Radius.
- [ ] Notifications are sent only for new nearby active Lost Pet Reports.
- [ ] Closed reports do not trigger alerts.
- [ ] Default location updates occur on app open, foreground, or manual refresh.
- [ ] Optional background moving alerts are behind an explicit setting and clear permission state.
- [ ] The implementation is battery-conscious and avoids continuous GPS polling.

## Blocked by

- `.scratch/rastro-v1/issues/09-browse-nearby-lost-pet-reports-with-postgis-search.md`
- `.scratch/rastro-v1/issues/14-add-report-lifecycle-outcomes-and-stale-report-prompts.md`

## Context

Use Expo push notifications and the location privacy decisions from the PRD.
