# App States

## Purpose

Define reusable app states that designers and developers should apply consistently across the mobile app and web dashboard.

## Primary Users

- Visitor
- Member
- Caretaker
- Admin

## Required Screens

- Loading skeletons.
- Empty states.
- Error states.
- Permission education states.
- Permission denied states.
- Offline/stale states.
- Retry states.
- Blocked member/conversation state.
- Reported content state.
- Banned/suspended member state.
- Maintenance state.

## Required Data

- User state.
- Permission state.
- Connectivity state.
- Retry/action state.
- Content type affected.

## Primary Actions

- Retry.
- Open settings.
- Use manual search.
- Sign in.
- Contact support/report issue where relevant.
- Return to safe screen.

## Navigation

- These states are embedded in every major feature surface and should not require a separate drawer or help section.

## UX Requirements

- Spanish text must be short enough for compact phones.
- Empty states should offer one clear next action.
- Permission-denied states should offer manual alternatives when possible.
- Offline states should mark stale content clearly.
- Error states should avoid blame and preserve user work.
- Destructive or safety-sensitive states need confirmation.

## Required States

- App-wide loading.
- List loading.
- Detail loading.
- Empty location area.
- Empty `Mis mascotas`.
- Empty `Actividad`.
- Empty `Recursos`.
- Location denied.
- Notifications denied.
- Photos/camera denied.
- Offline draft preserved.
- Upload retry.
- Blocked.
- Reported.
- Banned/suspended.
- Maintenance.

## Mock Drop Location

Place generated images in `docs/screens/13-app-states/mocks/`.
