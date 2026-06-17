# Splash And App Shell

## Purpose

Establish Rastro's first impression and persistent mobile navigation. This flow covers the splash screen, first usable shell, bottom tabs, global report FAB, signed-out browsing posture, and signed-in shell differences.

## Primary Users

- Visitor
- Member

## Required Screens

- Splash screen with Rastro brand.
- First usable `Cerca` screen after splash.
- Signed-out shell.
- Signed-in shell.
- FAB action sheet.
- Sign-in prompt after a visitor taps a member-only FAB action.

## Required Data

- Session state: visitor or member.
- Basic alert count for sticky alert surface if available.
- Navigation labels and icons.

## Primary Actions

- Switch between `Cerca`, `Actividad`, `Recursos`, `Perfil`.
- Tap global report FAB.
- Pick `Reportar perdida`, `Reportar encontrada`, `Reportar avistamiento`, or `Dar en adopcion`.
- Sign in when a member-only action is selected.

## Navigation

- Entry: app launch.
- Exit: bottom tabs, FAB action sheet, auth prompt.
- No primary drawer.

## UX Requirements

- Use four bottom tabs: `Cerca`, `Actividad`, `Recursos`, `Perfil`.
- Use compact Spanish labels and recognizable icons.
- Use a global FAB visible on main tabs.
- The first usable screen should not be a marketing landing page.
- The shell must respect safe areas and avoid text overlap on compact phones.
- `Actividad` and `Perfil` can show signed-out prompts, but `Cerca` and `Recursos` should remain browseable.

## Required States

- Loading app resources.
- Visitor shell.
- Member shell.
- Auth prompt after protected action.
- Offline shell with stale cached data indicator.

## Mock Drop Location

Place generated images in `docs/screens/01-splash-app-shell/mocks/`.
