# Deliberately NOT using `output: 'standalone'`. Multiple Next.js issues
# (including one reported Feb 2026) document instrumentation.ts silently
# failing to run under standalone output tracing — and instrumentation.ts is
# the only thing that boots the ingestion worker here. A normal `next start`
# with the full node_modules copied in is a larger image but a well-trodden,
# reliable path for something this load-bearing.

FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

FROM node:20-slim AS builder
WORKDIR /app
# Prisma's engine-detection needs a real openssl present to pick the right
# binary — without it, node:20-slim (bookworm, openssl3) makes Prisma default
# to guessing an incompatible openssl-1.1.x engine.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p public
RUN npx prisma generate
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Needed to run prisma/migrations/0001_init_pgvector.sql on container start —
# this repo uses `prisma db push` + a hand-written SQL file, not tracked
# Prisma migrations, so `prisma migrate deploy` alone would be insufficient.
RUN apt-get update && apt-get install -y --no-install-recommends postgresql-client openssl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nextjs
RUN mkdir -p storage/uploads && chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3000
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "start"]
