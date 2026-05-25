# Production image built by Coolify.
# Coolify provides DATABASE_URL via env; uploads land in a Coolify-mounted volume at /app/uploads.

FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --production

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/src/lib/server/db/migrate.ts ./migrate.ts

RUN mkdir -p /app/uploads
VOLUME ["/app/uploads"]

EXPOSE 3000
CMD ["node", "build"]
