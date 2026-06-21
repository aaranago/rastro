# RC-002 Build the native image manager and crop/upload lifecycle

Status: ready-for-agent
Labels: ready-for-agent
Severity: P0
Issue ID: RC-002
Type: AFK
Owner: Agent RC-002, must invoke `$tdd`
Verifier: Verifier RC-002-V

## Parent

`.scratch/report-creation-repair/PRD.md`

## Report type, step, route, and entry point

- Report types: lost, found, sighting optional photos, adoption
- Step: photos/media
- Current route: type-specific creation screens
- Entry points: all report creation paths

## Reproduction

1. Open Lost report creation.
2. Scroll to photos.
3. Tap add photo.
4. Tap inserted photo.
5. Try to crop, reorder, set primary, upload, retry, or preview remote result.

## Expected

- User can add at least two real images from library and camera where supported.
- User can crop/reposition/rotate when supported, preview, recrop, reorder, set primary, and remove.
- UI shows processing, per-image upload progress, overall progress, failure, retry, and completion.
- Successful uploads persist as ready media IDs and reload remotely after refetch/restart.

## Actual

- Add photo appends fixture/local fallback data.
- Tapping photo removes it.
- No picker/camera/crop/upload/retry/reorder/primary state exists.
- Expo package does not include media picker/manipulator dependencies.

## User impact

Photos are core report data. Lost/found/adoption cannot satisfy production requirements or backend validation without real media.

## Evidence

- Screenshot: `.scratch/mobile-qa/20260621-130941/screenshots/09-lost-photos-section.png`
- Screenshot: `.scratch/mobile-qa/20260621-130941/screenshots/10-lost-photo-after-add.png`
- Code: type-specific `addPhoto` callbacks append fixture samples.
- Code: `ReportCreationPhotoSection` only supports add/remove image tiles.
- Package deps: `apps/expo/package.json` lacks `expo-image-picker` and `expo-image-manipulator`.

## Root cause

Confirmed. The media UI is a fixture-driven placeholder and no production media lifecycle is implemented.

## What to build

Build a native media manager integrated with the backend upload-session protocol. Preserve originals for recrop, generate edited local files, strip/normalize metadata as supported, upload with progress/cancellation, and store ready media IDs/order/primary state in the draft.

## Acceptance criteria

- [ ] Library selection works with permission granted, denied, limited/revoked, and settings-change states.
- [ ] Camera capture works where product/platform supports it.
- [ ] At least two real images can be added in the acceptance flow.
- [ ] Type, file size, dimensions, and decodability are validated before upload.
- [ ] Crop/edit screen supports reposition/zoom and rotation where the selected library permits.
- [ ] Original local asset is preserved until edited version is accepted.
- [ ] Review shows the exact crop and image order.
- [ ] Reorder, remove, recrop, retry, and set-primary actions work.
- [ ] Per-image and overall upload progress use real transfer progress.
- [ ] One failed image can retry without reuploading successful images.
- [ ] Cancellation preserves local draft.
- [ ] Remote thumbnails/images render after clean refetch and app restart.
- [ ] No base64 payloads or local file URIs are persisted as canonical media.

## Required automated tests

- Unit tests for media item state transitions.
- Unit tests for metadata/preprocessing decisions.
- Component tests for add, crop result, reorder, primary, remove, retry, and progress states.
- Upload retry and expired-authorization transition tests using mocked upload transport only in tests.
- Integration tests with the real upload-session API from RC-003.

## Required manual verification

- Test permission grant/denial/revocation.
- Add two fixture images through native picker path.
- Crop/reposition first image and rotate second if supported.
- Interrupt one upload and retry only that image.
- Expire one upload authorization and refresh it.
- Verify review, submit, refetch, and restart show same crop/order.

## Likely files and shared components

- `apps/expo/package.json`
- `apps/expo/app.json` or Expo config permissions
- `apps/expo/src/features/report-creation/*`
- Type-specific creation screens/drafts
- New media upload client
- Backend upload contract types from validators

## Backend, database, navigation, or storage implications

- Depends on RC-003 backend upload sessions and ready media IDs.
- May require Expo config plugin/permissions.
- Draft schema migration required for media state.

## Dependencies and regression surfaces

- Blocked by: RC-003.
- Regression surfaces: draft storage size, image rendering, report review, upload retry queue.

## Non-goals

- Backend storage architecture.
- Synthetic/generated animal images.
- Multipart upload unless RC-003 proves it is required.

## Comments
