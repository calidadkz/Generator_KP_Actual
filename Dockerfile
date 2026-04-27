# ============================================================
# CALIDAD Document Generator — Dockerfile
# Target: Google Cloud Run (port 8080)
# Node.js Express server serves both API + static files
# ============================================================

# ---- Stage 1: Build ----------------------------------------
FROM node:20 AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build (no build-time secrets needed)
COPY . .
RUN npm run build

# ---- Stage 2: Runtime ----------------------------------------
FROM node:20-alpine

WORKDIR /app

# Copy built static files (React SPA)
COPY --from=builder /app/dist /app/dist

# Copy built server code (compiled TypeScript)
COPY --from=builder /app/dist-server /app/dist-server

# Copy runtime dependencies (node_modules)
# Optimization: install only production dependencies
COPY --from=builder /app/node_modules /app/node_modules

# Cloud Run listens on PORT=8080
ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

# Start the server
CMD ["node", "/app/dist-server/server/index.js"]
