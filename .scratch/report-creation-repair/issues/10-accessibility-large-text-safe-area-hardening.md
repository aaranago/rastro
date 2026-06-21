# RC-011 Accessibility, large-text, keyboard, and safe-area hardening

Status: ready-for-agent
Labels: ready-for-agent
Severity: P1
Issue ID: RC-011
Type: AFK
Owner: Agent RC-011, must invoke `$tdd`
Verifier: Verifier RC-011-V

## Parent

`.scratch/report-creation-repair/PRD.md`

## Report type, step, route, and entry point

- Report types: lost, found, sighting, adoption
- Steps: chooser, photos, details, location, contact, review, submit, success/error
- Routes: repaired creation stack routes and chooser modal/sheet
- Entry points: all report-type chooser entry points

## Reproduction

1. Inspect current chooser and creation screens with Android accessibility tree.
2. Increase font scale.
3. Open keyboard on low fields.
4. Inspect image controls and progress labels.

## Expected

- Touch targets meet platform minimums.
- Controls expose labels, roles, selected/busy/disabled/error values, and useful hints.
- Focus order is logical and restored after sheets/dialogs/crop editors.
- Progress/error announcements are meaningful but not noisy.
- Layout remains usable with large Spanish labels/errors.
- Safe areas and keyboard do not cover content/actions.

## Actual

- Progress has no accessible current/completed/upcoming state.
- Photo action labels are generic.
- Modal/header/footer safe-area behavior is inconsistent.
- Screen-reader and largest font-scale verification has not passed.

## User impact

Users relying on assistive technology, large text, or gesture navigation can be blocked from creating reports.

## Evidence

- UI XML in `.scratch/mobile-qa/20260621-130941/ui/`
- Screenshots in `.scratch/mobile-qa/20260621-130941/screenshots/`
- Code: shared progress/photo components in `report-creation-ui.tsx`

## Root cause

Confirmed for several components and unverified elsewhere. Accessibility was not modeled as part of the creation state/control lifecycle.

## What to build

Harden the repaired creation flow against accessibility, large text, keyboard, and safe-area failures. This is a verification-and-polish slice after the structural P0/P1 work lands.

## Acceptance criteria

- [ ] Chooser close/back/actions expose distinct labels and roles.
- [ ] Step progress exposes "Paso X de Y", current/completed/upcoming, and does not rely on color alone.
- [ ] Image actions identify photo number/order/primary/upload state, for example "Foto 1, principal, subida".
- [ ] Buttons expose busy/disabled states while loading.
- [ ] Validation errors are associated with fields and announced after attempted continuation/submission.
- [ ] Focus/scroll moves to first invalid field.
- [ ] Largest supported font scale does not clip or overlap content/actions.
- [ ] Smallest supported viewport remains usable.
- [ ] Keyboard does not cover focused fields or primary actions.
- [ ] Status bar, cutout, bottom tabs, home indicator, and gesture insets are respected.
- [ ] Reduced motion preference is respected where motion is used.
- [ ] Manual screen-reader pass is recorded with evidence.

## Required automated tests

- Component tests for labels/roles/states.
- Component tests for progress accessible value.
- Tests for error summary and first invalid field behavior.
- Regression tests for large text copy where practical.

## Required manual verification

- Android emulator with TalkBack or equivalent screen-reader pass.
- Largest font scale.
- Smallest phone viewport.
- Keyboard open on every text step.
- Gesture navigation safe areas.
- Capture screenshots/evidence.

## Likely files and shared components

- Shared report creation UI/layout components
- Report-type chooser
- Image manager/crop editor
- Creation routes and footers
- Type-specific fields

## Backend, database, navigation, or storage implications

- None expected beyond existing route/media dependencies.

## Dependencies and regression surfaces

- Blocked by: RC-002, RC-004, RC-005, RC-007.
- Regression surfaces: every report creation state and shared sheet/modal components.

## Non-goals

- New product fields.
- Backend storage changes.

## Comments
