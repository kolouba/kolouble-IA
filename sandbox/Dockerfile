# syntax=docker/dockerfile:1.7
FROM node:22-alpine

ENV NODE_ENV=production \
    SANDBOX_HOST=0.0.0.0 \
    SANDBOX_PORT=4300 \
    SANDBOX_ROOT=/site

WORKDIR /app
COPY preview-server.mjs ./preview-server.mjs

RUN addgroup -S sandbox && adduser -S -G sandbox sandbox

USER sandbox
EXPOSE 4300

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4300/healthz').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "preview-server.mjs"]
