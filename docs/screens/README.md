# Rastro Screen Specs

This directory is the handoff workspace between UI design agents and implementation agents. Each screen or flow has a `spec.md` that describes what the design must communicate, and a `mocks/` directory where generated screen images can be placed for developers to match and improve.

## Source Of Truth

Read these before creating or implementing screen mocks:

- `CONTEXT.md` for canonical domain language.
- `docs/product/prd.md` for v1 product scope.
- `docs/product/ui-design-brief.md` for mobile UX rules.
- `docs/adr/` for architecture decisions that affect screens.

## Directory Convention

Each screen folder follows this shape:

```text
docs/screens/<NN-flow-name>/
  spec.md
  mocks/
    .gitkeep
```

Designers should add generated images under the relevant `mocks/` folder. Developers should inspect those images before implementing the corresponding issue.

When generated HTML exists, place it under `mocks/html/`. That HTML is a visual reference for spacing, hierarchy, and states. It is not implementation code for Expo or Next.js.

## Image Naming

Use predictable file names:

```text
mobile-ios-390x844-<state>.png
mobile-android-360x800-<state>.png
mobile-android-412x915-<state>.png
web-desktop-1440x900-<state>.png
web-mobile-390x844-<state>.png
```

Examples:

```text
mobile-ios-390x844-empty-location-denied.png
mobile-android-360x800-create-lost-step-location.png
web-desktop-1440x900-admin-flagged-content.png
```

Use short lowercase state names with hyphens. If a mock is exploratory, prefix it with `concept-`.

Reference HTML should use the same state name without the viewport prefix:

```text
mocks/html/list-default.html
mocks/html/create-lost-details.html
```

## Viewport Targets

Mobile mocks should cover:

- iOS compact: 390 x 844
- Android compact: 360 x 800
- Android large: 412 x 915

Web mocks should cover:

- Desktop dashboard: 1440 x 900
- Mobile public web page: 390 x 844

## Design Rules

- Spanish is primary for v1.
- Use compact mobile labels on crowded controls: `Perdidas`, `Encontradas`, `Vistas`, `Adopcion`, `Cerca`, `Actividad`, `Recursos`, `Perfil`.
- Use fuller labels in titles, empty states, and creation flows.
- Final mocks should preserve the richer composition from `.scratch/ui-draft`: image-led details, map-first nearby browsing, sticky alerts, bottom sheets, dense but breathable cards, and mobile-native task focus.
- Do not use a primary hamburger drawer.
- Use bottom tabs plus a global report FAB in the mobile app.
- Use bottom sheets/action sheets for primary creation and filters.
- Make lost, found, sighting, and adoption visually distinct without turning the app into a marketplace.
- Keep recovery reports visually higher priority than sponsors.
- Public location defaults to approximate display. Exact public pins are opt-in only.
- Avoid UI that implies payments, pet buying, bidding, reward escrow, public comments, or generic ad feeds.

## Developer Comparison Workflow

When implementing a screen:

1. Read the matching `spec.md`.
2. Inspect every image in the matching `mocks/` directory.
3. Implement the screen with the repo's existing design system and platform patterns.
4. Compare iOS and Android screenshots against mocks at compact and large sizes.
5. Verify Spanish text fits without overlap, truncation, or cramped buttons.
6. Verify empty, loading, error, denied-permission, and offline states where the spec requires them.
7. If implementation must intentionally differ from the mock, document the reason in the implementation PR or issue comments.

## Flow Index

- `01-splash-app-shell`: splash, first usable app shell, bottom tabs, FAB.
- `02-nearby`: nearby browsing, radius/filter controls, sticky alert surface.
- `03-report-creation`: lost, found, sighting, adoption creation flows.
- `04-pet-profiles`: `Mis mascotas` and reusable Pet Profiles.
- `05-report-detail`: report/listing detail, contact options, share, lifecycle.
- `06-activity`: alerts, chats, updates, matches.
- `07-chat`: report-linked in-app chat.
- `08-resources`: resources directory and sponsor-safe resource surfaces.
- `09-provider-profiles`: Resource Provider details and Verification Badge display.
- `10-profile-settings`: `Perfil`, settings, account management, alert settings.
- `11-admin-dashboard`: Next.js admin/moderation/resource/sponsor dashboard.
- `12-public-web-pages`: public report/listing pages and app deep-link prompts.
- `13-app-states`: reusable loading, empty, error, denied, offline, blocked, reported, banned states.
