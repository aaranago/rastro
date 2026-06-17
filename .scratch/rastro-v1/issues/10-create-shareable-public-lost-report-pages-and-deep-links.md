# Create shareable public Lost Pet Report pages and deep links

Status: ready-for-agent
Type: AFK

## Parent

`.scratch/rastro-v1/PRD.md`

## What to build

Give each public Lost Pet Report a shareable web URL and app deep link. A recipient should be able to open the installed app or view a lightweight public web page with enough report information to help.

## Acceptance criteria

- [ ] Every public Lost Pet Report has a stable share URL.
- [ ] The mobile app can share the report through the native share sheet.
- [ ] Shared links open the app when installed and otherwise render a public Next.js page.
- [ ] The public page shows photos, approximate location, selected contact options, and app open/download prompts.
- [ ] The public page does not expose exact location unless the caretaker opted in.
- [ ] Spanish-first social/share metadata is present.

## Blocked by

- `.scratch/rastro-v1/issues/08-publish-lost-pet-report-end-to-end.md`

## Context

Use the public web requirements in `docs/product/prd.md`.
