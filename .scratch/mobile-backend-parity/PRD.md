# Rastro mobile backend parity

Status: ready-for-agent
Labels: ready-for-agent
Owner: Unassigned

## Problem

The backend and Next.js admin app now own Resource Provider data, Local Sponsor Placement policy, admin publish settings, moderation visibility, and media readiness. The Expo app still has places where it renders partial public contracts, treats sponsor data too broadly, collapses backend publish states into generic copy, or risks local-only behavior after a backend-managed action.

Mobile must behave as the public member-facing surface for backend and admin-managed behavior. It should consume the existing public contracts instead of rebuilding parallel local behavior. Copy and defaults remain Spanish-first and Bolivia-first.

## Product direction

Use the backend and admin app as the source of truth for:

- Resource Provider directory and profile data.
- Local Sponsor Placement surfaces, media, disclosure, and safety policy.
- Verified-email publish requirements and Review Mode outcomes.
- Public report visibility after moderation.
- Report media readiness and backend-confirmed publish semantics.

The Expo app should keep fixture adapters only as tests or local fallback boundaries. Production paths must be API-backed and tested.

## Scope

- Recursos directory and Resource Provider profiles render public backend fields with production mobile UI.
- Patrocinios render only on eligible Local Sponsor Placement surfaces.
- Report-success provider reporting uses the backend moderation mutation, not a static adapter.
- Report creation adds a final confirmation step before backend publish.
- Mobile publish UX reflects backend preconditions and Review Mode outcomes.
- Public report detail and nearby discovery honor hidden, false-marked, deleted, pending-review, and unavailable states.
- Provider, sponsor, and report media behavior is resilient to null, pending, failed, or broken media.
- Final verification includes automated tests plus MCP-assisted emulator e2e evidence from the root full-stack dev command.

## Out of scope

- Reading admin-only routes from mobile.
- Exposing private or exact Resource Provider coordinates.
- Sponsor billing, paid ranking, recovery-priority changes, or push notification eligibility for sponsors.
- Replacing Better Auth, PostGIS, or app-owned chat decisions.
- Deleting code solely because Fallow reports it as unused.

## Source of truth

Implementation agents should refresh these contracts before editing:

- Shared validators for Resource Provider categories, sponsor surfaces, provider reports, report creation, and media readiness.
- API routers and repositories for resources, reports, admin settings, provider moderation, and media.
- Next.js admin settings and moderation behavior for publish gates and visibility.
- Existing Expo Recursos, report creation, adoption creation, nearby, and public report detail adapters and view models.

Do not expose private fields by default. Public mobile UI may show Approximate Location and public delivery URLs only.

## Definition of done

- Resource Provider cards and profiles use backend public contracts and do not rely on full local provider arrays in production paths.
- Local Sponsor Placement visibility honors `eligibleSurfaces` and never implies verification, recovery priority, report ranking, or push eligibility.
- Every report creation flow confirms before backend publish and preserves drafts until backend-confirmed success.
- Backend precondition failures and Review Mode outcomes produce specific member-facing mobile copy.
- Moderated or unavailable public reports are removed or shown as unavailable instead of being resurrected from cache.
- Provider and sponsor media URLs are optional and resilient; report publish uses ready report-media IDs only.
- Focused tests, lint, typecheck, Fallow audit, root full-stack dev smoke, and MCP-assisted emulator evidence are recorded in issue comments.
