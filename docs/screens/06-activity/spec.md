# Activity

## Purpose

Make `Actividad` the member's recovery hub for alert history, chats, report updates, stale-report prompts, and match candidates.

## Primary Users

- Member
- Caretaker
- Visitor in signed-out state

## Required Screens

- Activity feed.
- Signed-out activity prompt.
- Alert history section.
- Chat conversations section.
- Report updates/status prompts.
- Match candidates placeholder/state.
- Empty activity state.

## Required Data

- Alert notifications.
- Chat conversation summaries.
- Owned report update events.
- Stale-report prompts.
- Candidate match summaries.

## Primary Actions

- Open alert target report.
- Open chat.
- Respond to report status prompt.
- Open candidate match.
- Manage alert subscription.

## Navigation

- Entry: bottom tab `Actividad`, push notification, report status prompt.
- Exit: report detail, chat, alert settings, lifecycle outcome sheet.

## UX Requirements

- Alerts are not their own bottom tab; urgent alerts surface in `Cerca`, history lives here.
- Signed-out users should understand why activity requires login.
- Keep feed scannable and not notification-spammy.
- Use clear status labels and timestamps.

## Required States

- Signed out.
- Empty feed.
- Loading.
- Error.
- Offline/stale.
- Unread chat.
- Stale report prompt.

## Mock Drop Location

Place generated images in `docs/screens/06-activity/mocks/`.
