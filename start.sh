#!/bin/sh
set -e

echo "[start.sh] Starting CALIDAD Generator..."
echo "[start.sh] GEMINI_API_KEY: ${GEMINI_API_KEY:-(not set)}"
echo "[start.sh] PORT: ${PORT:-8080}"

# Start Node.js backend in background
echo "[start.sh] Starting Gemini API backend on port 3000..."
node /app/dist-server/server/index.js &
BACKEND_PID=$!
echo "[start.sh] Backend started with PID $BACKEND_PID"

# Give backend time to start
sleep 2

# Start Nginx in foreground
echo "[start.sh] Starting Nginx on port 8080..."
/usr/sbin/nginx -g "daemon off;"
