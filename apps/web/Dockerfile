# syntax=docker/dockerfile:1
# LifeOS web — multi-stage build for the npm-workspaces monorepo.
# Build context = repo root (dockerfile: apps/web/Dockerfile in compose).
# Next standalone output keeps the runner image small.

# ---- deps: install workspace deps once ----
FROM node:23-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
RUN npm ci

# ---- builder: compile the app (build never touches the DB — dynamic pages) ----
FROM node:23-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# npm workspaces hoists everything into the root node_modules — there is
# no apps/web/node_modules to copy.
COPY --from=deps /app/node_modules node_modules
COPY . .
# The previous builder layer's .next survives COPY (it's dockerignored on
# the host) and poisons `next build`'s incremental cache — stale chunks
# have shipped without changed modules. Always build cold.
RUN rm -rf apps/web/.next
RUN npm run build --workspace apps/web

# ---- runner: standalone server + static assets ----
FROM node:23-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
USER nextjs
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
