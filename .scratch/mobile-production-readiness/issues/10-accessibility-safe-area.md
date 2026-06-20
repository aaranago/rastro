# 10 - Fix accessibility, safe-area, and control-target defects

Status: ready-for-agent
Severity: P2
Journey: Browse, report sheet, creation forms, and details
Screens: Shared controls, `Cerca`, creation modals, report sheet

## Problem

Several visible controls are obscured, below minimum touch target size, missing robust accessibility semantics, or affected by safe-area/dynamic-type failures.

## Reproduction

1. Run on the Android emulator at the smallest supported viewport.
2. Open `Cerca` no-location and map/list states.
3. Open `Reportar` sheet.
4. Start a sighting creation form.
5. Increase font scale and inspect controls, validation, and close buttons.

## Expected

All controls remain visible, tappable, accessible, and understandable with screen readers, large text, safe areas, keyboard, and system bars.

## Actual

The global FAB overlaps browse content, some controls are under 48 dp, form content risks status bar/keyboard overlap, error text is not semantically connected to fields, and sheet focus semantics are weak.

## Impact

Users with assistive technology or larger text can miss primary controls, validation, and map/list actions.

## Evidence

- `.scratch/mobile-qa/20260619-195333/screenshots/04-nearby-initial.png`
- `.scratch/mobile-qa/20260619-195333/screenshots/06-nearby-map-zona-sur.png`
- `.scratch/mobile-qa/20260619-195333/screenshots/09-report-sheet.png`
- `.scratch/mobile-qa/20260619-195333/screenshots/12-sighting-photo-section.png`
- `apps/expo/src/features/shell/shell-overlays.tsx:672`
- `apps/expo/src/features/shell/shell-overlays.tsx:1345`
- `apps/expo/src/features/nearby/nearby-screen.tsx:1218`
- `apps/expo/src/features/nearby/nearby-screen.tsx:1260`
- `apps/expo/src/features/report-creation/report-creation-ui.tsx:222`
- `apps/expo/src/features/report-creation/report-creation-ui.tsx:358`
- `apps/expo/src/features/sighting-report-creation/sighting-report-creation-screen.tsx:722`

## Root Cause

Confirmed. Shared layout and controls were not built with safe-area/FAB collision, dynamic type, and screen-reader semantics as hard constraints.

## Acceptance Criteria

- No primary action, map attribution, marker preview, manual-location action, or card action is obscured by FAB, tabs, safe areas, or keyboard.
- Interactive targets meet at least 48 x 48 dp.
- Dialogs expose names, roles, focus entry, backdrop accessibility hiding, and focus restoration.
- Form inputs expose labels, required/invalid state, values, and associated error messages.
- Validation errors are announced and focus/scroll moves to the first invalid field.
- Option buttons expose selected state.
- Photo controls include index/status-specific labels and upload/error announcements.
- Long Spanish strings and largest supported font scale do not clip essential text.
- Reduced motion is respected where motion exists.

## Required Automated Tests

- Accessibility queries for report sheet dialog/action labels.
- Component tests for form invalid-state semantics.
- Layout tests or snapshots for smallest viewport and large font scale where practical.
- Tests for 48 dp target style constants on shared controls.

## Required Manual Verification

- Android TalkBack walkthrough of report sheet and creation form.
- Dynamic text max scale walkthrough.
- Keyboard open/close on creation fields.
- Smallest viewport map/list browse.

## Affected Files

- `apps/expo/src/features/shell/shell-overlays.tsx`
- `apps/expo/src/features/nearby/nearby-screen.tsx`
- `apps/expo/src/features/report-creation/report-creation-ui.tsx`
- `apps/expo/src/features/*-report-creation/*`
- Shared design token/control files

## Backend, Database, Map, or Storage Implications

None directly, but map accessibility completion intersects with issue 04.

## Dependencies

None for shared accessibility fixes. Some map-specific checks depend on issue 04.

## Regression Surfaces

- Visual layout of shell/FAB.
- Creation form snapshots.
- Navigation/modal behavior.

## Non-Goals

- Do not shrink text or touch targets to make layouts fit.
- Do not add decorative UI that hides unfinished flows.
