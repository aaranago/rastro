# Rastro Mock Design System

This design system governs generated screen mocks under `docs/screens/**/mocks/`. It exists so designer and implementation agents do not create a different visual language for every screen.

## Visual Tone

Rastro should feel modern, local, trustworthy, and fast in an emergency. Final mocks should keep the strong mobile composition from `.scratch/ui-draft`: full-width image/map areas, sticky alert surfaces, bento-style cards, bottom sheets, and dense but readable task flows. Avoid toy-like saturation, random geometry, generic ad-app styling, and low-fidelity wireframe treatment.

## Viewports

- Mobile primary: 390 x 844.
- Android compact check: 360 x 800.
- Desktop dashboard: 1440 x 900.
- Public web mobile: 390 x 844.

## Color Tokens

- Background: `#F7F9F6`
- Surface: `#FFFFFF`
- Surface muted: `#EEF3EE`
- Text: `#17201C`
- Text muted: `#66736D`
- Border: `#DCE4DE`
- Primary: `#146C5A`
- Primary dark: `#0E5145`
- Lost / urgent: `#D6453D`
- Found / success: `#1D7A52`
- Sighting / attention: `#2E6D9E`
- Adoption: `#9D4F66`
- Resource: `#4E6F7A`
- Sponsor background: `#FFF4C7`
- Sponsor text: `#705A16`
- Warning background: `#FFF4E8`
- Danger background: `#FDECEC`

## Typography

- Font family: system UI stack.
- Large title: 28px / 34px, 700.
- Screen title: 22px / 28px, 700.
- Section title: 16px / 22px, 700.
- Body: 15px / 22px, 400.
- Caption: 12px / 16px, 600.
- Tab label: 11px / 14px, 600.

Do not scale font size with viewport width. Spanish labels must fit on compact Android screens. V1 mocks must use Spanish text and Bolivia-first sample places only.

## Shape And Spacing

- Hero/map cards: 24px to 32px radius.
- Content cards: 16px to 24px radius, consistent within a screen family.
- Buttons: 999px radius for primary mobile CTAs, 16px to 24px for secondary action cards.
- Inputs: 16px to 24px radius.
- Chips: 999px radius only for compact filters/status labels.
- Mobile page padding: 16px to 24px depending on density.
- Card padding: 14px to 20px.
- Section gap: 14px to 24px.
- Icon button: 44 x 44 minimum.
- Bottom nav height: 86px including safe-area padding.
- Global FAB: 60 x 60 circular, fixed above bottom nav.
- Scrollable tab screens must reserve bottom inset for both the bottom nav and FAB so the FAB never blocks primary row actions.

## Navigation

- Mobile bottom tabs are always `Cerca`, `Actividad`, `Recursos`, `Perfil`.
- The global FAB opens creation actions and uses one stable position.
- No primary hamburger drawer.
- Use bottom sheets for filters, FAB actions, contact actions, and report/block actions.
- Nearby browsing should be map-first or list-with-map-context, never a generic flat list as the main default.

## Category Treatment

- Lost: urgent coral accent, alert/help icon.
- Found: green accent, paw/check icon.
- Sighting: blue accent, eye/map-pin icon.
- Adoption: rose accent, heart/home icon.
- Resource: muted blue/teal accent.
- Sponsor: yellow chip with explicit `Patrocinado` label.

## Location Treatment

- Default copy: `Zona aproximada`.
- Exact public location appears only when explicitly opted in.
- Map mocks should show approximate circles or location cells more prominently than exact pins.

## Sponsor Treatment

Sponsor placements must be visually secondary to recovery content. They may appear in resources or contextual care surfaces, but never as recovery ranking or push-notification content.

## Mock Quality Rules

- Keep the same header, tab bar, FAB, card width, and icon positions across mobile mocks.
- Avoid clipping horizontal chips.
- Avoid text inside controls that cannot fit on 360px-wide Android screens.
- Reuse the draft compositions where they are strong, but normalize color, copy, sample locations, viewports, and navigation.
- Prefer dense but breathable operational layouts for admin screens.
- Public web pages should be lightweight and share-focused, not marketing landing pages.
- Do not use sample locations outside Bolivia in final mocks.
