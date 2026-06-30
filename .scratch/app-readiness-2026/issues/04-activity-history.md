# AR26-004 Backend-backed Activity history

Status: ready-for-agent
Labels: ready-for-agent
Severity: P1
Type: AFK

## Problem

The Activity tab renders shell/session-derived content for members and does not fetch real alert, chat, or report-update history.

## What to build

Add a backend Activity read model and wire the Expo Activity tab to backend data.

## Acceptance criteria

- [ ] API returns member activity grouped by alerts, chat conversations, report updates, and moderation events.
- [ ] Activity tab handles loading, empty, offline/stale, and error states.
- [ ] Chat history appears for real conversations, not fixture data.
- [ ] Report updates link to the correct report detail or unavailable state.
- [ ] Tests cover member with activity, member empty state, visitor state, backend error, and stale cache.

## Suggested ownership

- API owner: activity read model and router.
- Expo owner: adapter, view model, route wiring.

