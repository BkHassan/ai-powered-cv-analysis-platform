# syntax=docker/dockerfile:1
# Next.js image. Build context is apps/frontend (it has its own lockfile).
FROM node:22-alpine AS base
RUN npm install -g pnpm@11
# Registry fetches time out on slow or contended links; the defaults are too
# tight for a cold install of this many packages.
ENV npm_config_fetch_retries=5
ENV npm_config_fetch_timeout=600000
ENV npm_config_fetch_retry_maxtimeout=120000
ENV npm_config_network_concurrency=8
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir=/pnpm/store

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* values are inlined into the client bundle at build time, so the
# API URL has to be a build arg — changing it requires rebuilding this image.
ARG NEXT_PUBLIC_API_URL=http://localhost:3003
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN apk add --no-cache curl

# next.config.mjs sets output: "standalone", so .next/standalone is a
# self-contained server with only the modules it actually imports.
COPY --from=build /app/public ./public
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static

USER node

EXPOSE 3000
# -o /dev/null keeps the rendered page out of the container's health log.
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -fsS -o /dev/null http://127.0.0.1:3000/ || exit 1

CMD ["node", "server.js"]
