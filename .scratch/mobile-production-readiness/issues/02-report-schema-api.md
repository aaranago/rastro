# 02 - Add persisted report schema and API

Status: closed
Severity: P1
Journey: Report creation, nearby browsing, report details, and lifecycle
Screens: All report surfaces

## Problem

The product has no persisted report source of truth. The database contains starter auth and `Post` schema, while the API root exposes only `auth` and `post`.

## Reproduction

1. Inspect `packages/db/src/schema.ts`.
2. Inspect `packages/api/src/root.ts`.
3. Attempt to find routers or tables for lost, found, sighting, adoption, report media, report status, report location, or lifecycle actions.

## Expected

Reports, media, location, ownership, lifecycle state, and idempotency are represented in the database and exposed through authenticated backend procedures.

## Actual

No report schema or report router exists. Mobile journeys are backed by in-memory repositories and static fixtures.

## Impact

Critical journeys cannot be completed end to end. Reports cannot survive restart, appear in nearby queries, enforce ownership, or reload media.

## Evidence

- `packages/db/src/schema.ts:6`
- `packages/api/src/root.ts:5`
- `apps/expo/src/features/lost-reports/lost-reports.ts:303`
- `apps/expo/src/features/lost-reports/lost-reports.ts:375`
- `apps/expo/src/features/sighting-reports/*`
- `apps/expo/src/features/found-reports/*`
- `apps/expo/src/features/adoption-listings/*`

## Root Cause

Confirmed. Product report persistence has not been implemented server-side.

## Acceptance Criteria

- Database migrations define report, report media, report location, report lifecycle/status, ownership, and idempotency data.
- Geospatial location storage supports PostGIS radius queries and future viewport queries.
- Public location exposure distinguishes exact internal coordinates from approximate public location.
- API procedures support create, read detail, browse nearby, update, resolve, delete where authorized.
- Server-side authorization prevents one user from modifying or deleting another user's report.
- Duplicate submissions with the same idempotency key return the same persisted report.
- Backend errors are safe and do not expose stack traces, credentials, signed URLs, or private contact data.
- A clean test database can apply migrations.

## Required Automated Tests

- Database schema/migration tests for clean setup.
- API tests for create/detail/nearby/update/resolve/delete.
- Authorization tests for cross-user mutation rejection.
- Idempotency tests for duplicate create retries.
- Geospatial query tests for radius filtering.

## Required Manual Verification

- Apply migrations to a clean local test database.
- Create a report through the API and refetch it by ID.
- Query nearby by radius and verify only matching coordinates return.
- Attempt unauthorized edit/delete as another user and confirm rejection.

## Affected Files

- `packages/db/src/schema.ts`
- `packages/db/drizzle/*`
- `packages/api/src/root.ts`
- `packages/api/src/router/*`
- `packages/validators/*`
- `apps/nextjs/src/app/api/trpc/[trpc]/route.ts`

## Backend, Database, Map, or Storage Implications

Requires database migrations and PostGIS-capable queries. Media references should integrate with issue 06.

## Dependencies

Requires product decisions for required fields per report type if existing validators are incomplete.

## Regression Surfaces

- Auth/session behavior.
- Existing starter post router tests.
- Next.js server build and DB env handling.

## Non-Goals

- Do not implement mobile UI changes here except generated client type integration needed for tests.
- Do not add synthetic production report fixtures.

## Resolution

Implemented and independently verified.

- Added report, report location, report media, and report lifecycle schema with ownership, idempotency, PostGIS coordinates, public/exact location separation, media lifecycle state, and ready-only media display-position uniqueness.
- Added clean Drizzle migration path under `packages/db/drizzle/`, including `postgis` and `pgcrypto` setup.
- Added report validators and tRPC procedures for create, detail, nearby, update, resolve, and delete.
- Added server-side ownership checks for update, resolve, and delete.
- Added duplicate-create recovery with database `ON CONFLICT DO NOTHING` on caretaker/idempotency key.
- Added unit tests and an opt-in database integration test that creates a temporary database, applies migrations, exercises create/refetch/nearby/media replacement/resolve/delete, and drops the database.

Verification agent: `019ee2b9-4120-7361-b930-1dd2f1ec51e2`.

Verified commands:

- `pnpm -F @acme/db test`
- `pnpm -F @acme/api test`
- `pnpm -F @acme/validators test`
- `pnpm -F @acme/db typecheck && pnpm -F @acme/db lint`
- `pnpm -F @acme/api typecheck && pnpm -F @acme/api lint`
- `pnpm -F @acme/validators typecheck && pnpm -F @acme/validators lint`
- `pnpm exec dotenv -e .env -- bash -lc 'RASTRO_DB_INTEGRATION=1 pnpm -F @acme/api exec vitest run src/report-repository.integration.test.ts'`

Known residual risk: there is no dedicated transport-level test for arbitrary unhandled database error redaction. Public report responses avoid exact private coordinates, caretaker IDs, and private phone numbers, and auth/not-found paths use `TRPCError`.
