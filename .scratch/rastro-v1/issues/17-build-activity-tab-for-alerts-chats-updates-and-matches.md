# Build Activity tab for alerts, chats, updates, and matches

Status: ready-for-agent
Type: AFK

## Parent

`.scratch/rastro-v1/PRD.md`

## What to build

Build `Actividad` as the member's recovery activity hub: alert history, chats, report updates, and candidate matches. Alerts should not be a bottom tab because urgent items surface in sticky areas and activity history belongs here.

## Acceptance criteria

- [ ] `Actividad` shows alert history for nearby lost-pet alerts.
- [ ] `Actividad` shows chat conversations tied to reports/listings.
- [ ] `Actividad` shows owned report updates and status prompts.
- [ ] Candidate matches can be represented in the list even if matching logic is minimal in v1.
- [ ] Visitors see an appropriate signed-out state.
- [ ] Tapping an item deep-links to the relevant report, listing, chat, or setting.

## Blocked by

- `.scratch/rastro-v1/issues/14-add-report-lifecycle-outcomes-and-stale-report-prompts.md`
- `.scratch/rastro-v1/issues/15-add-dynamic-alert-area-and-lost-pet-push-alerts.md`
- `.scratch/rastro-v1/issues/16-add-report-linked-in-app-chat-and-whatsapp-contact-options.md`

## Context

Use the mobile navigation decision in `docs/product/ui-design-brief.md`.
