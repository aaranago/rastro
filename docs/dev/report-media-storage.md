# Report Media Storage Runbook

Rastro report photos use backend-owned upload sessions. Mobile clients receive a
short-lived upload instruction for one object key and later submit only ready
media IDs with the report.

## Local MinIO

Use a private bucket. Do not make the bucket public to bypass upload sessions.

Required env:

```bash
RASTRO_STORAGE_BUCKET="rastro-media"
RASTRO_STORAGE_REGION="us-east-1"
RASTRO_STORAGE_INTERNAL_ENDPOINT="http://localhost:9000"
RASTRO_STORAGE_PRESIGN_ENDPOINT="http://10.0.2.2:9000"
RASTRO_STORAGE_FORCE_PATH_STYLE="true"
RASTRO_STORAGE_TLS="false"
RASTRO_STORAGE_ACCESS_KEY_ID="<local-minio-access-key>"
RASTRO_STORAGE_SECRET_ACCESS_KEY="<local-minio-secret-key>"
RASTRO_STORAGE_PRESIGN_EXPIRES_SECONDS="300"
RASTRO_STORAGE_MAX_IMAGE_BYTES="10485760"
RASTRO_STORAGE_ALLOWED_MIME_TYPES="image/jpeg,image/png,image/webp,image/heic,image/heif"
RASTRO_STORAGE_DELIVERY_BASE_URL="<device-reachable-read-base-url>"
RASTRO_JOB_SECRET="<local-job-secret>"
```

For Android emulator runs, `RASTRO_STORAGE_PRESIGN_ENDPOINT` must be reachable
from the emulator. `10.0.2.2` points back to the host machine.

`RASTRO_STORAGE_DELIVERY_BASE_URL` is what public report detail and nearby
cards render after an upload is verified. Point it at a controlled read layer
or CDN that the Android emulator can reach. If it is blank, the API falls back
to the app origin from the request headers and serves private objects through
`/api/report-media/<object-key>`. Existing ready media rows with a null
canonical URL recover on read through either the configured base URL or this
fallback. Do not make production buckets public to paper over this.

To run real storage integration tests:

```bash
RASTRO_STORAGE_INTEGRATION=1 pnpm -F @acme/api test -- src/media-storage.integration.test.ts
```

Use a disposable bucket or prefix for integration tests. The test deletes the
object it creates, but failed test processes can leave objects behind.

## Dokploy MinIO

Use two endpoints when Dokploy places the app and MinIO on the same private
network:

- `RASTRO_STORAGE_INTERNAL_ENDPOINT`: private MinIO service URL reachable from
  the Next.js/API container, for example `http://minio:9000`.
- `RASTRO_STORAGE_PRESIGN_ENDPOINT`: public HTTPS URL reachable from devices,
  for example `https://uploads.example.com`.

Dokploy/MinIO usually needs path-style addressing:

```bash
RASTRO_STORAGE_FORCE_PATH_STYLE="true"
RASTRO_STORAGE_TLS="true"
```

The stock Dokploy MinIO template maps the configured domain to the MinIO
console on port `9001`, while the S3-compatible API is port `9000`. Do not use
`MINIO_BROWSER_REDIRECT_URL` or the console page as `RASTRO_STORAGE_PRESIGN_ENDPOINT`.
Use an endpoint that reaches the S3 API, for example
`http://your-minio-host:9000`, or configure a separate public HTTPS domain that
routes to service port `9000`.

Store `RASTRO_STORAGE_ACCESS_KEY_ID` and `RASTRO_STORAGE_SECRET_ACCESS_KEY` as
Dokploy secrets. Do not place real credentials in `.env.example`, mobile app
config, Expo public env, or logs.

Create a Dokploy scheduled job that calls the Next.js route with a server-side
bearer token:

```bash
curl -fsS -X POST \
  -H "Authorization: Bearer $RASTRO_JOB_SECRET" \
  https://app.example.com/api/jobs/report-media-cleanup
```

Set `RASTRO_JOB_SECRET` as a Dokploy secret on the web/API service and on the
scheduled job. The route returns only aggregate cleanup counts and must not be
called from the mobile app.

## AWS S3

For AWS S3 production, leave custom endpoints blank so the AWS SDK uses regional
S3 endpoints:

```bash
RASTRO_STORAGE_BUCKET="rastro-prod-media"
RASTRO_STORAGE_REGION="us-east-1"
RASTRO_STORAGE_INTERNAL_ENDPOINT=""
RASTRO_STORAGE_PRESIGN_ENDPOINT=""
RASTRO_STORAGE_FORCE_PATH_STYLE="false"
RASTRO_STORAGE_TLS="true"
RASTRO_STORAGE_DELIVERY_BASE_URL="https://media.example.com"
```

Use an IAM access key with least privilege for the bucket/prefix:

- `s3:PutObject`
- `s3:HeadObject`
- `s3:DeleteObject`

The bucket should remain private. Public read URLs should come from a controlled
delivery layer such as CloudFront when needed, not from public bucket ACLs.

## Operational Notes

- The backend logs only tRPC path timing. Do not add logs that print upload
  instruction URLs, fields, headers, access keys, or secret keys.
- Report submission must reference ready media IDs owned by the member. It must
  not accept object keys, canonical URLs, or signed URLs from the client.
- Expired pending uploads can be refreshed through the same media ID.
- `/api/jobs/report-media-cleanup` runs `cleanupAbandonedReportMediaUploads`
  from the server with the production database repository and storage adapter.
  Schedule it at least daily to delete expired pending objects and mark their
  media rows removed.
