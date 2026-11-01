# syntax=docker/dockerfile:1
# The production server, for self-hosting (docker-compose.prod.yml). In development the app runs
# on your machine and only the services run in Docker (docker-compose.yml).
#
# The build context is the pnpm workspace root (this repository, or the monorepo Spotcraft was
# copied into), and APP_DIR is where the app sits in it. For a standalone copy both are ".".
# docker-compose.prod.yml passes them; see SPOTCRAFT_BUILD_CONTEXT and SPOTCRAFT_APP_DIR in .env.example.

ARG NODE_VERSION=26

FROM node:${NODE_VERSION}-slim AS base
ARG APP_DIR=apps/dashboard
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH APP_DIR=${APP_DIR}
RUN npm install -g pnpm@12.4.1
WORKDIR /workspace

# Build the server and a self-contained migrator. Only the app and what it depends on are installed.
FROM base AS build
# Inlined into the browser bundle at build time; see .env.example.
ARG VITE_SPOTCRAFT_SOURCE_URL
ENV VITE_SPOTCRAFT_SOURCE_URL=$VITE_SPOTCRAFT_SOURCE_URL
COPY . .
# A standalone copy (APP_DIR ".") is its own workspace: install it all.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
	if [ "$APP_DIR" = . ]; then pnpm install --frozen-lockfile; \
	else pnpm install --frozen-lockfile --filter "./${APP_DIR}..."; fi
WORKDIR /workspace/${APP_DIR}
RUN pnpm build
RUN pnpm exec esbuild scripts/migrate.ts --bundle --platform=node --format=esm \
	--banner:js="import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" \
	--outfile=migrate.mjs

# Production: just the built server, the migrations and the migrator. No source, no node_modules.
FROM node:${NODE_VERSION}-slim AS runtime
ARG APP_DIR=apps/dashboard
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0
WORKDIR /app
COPY --from=build --chown=node:node /workspace/${APP_DIR}/.output ./.output
COPY --from=build --chown=node:node /workspace/${APP_DIR}/drizzle ./drizzle
COPY --from=build --chown=node:node /workspace/${APP_DIR}/migrate.mjs ./migrate.mjs
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
	CMD ["node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/openapi.json').then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", ".output/server/index.mjs"]
