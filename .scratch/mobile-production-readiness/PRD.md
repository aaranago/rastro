# Mobile production readiness audit

Status: ready-for-agent

## Context

This feature directory tracks the Stage 0 and Stage 2 findings from the June 2026 mobile audit. Evidence came from the documented Expo dev-client run, Android emulator screenshots under `.scratch/mobile-qa/20260619-195333/`, logcat, repository docs, and read-only specialist review agents.

The current app is not production-ready. Critical production paths still depend on local-only media URIs, incomplete native report details, incomplete end-to-end creation wiring, and unresolved production storage/server hardening.

## Prioritized journey inventory

1. App launch and location selection: still needs final location/filter UX polish and no-placeholder empty states.
2. Cerca list/map browsing: API-backed browsing and native map wiring are implemented, but filter persistence/empty-state polish and native tile verification with real map keys still need completion.
3. Report details: blocked by native routes that render only public deep-link fallback copy.
4. Report creation and submission: blocked by optional publish callbacks, no backend report schema/API, no idempotency, no real location picker, and simulated success.
5. Image upload and delivery: blocked by fixture/local `file://` media, no image picker dependency, no S3-compatible presign service, and no persisted canonical media records.
6. Newly submitted report appearing in browse results: blocked by missing persisted report source of truth and cache invalidation.
7. Editing, resolving, deleting, moderation, and trust actions: blocked by client-only in-memory repositories and no server-side authorization.
8. Resilience and restoration: blocked by invalid SecureStore keys and critical retry/cache primitives not wired to real operations.

## Ownership table

| Issue                        | Status          | Implementation agent                 | Owned files/components                                                           | Dependencies                                             | Verification agent                   |
| ---------------------------- | --------------- | ------------------------------------ | -------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------ |
| 01-no-fake-report-success    | closed          | 019ee27b-33a5-79e3-870a-954cffbbece6 | creation publish paths, shared report creation publish helper/UI tests           | none                                                     | 019ee284-5687-7a23-9cec-9df7576a2ac1 |
| 02-report-schema-api         | closed          | 019ee288-c4bf-7572-927a-e2c1b6cc11e1 | `packages/db`, `packages/api`, `packages/validators`, backend tests              | none                                                     | 019ee2b9-4120-7361-b930-1dd2f1ec51e2 |
| 03-api-backed-nearby         | closed          | 019ee2bf-f017-7131-b87e-944a3a1c50cc | nearby adapters, API client, cache state                                         | issue 02                                                 | 019ee2d1-6954-75d0-8681-80317e93cc82 |
| 04-production-map-location   | needs-info      | 019ee2db-2490-7f41-83aa-743ac2d4bfd6 | map component, app config, location picker                                       | Android Maps SDK key for native tile verification        | 019ee2f2-58c6-7013-abd4-69e40598b658 |
| 05-native-report-detail      | ready-for-agent | unassigned                           | report routes/detail screens, API reads                                          | issue 02, issue 06 for media                             | unassigned                           |
| 06-s3-media-upload           | ready-for-agent | unassigned                           | storage API, Expo image picking/upload UI                                        | S3-compatible credentials/config                         | unassigned                           |
| 07-end-to-end-creation       | ready-for-agent | unassigned                           | lost/found/sighting/adoption flows                                               | issues 02, 04, 06                                        | unassigned                           |
| 08-securestore-safe-keys     | closed          | 019ee261-6eb7-7842-8e36-5d663de107ff | resilience storage, onboarding, drafts, retry queue, creation persistence alerts | none                                                     | 019ee277-7283-7002-a3c8-203a79f3d85f |
| 09-nearby-filter-location-ux | ready-for-agent | unassigned                           | nearby UX, persistence, empty states                                             | issues 03 and 04 for full completion                     | unassigned                           |
| 10-accessibility-safe-area   | ready-for-agent | unassigned                           | shared creation UI, shell FAB/sheets, nearby controls                            | none                                                     | unassigned                           |
| 11-server-config-hardening   | ready-for-agent | unassigned                           | Next API route, env validation, docs                                             | production domain/origin decisions                       | unassigned                           |

## Open blockers

- Android real-tile verification needs `EXPO_ANDROID_GOOGLE_MAPS_API_KEY` in the build environment; OAuth Google env vars are not Maps SDK keys.
- `.env.example` still needs S3-compatible storage variables from issue 06.
- `pnpm db:migrate` is now the verified clean database path. Live `drizzle-kit push` against the existing PostgreSQL 18 database still reports `column "id" is in a primary key` because `drizzle-kit@0.31.5` tries to drop cataloged NOT NULL constraints such as `post_id_not_null`.
