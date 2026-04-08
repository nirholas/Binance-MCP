# syntax=docker/dockerfile:1

FROM oven/bun:1 AS builder
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY tsconfig.json ./
COPY src ./src
RUN bun run build

FROM oven/bun:1-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3002

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY --from=builder /app/build ./build

EXPOSE 3002

# Streamable HTTP (SSE-compatible endpoints: /mcp, /sse, health: /health)
CMD ["bun", "run", "build/index.js", "--sse"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD bun -e "fetch('http://127.0.0.1:'+(process.env.PORT||'3002')+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
