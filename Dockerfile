# syntax=docker/dockerfile:1
# ══════════════════════════════════════════════════════════════
# Dockerfile — PingBoard (Node.js + Express)
#
# Multi-stage build:
#   Stage 1 "builder" — installs production dependencies cleanly
#   Stage 2 "final"   — copies only what's needed to run the app
#
# Result: a lean, secure, production-ready image (~170MB)
# ══════════════════════════════════════════════════════════════

# ── Stage 1: builder ──────────────────────────────────────────
# node:22-alpine = Node.js 22 on Alpine Linux (~5MB base vs ~170MB Ubuntu)
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files FIRST — before source code.
# Why? Docker caches each line as a layer. If source code changes
# but package.json doesn't, Docker reuses the cached npm install
# layer. This makes rebuilds much faster on every code change.
COPY package*.json ./

# Install only production dependencies (skip devDependencies).
# npm ci = clean install — faster and stricter than npm install.
# --omit=dev = exclude test tools, linters, nodemon, etc.
RUN npm ci --omit=dev

# ── Stage 2: final (the actual production image) ──────────────
# Start completely fresh — nothing from builder leaks in unless
# we explicitly COPY it. This is what keeps the image small and clean.
FROM node:22-alpine AS final

# ── Build-time arguments (injected by the pipeline) ───────────
ARG APP_VERSION=0.0.0
ARG GIT_COMMIT=unknown
ARG BUILD_DATE=unknown

# ── OCI standard image labels ─────────────────────────────────
# These are baked into the image and inspectable via:
#   docker inspect <image> | jq '.[0].Config.Labels'
LABEL org.opencontainers.image.title="pingboard" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.revision="${GIT_COMMIT}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.description="Live server health dashboard — Week 2 Deliverable"

WORKDIR /app

# Copy the installed node_modules from the builder stage.
# We don't run npm install again — just copy the compiled result.
COPY --from=builder /app/node_modules ./node_modules

# Copy application source files.
# These go LAST because they change most often.
# Putting frequently-changing files last preserves the
# node_modules cache layer above for faster rebuilds.
COPY server.js ./
COPY src/      ./src/

# ── Security: run as non-root user ────────────────────────────
# The official node image already includes a "node" user (uid 1001).
# Running as root inside a container is a security risk —
# if the app is compromised, the attacker would have root access.
USER node

# ── Runtime environment variables ─────────────────────────────
ENV NODE_ENV=production \
    PORT=3000

# ── Expose port ───────────────────────────────────────────────
# Documents that the container listens on port 3000.
# Note: this does NOT publish the port — you still need -p 3000:3000
# when running the container (or a Kubernetes Service).
EXPOSE 3000

# ── Health check ──────────────────────────────────────────────
# Docker runs this every 30s. If it fails 3 times → container = "unhealthy".
# Kubernetes uses this for liveness probes and restart decisions.
# wget is available on Alpine; curl is not installed by default.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

# ── Start command ─────────────────────────────────────────────
# Array form (exec form) — does NOT spawn a shell.
# This means signals (SIGTERM from Ctrl+C / Kubernetes shutdown)
# go directly to Node.js, allowing graceful shutdown.
# String form ("node server.js") wraps in /bin/sh, eating the signal.
CMD ["node", "server.js"]
