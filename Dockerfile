# syntax=docker/dockerfile:1.7

# Build with:
#   docker build --target server -t ceooo-server .
#   docker build --target client --build-arg NEXT_PUBLIC_API_URL=https://api.example.com -t ceooo-client .

# Install only runtime dependencies; the server runs TypeScript directly with Bun.
FROM oven/bun:1.2-alpine AS server-deps
WORKDIR /app
COPY server/package.json server/bun.lock ./
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --production --frozen-lockfile

FROM server-deps AS server-build
COPY server/prisma ./prisma
COPY server/prisma.config.ts ./prisma.config.ts
RUN bun run prisma:generate

COPY server/index.ts ./index.ts
COPY server/config ./config
COPY server/controllers ./controllers
COPY server/integrations ./integrations
COPY server/lib ./lib
COPY server/middleware ./middleware
COPY server/routes ./routes
COPY server/services ./services
COPY server/types ./types
COPY server/validation ./validation

FROM oven/bun:1.2-alpine AS server
WORKDIR /app
ENV NODE_ENV=production \
    PORT=5010 \
    UPLOADS_DIR=/app/uploads \
    HOME=/tmp

RUN apk add --no-cache openssl \
    && addgroup -S -g 1001 appgroup \
    && adduser -S -u 1001 -G appgroup -h /app appuser \
    && mkdir -p /app/uploads \
    && chown -R 1001:1001 /app

COPY --from=server-build --chown=1001:1001 /app ./
USER 1001:1001
EXPOSE 5010

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["bun", "-e", "fetch('http://127.0.0.1:5010/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

CMD ["bun", "run", "index.ts"]

# Build the Next.js standalone bundle. Public API configuration is compiled in.
FROM node:22-alpine AS client-deps
WORKDIR /app
COPY client/package.json client/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund --prefer-offline

FROM client-deps AS client-build
ARG NEXT_PUBLIC_API_URL=http://localhost:5010
ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
COPY client ./
RUN npm run build

FROM node:22-alpine AS client
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1

RUN addgroup -S -g 1001 appgroup \
    && adduser -S -u 1001 -G appgroup -h /app appuser
COPY --from=client-build --chown=1001:1001 /app/public ./public
COPY --from=client-build --chown=1001:1001 /app/.next/standalone ./
COPY --from=client-build --chown=1001:1001 /app/.next/static ./.next/static
USER 1001:1001
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

CMD ["node", "server.js"]
