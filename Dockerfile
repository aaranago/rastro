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

# Next validates production env during build. In Dokploy, provide the
# production env file as a build-time secret named "env".
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
