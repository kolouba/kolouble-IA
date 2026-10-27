# syntax=docker/dockerfile:1.7
FROM node:22-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund

FROM base AS builder
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate --schema prisma/sqlite/schema.prisma
RUN npm run build

FROM base AS prod-deps
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev --no-audit --no-fund \
  && npm cache clean --force

FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATABASE_URL=file:/data/kolouble.db \
    WORKSPACE_ROOT=/data/workspace

RUN groupadd --system --gid 1001 nextjs \
  && useradd --system --uid 1001 --gid nextjs --create-home nextjs

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/prisma ./prisma
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY docker/entrypoint.sh /usr/local/bin/kolouble-entrypoint

RUN mkdir -p /data/workspace /app/.next/cache \
  && chown -R nextjs:nextjs /data /app/.next \
  && chmod 755 /usr/local/bin/kolouble-entrypoint

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

ENTRYPOINT ["/usr/local/bin/kolouble-entrypoint"]
CMD ["npm", "run", "start"]
