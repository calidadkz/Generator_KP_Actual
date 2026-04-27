# ============================================================
# CALIDAD Document Generator — Dockerfile
# Target: Google Cloud Run (port 8080)
# Backend (Node.js) on port 3000, Nginx reverse-proxy on 8080
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

# ---- Stage 2: Serve ----------------------------------------
FROM node:20-alpine

WORKDIR /app

# Install nginx for reverse proxy
RUN apk add --no-cache nginx

# Copy built static files
COPY --from=builder /app/dist /app/dist

# Copy built server (compiled from TypeScript)
COPY --from=builder /app/dist-server /app/dist-server

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy startup script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Cloud Run requires PORT=8080
ENV PORT=8080

EXPOSE 8080

CMD ["/app/start.sh"]
