# RC-003 Add backend-owned media upload sessions for S3/MinIO

Status: verified-runbook
Labels: verified-runbook
Severity: P0
Issue ID: RC-003
Type: AFK
Owner: Agent RC-003, must invoke `$tdd`
Verifier: Verifier RC-003-V

## Parent

`.scratch/report-creation-repair/PRD.md`

## Report type, step, route, and entry point

- Report types: lost, found, sighting with optional media, adoption
- Step: media upload and submit
- Routes: backend report/upload API, mobile creation upload client
- Entry points: all report creation paths that attach images

## Reproduction

1. Inspect backend validators and repository.
2. Submit/create media metadata with arbitrary object keys/URLs in tests.
3. Search for S3/MinIO configuration and upload endpoints.

## Expected

- Backend authorizes upload sessions.
- Mobile receives only short-lived upload instructions for a specific object.
- Backend validates ownership, metadata, and object existence before report association.
- Stable media IDs/object keys are persisted; expiring signed URLs are not canonical.
- Abandoned pending uploads are cleaned up.

## Actual

- `createReportInputSchema` accepts client media metadata directly.
- Repository inserts `ReportMedia` rows from client-supplied `objectKey` and optional `canonicalUrl`.
- No storage adapter, upload-session endpoint, pending media state, or cleanup job exists.
- `.env.example` has no storage configuration.

## User impact

Photo-required reports cannot be securely uploaded or verified. A malicious or broken client could reference arbitrary object keys/URLs. The app cannot recover from expired signed URLs or partial multi-image failure.

## Evidence

- Code: `packages/validators/src/index.ts` `reportMediaInputSchema`
- Code: `packages/api/src/report-repository.ts` direct `ReportMedia` insert
- Code: `packages/db/src/schema.ts` only `ready`/`removed` media status and no upload-session table
- Code/package deps: `packages/api/package.json` lacks an S3-compatible client
- `.env.example` lacks storage env vars

## Root cause

Confirmed. Media persistence was modeled as final report metadata, not a backend-owned upload lifecycle.

## What to build

Add a backend-owned object-storage abstraction and upload-session protocol compatible with AWS S3 and MinIO/Dokploy. Keep long-lived credentials on the backend only.

## Acceptance criteria

- [ ] Backend config supports bucket, region, internal endpoint, public/presign endpoint, access key, secret key, TLS, path-style, optional CDN/delivery base, presign expiration, max image size, and allowed MIME types.
- [ ] `.env.example` is updated with secret-free storage entries using repo conventions.
- [ ] DB migration supports pending media/upload sessions, ownership, expected metadata, expiry, and ready/failed/removed state.
- [ ] Protected endpoint creates upload sessions after validating auth, MIME, byte size, dimensions, checksum when supported, and draft/report context.
- [ ] Backend returns short-lived PUT/POST instructions, media ID, object key, required headers/fields, and expiration.
- [ ] Completion endpoint performs HEAD/stat verification and rejects mismatched metadata.
- [ ] Report submission references ready media IDs owned by the user, not arbitrary URLs.
- [ ] Expired authorization can be refreshed for the same pending media record.
- [ ] Cleanup job removes abandoned pending uploads and documented orphans.
- [ ] Docs cover Dokploy MinIO and AWS S3 production configuration.
- [ ] No storage credentials or signed query strings are logged or exposed to mobile.

## Required automated tests

- Unit tests for storage config parsing and redaction.
- Backend tests for authorized upload-session creation.
- Unauthorized/cross-user media rejection.
- Valid presigned upload to real test MinIO or equivalent S3-compatible test service.
- Rejected type, size, checksum, and metadata mismatch.
- Expired authorization refresh.
- Upload completion verification.
- Orphan cleanup.
- Report create rejects non-ready or cross-user media IDs.

## Required manual verification

- Configure a test MinIO reachable by emulator/device.
- Upload a real image through backend-issued instructions.
- Verify object key, content type, metadata, and private bucket behavior.
- Verify no secrets/signed URLs in logs.
- Verify same adapter can be configured for AWS-compatible settings.

## Likely files and shared components

- `packages/db/src/schema.ts`
- `packages/db/drizzle/*`
- `packages/api/src/router/*`
- `packages/api/src/report-repository.ts`
- New storage adapter module in `packages/api`
- `packages/validators/src/index.ts`
- `.env.example`
- `docs/dev/mobile-runbook.md`
- New storage deployment docs

## Backend, database, navigation, or storage implications

- Requires migration.
- Requires new backend dependencies.
- Requires Dokploy/MinIO and AWS S3 docs.
- Mobile app must never receive long-lived storage credentials.

## Dependencies and regression surfaces

- Blocked by: reachable test MinIO/S3 configuration for final integration verification.
- Regression surfaces: report create/update media handling, existing report detail/nearby media mapping.

## Non-goals

- Multipart upload unless measured file sizes require it.
- Public bucket access as a shortcut.
- Native picker/crop UI.

## Comments

### 2026-06-21 implementation checkpoint

- Added backend-owned upload-session contracts, S3/MinIO storage adapter, pending/ready/failed/removed media states, storage env docs, and test coverage.
- Added `uploadDraftId` and `uploadReportType` to `report_media`; report creation now accepts only ready media owned by the member for the same draft/idempotency key and report type.
- Completion now verifies object `Content-Type`, byte length, width, height, checksum when present, `mediaId`, and `sizeBytes` metadata before marking media ready.
- Added `/api/jobs/report-media-cleanup` as the server-side scheduled cleanup entrypoint protected by `RASTRO_JOB_SECRET`.
- Automated checks pass. Real MinIO/AWS integration tests remain gated by `RASTRO_STORAGE_INTEGRATION=1` and a reachable disposable bucket.

### 2026-06-22 verification checkpoint

- Fresh Verifier RC-003-V returned no findings after the failed-upload cleanup fix.
- Runbook-backed storage verification passed with the deployed MinIO/S3 env: `pnpm dotenv -e .env -- env RASTRO_STORAGE_INTEGRATION=1 pnpm -F @acme/api test -- src/media-storage.integration.test.ts` passed with 5 files passed, 1 skipped; 25 tests passed, 2 skipped.
- Database integration passed: `pnpm dotenv -e .env -- env RASTRO_DB_INTEGRATION=1 pnpm -F @acme/api test -- src/report-repository.integration.test.ts` passed with 5 files passed, 1 skipped; 26 tests passed, 1 skipped.
- Cleanup entrypoint and type safety passed: `pnpm -F @acme/nextjs test -- src/app/api/jobs/report-media-cleanup/route.test.ts`, `pnpm -F @acme/api exec tsc --noEmit --pretty false`, and `pnpm -F @acme/nextjs exec tsc --noEmit --pretty false`.
