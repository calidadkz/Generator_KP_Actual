#!/bin/sh

echo "[start] Starting CALIDAD Generator..."
echo "[start] PORT=${PORT:-8080}"

# Minimal validation
test -f /etc/nginx/conf.d/default.conf || { echo "[start] ERROR: nginx config not found"; exit 1; }
test -d /app/dist || { echo "[start] ERROR: /app/dist not found"; exit 1; }

# Test nginx config
echo "[start] Testing nginx config..."
/usr/sbin/nginx -t || exit 1

# Start Node.js backend in background
echo "[start] Starting backend..."
node /app/dist-server/server/index.js > /tmp/backend.log 2>&1 &

# Start Nginx in foreground
echo "[start] Starting nginx..."
exec /usr/sbin/nginx -g "daemon off;"
