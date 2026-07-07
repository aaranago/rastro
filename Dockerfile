# syntax=docker/dockerfile:1.7

FROM node:22.21.0-bookworm-slim AS base

ENV NEXT_TELEMETRY_DISABLED=1
ENV TURBO_TELEMETRY_DISABLED=1
ENV PNPM_HOME="/pnpm"
ENV COREPACK_HOME=/pnpm/corepack
ENV PATH="$PNPM_HOME:$PATH"

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.19.0 --activate

FROM base AS pruner

COPY . .
RUN pnpm dlx turbo@2.5.8 prune @acme/nextjs --docker

FROM base AS installer

COPY --from=pruner /app/out/json/ .
RUN --mount=type=cache,id=rastro-pnpm-store,target=/pnpm/store \
  pnpm install --frozen-lockfile

COPY --from=pruner /app/out/full/ .

# Next validates production env during build. Prefer a BuildKit secret file
# named "env". Dokploy deployments can also pass these as build arguments; ARG
# values are available only during this build stage and must also be configured
# as runtime environment variables on the deployed service.
ARG AUTH_APPLE_APP_BUNDLE_IDENTIFIER
ARG AUTH_APPLE_CLIENT_ID
ARG AUTH_APPLE_CLIENT_SECRET
ARG AUTH_FACEBOOK_ID
ARG AUTH_FACEBOOK_SECRET
ARG AUTH_GOOGLE_ID
ARG AUTH_GOOGLE_SECRET
ARG AUTH_REDIRECT_PROXY_URL
ARG AUTH_REQUIRE_EMAIL_VERIFICATION
ARG AUTH_SECRET
ARG BETTER_AUTH_URL
ARG POSTGRES_URL
ARG RASTRO_ADMIN_EMAILS
ARG RASTRO_ANDROID_INSTALL_URL
ARG RASTRO_AUTH_EMAIL_FROM
ARG RASTRO_AUTH_EMAIL_WEBHOOK_SECRET
ARG RASTRO_AUTH_EMAIL_WEBHOOK_URL
ARG RASTRO_IOS_INSTALL_URL
ARG RASTRO_JOB_SECRET
ARG RASTRO_SPONSOR_DELIVERY_TOKEN_SECRET
ARG RASTRO_STORAGE_ACCESS_KEY_ID
ARG RASTRO_STORAGE_ALLOWED_MIME_TYPES
ARG RASTRO_STORAGE_BUCKET
ARG RASTRO_STORAGE_DELIVERY_BASE_URL
ARG RASTRO_STORAGE_FORCE_PATH_STYLE
ARG RASTRO_STORAGE_INTERNAL_ENDPOINT
ARG RASTRO_STORAGE_MAX_IMAGE_BYTES
ARG RASTRO_STORAGE_PRESIGN_ENDPOINT
ARG RASTRO_STORAGE_PRESIGN_EXPIRES_SECONDS
ARG RASTRO_STORAGE_REGION
ARG RASTRO_STORAGE_SECRET_ACCESS_KEY
ARG RASTRO_STORAGE_TLS
ARG VERCEL_ENV
ARG VERCEL_PROJECT_PRODUCTION_URL
ARG VERCEL_URL

RUN --mount=type=secret,id=env,target=/app/.env,required=false \
  pnpm -F @acme/nextjs build

FROM base AS runner

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs --home-dir /home/nextjs --create-home nextjs \
  && mkdir -p /home/nextjs/.cache/node /pnpm/corepack \
  && chown -R nextjs:nodejs /home/nextjs /pnpm

COPY --from=installer --chown=nextjs:nodejs /app /app

USER nextjs

EXPOSE 3000

CMD ["pnpm", "-F", "@acme/nextjs", "start"]
