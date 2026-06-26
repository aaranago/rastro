# Admin dashboard overhaul

Status: needs-triage
Labels: needs-triage
Owner: Unassigned

## Problem

The Next.js admin side currently does not match the product docs or the quality bar for an operational dashboard.

The product docs say the Next.js app must support admin moderation, settings, user management, sponsor/resource-provider management, verification badges, abuse/content metrics, hide/restore, and ban/unban workflows. The implementation reality is narrower:

- `/admin/proveedores` is DB-backed, but the UI is a cramped raw CRUD page with clipped controls, one-page form overload, weak accessibility, and data-integrity traps.
- `/admin/moderacion` exists, but it is still backed by an in-memory fixture model.
- There is no `/admin` landing page or shared admin layout.
- Settings, members/users, moderation persistence, audit logs, and public web consistency are not yet real admin CRUD surfaces.
- The repo has a shadcn-style shared UI package under `packages/ui`, but the admin pages bypass it and hand-roll cards, tables, badges, forms, switches, and focus states.

## Product scope

Build a real admin app area in Next.js that supports:

- A shared `/admin` shell with navigation, identity, route-level access states, overview cards, and operational shortcuts.
- Resource Provider CRUD through focused create/edit/verify/sponsor/archive workflows.
- Local Sponsor Placement management that keeps sponsor policy explicit and unable to affect recovery priority or push notifications.
- Persisted admin settings for Review Mode and verified-email publish gating.
- Persisted moderation review items created by user reports, including Resource Provider reports.
- Report/listing hide/restore workflows.
- Member management with persisted suspension/unsuspension and publish-path enforcement.
- Metrics and admin audit history.
- Public web pages that read the same persisted report data used by the app/API.

## Current evidence

- Admin routes only include `/admin/moderacion` and `/admin/proveedores`; there is no `/admin` index or shared admin layout.
- Resource Provider backend CRUD exists in `packages/api/src/router/resources.ts` and `packages/api/src/resource-provider-repository.ts`.
- Resource Provider tables exist in `packages/db/src/schema.ts`.
- Moderation page instantiates `createInMemoryAdminModerationDashboard()` in `apps/nextjs/src/app/admin/moderacion/page.tsx`.
- Admin access is an env allowlist via `RASTRO_ADMIN_EMAILS`, not a persisted role/permission model.
- `packages/ui/components.json` uses the shadcn schema, and `packages/ui/src` already exports some primitives, but admin screens do not consistently use them.

## Target information architecture

- `/admin`: overview dashboard, active queues, settings health, recent admin actions, shortcut cards.
- `/admin/moderacion`: unified review queue with filters by target type, reason, city/department, and risk.
- `/admin/moderacion/:reviewItemId`: review detail, evidence, actions, notes, and history.
- `/admin/proveedores`: Resource Provider list and CRUD workflows.
- `/admin/patrocinios`: Local Sponsor Placement management.
- `/admin/miembros`: member search, safety profile, suspension state, and related content.
- `/admin/ajustes`: Review Mode, verified-email requirement, report reasons, and operational settings.
- `/admin/metricas`: abuse/content/resource metrics by city and department.
- `/admin/auditoria`: immutable admin action log.

## Design and UX principles

- Operational admin surfaces are work tools, not marketing pages.
- The default view must be read-first and scan-friendly.
- Create/edit/destructive actions happen in focused dialogs, drawers, or detail routes, not as every form always visible on one page.
- Use `@acme/ui` shadcn-style primitives for focus, error, table, form, badge, alert, and state semantics.
- Spanish-first `es-BO` copy must use correct accents and domain language.
- Mobile must be usable without horizontal scroll, but the primary optimization target is efficient desktop admin operation.
- Every workflow must have loading, empty, success, validation, and failure states.
- Each implementation slice must include Playwright visual verification for desktop and mobile viewports.

## Global definition of done

- [ ] No production admin flow depends on in-memory fixture state unless explicitly marked as prototype/test-only.
- [ ] No admin route clips controls at 1280, 1440, or 1600px desktop widths.
- [ ] No admin route has horizontal document overflow at 320 or 390px mobile widths.
- [ ] Admin actions produce specific success/error/validation feedback.
- [ ] Destructive actions require confirmation.
- [ ] Forms preserve existing data when only one field changes.
- [ ] `@acme/ui` primitives or equivalent shadcn-derived wrappers are used for controls.
- [ ] Playwright evidence is captured for desktop, mobile, dark mode where relevant, and important error states.
- [ ] Relevant package lint, typecheck, tests, and Fallow audit pass.
- [ ] If Expo is touched, verify through the full `pnpm dev` stack and mobile MCP, not Expo-only.

## Proposed issue wave

1. `ADMIN-001`: Admin shell, navigation, and shadcn primitive foundation.
2. `ADMIN-002`: Provider list layout rescue and read-first queue.
3. `ADMIN-003`: Provider data contract cleanup for city/department, location, links, and multiple contacts.
4. `ADMIN-004`: Focused provider CRUD workflows with dialogs/drawers and archive confirmation.
5. `ADMIN-005`: Standalone Local Sponsor Placement management.
6. `ADMIN-006`: Persisted admin settings and publish gates.
7. `ADMIN-007`: Persisted moderation queue and Resource Provider report ingestion.
8. `ADMIN-008`: Persisted hide/restore moderation for reports and listings.
9. `ADMIN-009`: Member management and persisted suspension enforcement.
10. `ADMIN-010`: Admin metrics and audit log.
11. `ADMIN-011`: Replace public web fixture pages with persisted report data.
12. `ADMIN-012`: Admin visual QA hardening and scale-state polish.

## Approval questions

- Is this granularity right, or should Provider CRUD be split even further?
- Should admin roles remain env-allowlist for v1, or should persisted admin roles be pulled forward into this wave?
- Should sponsor billing/customer management stay out of scope for v1, with only Local Sponsor Placement CRUD included?
- Should public web fixture replacement be part of this admin wave or a separate public-sharing wave?
