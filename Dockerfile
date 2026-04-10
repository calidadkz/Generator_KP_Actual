# ============================================================
# CALIDAD Document Generator — Dockerfile
# Target: Google Cloud Run (port 8080)
# ============================================================

# ---- Stage 1: Build ----------------------------------------
FROM node:20 AS builder

WORKDIR /app

# GEMINI_API_KEY is baked into the JS bundle by Vite at build time.
# Pass it via --build-arg in Cloud Build (sourced from Secret Manager).
ARG GEMINI_API_KEY
ENV GEMINI_API_KEY=$GEMINI_API_KEY

# Install dependencies first (layer cache)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ---- Stage 2: Serve ----------------------------------------
FROM nginx:alpine AS runner

# SPA-ready nginx config listening on port 8080 (Cloud Run default)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static files
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
