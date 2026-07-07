# Dokploy Deployment

Use Dockerfile deployment for the Next.js web/API service, and use Dokploy
managed services for Postgres, MinIO, domains, and scheduled jobs.

## Web/API container

Create a Dokploy application with:

- Build type: `Dockerfile`
- Dockerfile path: `Dockerfile`
- Docker context path: `.`
- Port: `3000`
- Runtime command: leave blank; the image starts `pnpm -F @acme/nextjs start`

The Dockerfile uses Turbo prune for the `@acme/nextjs` package graph, builds the
Next.js app, and runs only the pruned workspace.

Next.js validates production environment variables during the image build. In
Dokploy, provide the production env file as a build-time secret named `env`, or
make the same values available through Dokploy build-time secret support. Do not
send secrets as Docker build arguments.

Local image smoke:

```bash
docker build --secret id=env,src=.env.production -t rastro-nextjs .
docker run --rm --env-file .env.production -p 3000:3000 rastro-nextjs
```

## Environment source

Use `.env.example` as the variable-name source of truth. It is intentionally
complete for the web/API, mobile build-time public config, auth, media storage,
jobs, and app-store links.

For Dokploy production, copy it and replace:

- Every `localhost` and `10.0.2.2` value with the public or private production
  endpoint.
- Every `dev-only-*` value with a generated secret of at least 32 characters.
- Every blank required production URL with the real URL.

Minimum production web/API values:

```bash
NODE_ENV=production
PORT=3000
POSTGRES_URL=postgres://...
BETTER_AUTH_URL=https://YOUR_DOMAIN
AUTH_SECRET=<32+ char secret>
RASTRO_ANDROID_INSTALL_URL=https://play.google.com/store/apps/details?id=bo.rastro.app
RASTRO_IOS_INSTALL_URL=https://apps.apple.com/app/...
RASTRO_AUTH_EMAIL_FROM="Rastro <no-reply@YOUR_DOMAIN>"
RASTRO_AUTH_EMAIL_WEBHOOK_URL=https://YOUR_EMAIL_PROVIDER_WEBHOOK
RASTRO_AUTH_EMAIL_WEBHOOK_SECRET=<32+ char secret>
RASTRO_JOB_SECRET=<32+ char secret>
RASTRO_SPONSOR_DELIVERY_TOKEN_SECRET=<32+ char secret>
RASTRO_STORAGE_BUCKET=rastro-media
RASTRO_STORAGE_REGION=us-east-1
RASTRO_STORAGE_INTERNAL_ENDPOINT=http://minio:9000
RASTRO_STORAGE_PRESIGN_ENDPOINT=https://uploads.YOUR_DOMAIN
RASTRO_STORAGE_FORCE_PATH_STYLE=true
RASTRO_STORAGE_TLS=true
RASTRO_STORAGE_ACCESS_KEY_ID=<minio access key>
RASTRO_STORAGE_SECRET_ACCESS_KEY=<32+ char secret>
```

## Services

Postgres:

- Use a PostGIS-capable database.
- Set `POSTGRES_URL` to the app database.
- Run migrations before routing traffic to a new release.

MinIO:

- Use one private endpoint for the web/API container:
  `RASTRO_STORAGE_INTERNAL_ENDPOINT=http://minio:9000`.
- Use one public HTTPS S3 API endpoint for mobile presigned uploads:
  `RASTRO_STORAGE_PRESIGN_ENDPOINT=https://uploads.YOUR_DOMAIN`.
- Route the public upload domain to MinIO port `9000`, not console port `9001`.

## Release steps

Run migrations from the deployed image before the web app receives traffic:

```bash
pnpm db:migrate
```

If Dokploy runs one-off commands in a separate service, reuse the same image and
runtime env as the web/API app.

## Scheduled jobs

Create Dokploy scheduled jobs with the same `RASTRO_JOB_SECRET`.

Every minute:

```bash
curl -fsS -X POST \
  -H "Authorization: Bearer $RASTRO_JOB_SECRET" \
  https://YOUR_DOMAIN/api/jobs/chat-notification-delivery-dispatch
```

Every minute:

```bash
curl -fsS -X POST \
  -H "Authorization: Bearer $RASTRO_JOB_SECRET" \
  https://YOUR_DOMAIN/api/jobs/alert-delivery-dispatch
```

Hourly or daily:

```bash
curl -fsS -X POST \
  -H "Authorization: Bearer $RASTRO_JOB_SECRET" \
  https://YOUR_DOMAIN/api/jobs/report-media-cleanup
```

## External configuration

Configure provider dashboards with the production domain:

- Google OAuth callback: `https://YOUR_DOMAIN/api/auth/callback/google`
- Facebook callback: `https://YOUR_DOMAIN/api/auth/callback/facebook`
- Apple callback: `https://YOUR_DOMAIN/api/auth/callback/apple`

Configure mobile-native services before building store/internal apps:

- EAS project id must match `EXPO_PUBLIC_EAS_PROJECT_ID`.
- Android package and iOS bundle id are `bo.rastro.app`.
- Firebase Cloud Messaging V1 credentials must be attached to the EAS Android
  app for push notifications.
- Apple APNs credentials must be attached through EAS for iOS push.
- Google Maps Android/iOS SDK keys must be available during EAS builds.

## Phone test app

For a standalone Android test build:

```bash
cd apps/expo
pnpm dlx eas-cli@latest login
pnpm dlx eas-cli@latest build -p android --profile preview
```

Before building, update `apps/expo/eas.json` if production is not
`https://rastro.bo`, or set the profile env through EAS environment variables.

For Google Play internal testing:

```bash
cd apps/expo
pnpm dlx eas-cli@latest build -p android --profile internal
pnpm dlx eas-cli@latest submit -p android --profile internal --latest
```
