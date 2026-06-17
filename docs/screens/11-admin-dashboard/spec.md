# Admin Dashboard

## Purpose

Define the Next.js web dashboard for moderation, abuse response, verification badges, resource-provider management, and sponsor management.

## Primary Users

- Admin

## Required Screens

- Admin dashboard overview.
- Flagged content queue.
- Flagged chat/conversation review.
- Member moderation detail.
- Review Mode settings.
- Verified-email publishing toggle.
- Verification Badge review.
- Resource Provider management.
- Local Sponsor Placement management.
- Abuse/content metrics by city or department.

## Required Data

- Admin session and role.
- Flagged reports/listings/chats/providers.
- Report reasons.
- Member moderation state.
- Review Mode setting.
- Verified-email publishing setting.
- Resource Provider records.
- Sponsor Placement records.
- Basic metrics grouped by city/department.

## Primary Actions

- Hide or restore content.
- Ban or unban a member.
- Toggle Review Mode for adoption listings.
- Toggle verified email required to publish.
- Grant/revoke Verification Badge.
- Create/edit/deactivate Resource Provider profile.
- Create/edit/schedule/deactivate Sponsor Placement.

## Navigation

- Entry: Next.js admin route.
- Exit: specific report/listing/provider pages, audit/review queues, settings.

## UX Requirements

- Dashboard should be dense, table/form-oriented, and web-first.
- Non-admins must not see admin surfaces.
- Sponsor management must prevent paid recovery ranking and sponsor push notifications.
- Review actions should show enough context to make safe decisions quickly.

## Required States

- Unauthorized.
- Loading.
- Empty queues.
- Filtered queues.
- Action success/failure.
- Confirmation for destructive actions.

## Mock Drop Location

Place generated images in `docs/screens/11-admin-dashboard/mocks/`.
