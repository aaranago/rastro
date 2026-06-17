# Create screen-spec workspace and design handoff rules

Status: complete
Type: AFK

## Parent

`.scratch/rastro-v1/PRD.md`

## What to build

Create the `docs/screens/` workspace where an agent UI designer can document each screen/flow and drop generated mock images into predictable directories. The output should let developers inspect target designs, understand Spanish mobile copy constraints, and implement screens while preserving the product decisions from the PRD.

## Acceptance criteria

- [x] `docs/screens/README.md` explains the handoff workflow, image naming conventions, viewport targets, and how developers should compare mocks against implementation.
- [x] Screen/flow folders exist for splash/app shell, nearby, report creation, pet profiles, report details, activity, chat, resources, provider profiles, profile/settings, admin dashboard, public web pages, and app states.
- [x] Each folder has a concise spec template covering purpose, user state, required data, primary actions, empty/error/loading states, and mock-image drop location.
- [x] The workspace explicitly supports designer-provided image files without requiring them to be committed in this issue.
- [x] The instructions call out Spanish-first compact mobile labels and the no-primary-drawer navigation decision.

## Blocked by

None - can start immediately.

## Context

Read `docs/product/prd.md`, `docs/product/ui-design-brief.md`, and `CONTEXT.md` before starting.
