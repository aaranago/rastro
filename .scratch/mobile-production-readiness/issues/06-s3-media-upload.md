# 06 - Implement S3-compatible media upload and delivery

Status: ready-for-agent
Severity: P1
Journey: Report creation photos and persisted report media
Screens: Creation flows, report detail, profile media

## Problem

Photo selection/upload is local-only. Creation flows append fixture `file://` URIs and profile media simulates processing by adding URI fragments.

## Reproduction

1. Start a sighting report.
2. Scroll to photos.
3. Tap the photo tile.
4. Observe a photo count increment without a native picker or upload progress.
5. Inspect media handling code.

## Expected

The app selects real device images, validates and prepares them, uploads via authenticated backend presigned URLs to S3-compatible storage, persists canonical media references, and reloads images from storage/CDN.

## Actual

The app inserts fixture/local URIs and never obtains upload authorization or stores canonical media.

## Impact

Reports cannot carry durable photos, media cannot survive clean refetch, and production paths can show placeholder/local files as if uploaded.

## Evidence

- `.scratch/mobile-qa/20260619-195333/screenshots/12-sighting-photo-section.png`
- `.scratch/mobile-qa/20260619-195333/screenshots/13-sighting-after-add-photo.png`
- `apps/expo/src/features/sighting-report-creation/sighting-report-creation-screen.tsx:119`
- `apps/expo/src/features/sighting-report-creation/sighting-report-creation-fixtures.ts:18`
- `apps/expo/src/features/pet-profiles/pet-profiles.ts:98`
- `.env.example:3`
- `apps/expo/package.json:20`

## Root Cause

Confirmed. There is no image picker/upload integration, no backend presign contract, no storage env contract, and no media persistence model.

## Acceptance Criteria

- Add image picker and image preparation using supported Expo/native packages.
- Validate MIME type, extension, dimensions, and file size client-side and server-side.
- Correct orientation, compress oversized images, and strip unnecessary sensitive EXIF metadata.
- Backend issues authenticated presigned upload URLs or POST data.
- Mobile client uploads with visible progress, cancellation, retry, and expired URL recovery.
- Multi-image partial failures are recoverable without losing successful uploads.
- Report submission persists object keys or canonical media URLs.
- Report detail and nearby cards load persisted images from S3-compatible storage/CDN.
- Broken-image and loading states are intentional and recoverable.
- Orphaned uploads are removed or scheduled for cleanup when a report is abandoned.
- No AWS access keys or secrets exist in the mobile client.

## Required Automated Tests

- Server tests for presign authorization, type/size validation, and ownership.
- Client tests for rejected type/oversized file.
- Client upload state tests for success, network failure, expired authorization retry, cancellation, partial multi-image failure, and remove-before-submit.
- Report submission test proving persisted media reloads after clean refetch.

## Required Manual Verification

- Select two real emulator/device images.
- Observe real upload progress.
- Simulate upload failure and retry.
- Submit report and reload detail after app restart.
- Delete/resolve where supported and verify media consistency.

## Affected Files

- `apps/expo/package.json`
- `apps/expo/src/features/**/creation*`
- `apps/expo/src/features/report-creation/*`
- `apps/expo/src/features/pet-profiles/pet-profiles.ts`
- `packages/api/src/router/*`
- `packages/db/src/schema.ts`
- `.env.example`
- `docs/dev/mobile-runbook.md`

## Backend, Database, Map, or Storage Implications

Requires S3-compatible storage environment variables, backend presign endpoint, media table/schema, and cleanup policy.

## Dependencies

- Issue 02 for report/media schema.
- S3-compatible credentials or local MinIO configuration for verification.

## Regression Surfaces

- Expo dev-client build.
- Report creation forms.
- Profile media.
- Report detail image rendering.

## Non-Goals

- Do not ship placeholder images as report evidence.
- Do not put storage secrets in Expo public env.
