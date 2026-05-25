# Production image built by Coolify.
#
# - Build stage installs all deps + builds SvelteKit (adapter-node)
# - Runner stage carries only the build output, production node_modules, drizzle migrations,
#   and the migrate-on-boot script
# - CMD runs migrations first, then starts the server

FROM node:22-alpine AS builder
WORKDIR /app

# Install all deps (including dev) for the build
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Drop dev deps to keep the runtime image lean
RUN npm prune --production

# -------- Runtime --------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV BODY_SIZE_LIMIT=20M

# Lightweight tools for healthcheck and entrypoint
RUN apk add --no-cache wget tini

# Copy only what's needed at runtime
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/migrate.mjs ./migrate.mjs
COPY --from=builder /app/package.json ./package.json

# Persistent storage mount point — Coolify volume gets mounted here
RUN mkdir -p /app/uploads
VOLUME ["/app/uploads"]

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/ || exit 1

# tini handles PID 1 signals cleanly; sh -c chains migrate + serve
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sh", "-c", "node migrate.mjs && node build"]
