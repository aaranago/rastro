# Build Rastro app shell, branding, Spanish labels, and navigation

Status: complete
Type: AFK

## Parent

`.scratch/rastro-v1/PRD.md`

## What to build

Replace the starter UI with a polished Rastro mobile shell: splash/app icon identity, four bottom tabs, a global report FAB, Spanish compact labels, and signed-out/signed-in shell states. This slice should make the app feel like Rastro even before real domain data is connected.

## Acceptance criteria

- [x] The mobile app opens to a Rastro-branded shell, not the T3 starter post demo.
- [x] Bottom tabs are `Cerca`, `Actividad`, `Recursos`, and `Perfil`.
- [x] A global report FAB opens actions for `Reportar perdida`, `Reportar encontrada`, `Reportar avistamiento`, and `Dar en adopcion`.
- [x] No primary hamburger drawer is used.
- [x] Spanish labels fit compact mobile controls and use consistent icons for lost, found, sighting, and adoption.
- [x] The implementation includes basic signed-out and signed-in visual states without blocking visitor browsing.

## Blocked by

- `.scratch/rastro-v1/issues/01-create-screen-spec-workspace-and-design-handoff-rules.md`

## Context

Use `docs/product/ui-design-brief.md` as the UI source of truth.
