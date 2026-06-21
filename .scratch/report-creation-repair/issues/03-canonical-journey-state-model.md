# RC-004 Introduce one canonical report-creation journey state model

Status: ready-for-agent
Labels: ready-for-agent
Severity: P1
Issue ID: RC-004
Type: AFK
Owner: Agent RC-004, must invoke `$tdd`
Verifier: Verifier RC-004-V

## Parent

`.scratch/report-creation-repair/PRD.md`

## Report type, step, route, and entry point

- Report types: lost, found, sighting, adoption
- Steps: chooseType, photos, details, location, contact, review, submitting, success, adapted by report type
- Current route: type-specific modal screens
- Entry points: chooser selection from shell FAB

## Reproduction

1. Open lost, found, sighting, and adoption creation flows.
2. Compare visible content with progress labels.
3. Observe validation on first view.
4. For adoption, inspect which steps are displayed.

## Expected

- Exactly one step is current.
- Completed, current, and upcoming steps are visually and accessibly distinct.
- Screen content, header, progress label, and available actions agree.
- Forward navigation validates only fields required to leave the current step.
- Validation errors do not appear before blur, attempted continue, or submit.
- Restored invalid state is repaired deterministically.

## Actual

- Multiple steps can appear prominent at once.
- Progress is based on independent `isComplete` booleans.
- `ReportCreationProgressSteps` truncates to four steps.
- All form sections render in one scroll view.
- Validation errors render on initial mount.

## User impact

Users cannot reliably tell where they are, what is required now, or why errors are visible before they act. This breaks the core report-creation journey.

## Evidence

- Screenshot: `.scratch/mobile-qa/20260621-130941/screenshots/04-lost-creation.png`
- Screenshot: `.scratch/mobile-qa/20260621-130941/screenshots/05-found-creation.png`
- Screenshot: `.scratch/mobile-qa/20260621-130941/screenshots/07-adoption-creation.png`
- Code: `apps/expo/src/features/report-creation/report-creation-ui.tsx` `ReportCreationProgressSteps`
- Code: type-specific `buildSteps` functions in creation view models

## Root cause

Confirmed. The flow has no canonical journey state and no single source of truth for current step. Completion flags are derived independently and then styled like active/current state.

## What to build

Introduce an explicit report-creation journey model shared by all report types. It should own current step, completed steps, prerequisite checks, valid transitions, restoration repair, and validation display timing.

## Acceptance criteria

- [ ] Every valid state has exactly one current step.
- [ ] Progress UI has textual "Paso X de Y" and a non-color-only completed treatment.
- [ ] Upcoming steps are visibly inactive and not directly selectable unless prerequisites are met.
- [ ] Visible content, header, progress text, and footer action agree with current step.
- [ ] No required validation errors are visible on initial step mount.
- [ ] Continue validates only the current step and focuses/scrolls to first invalid field.
- [ ] Backward navigation preserves valid data.
- [ ] Restored stale/invalid journey state is repaired to the earliest incomplete valid step.
- [ ] Type-specific forms show only relevant fields.

## Required automated tests

- Unit tests for step transitions for all report types.
- Unit tests asserting one current step for every valid state.
- Draft restoration repair tests.
- Component tests for no initial validation flood.
- Component tests for failed Continue error summary/focus behavior.

## Required manual verification

- Inspect each report type on the emulator.
- Navigate forward/backward through each step.
- Verify largest font scale and smallest viewport progress header.
- Capture before/after screenshots for lost/found/sighting/adoption.

## Likely files and shared components

- `apps/expo/src/features/report-creation/*`
- `apps/expo/src/features/lost-report-creation/*`
- `apps/expo/src/features/found-report-creation/*`
- `apps/expo/src/features/sighting-report-creation/*`
- `apps/expo/src/features/adoption-listing-creation/*`
- Draft tests under `apps/expo/src/features/resilience/*`

## Backend, database, navigation, or storage implications

- No database migration expected.
- The model must support later stack navigation and upload state integration.

## Dependencies and regression surfaces

- Blocked by: RC-001 if using the finalized submit contract.
- Regression surfaces: creation tests, draft serialization, publish button enablement, review summaries.

## Non-goals

- Native image picker/crop implementation.
- S3/MinIO upload sessions.
- Stack route migration, except model APIs should support it.

## Comments
