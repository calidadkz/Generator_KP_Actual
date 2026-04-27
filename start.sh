#!/bin/sh

echo "[start.sh] ============================================"
echo "[start.sh] Starting CALIDAD Generator (Runtime Secrets)"
echo "[start.sh] ============================================"
echo "[start.sh] GEMINI_API_KEY: ${GEMINI_API_KEY:-(NOT SET - OK, read at runtime)}"
echo "[start.sh] PORT: ${PORT:-8080}"
echo "[start.sh] NODE_ENV: ${NODE_ENV:-production}"

# Check directories exist
echo "[start.sh] Checking directories..."
test -d /app/dist && echo "[start.sh] ✓ /app/dist exists" || echo "[start.sh] ✗ /app/dist MISSING"
test -f /app/dist-server/server/index.js && echo "[start.sh] ✓ backend/server/index.js exists" || echo "[start.sh] ✗ backend MISSING"
test -f /etc/nginx/conf.d/default.conf && echo "[start.sh] ✓ nginx config exists" || echo "[start.sh] ✗ nginx config MISSING"

# Test nginx config syntax
echo "[start.sh] Testing Nginx configuration..."
/usr/sbin/nginx -t 2>&1 || { echo "[start.sh] ✗ Nginx config test FAILED"; exit 1; }
echo "[start.sh] ✓ Nginx config OK"

# Start Node.js backend in background (non-critical if it fails - static files still work)
echo "[start.sh] Starting Gemini API backend on port 3000..."
node /app/dist-server/server/index.js > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo "[start.sh] Backend started with PID $BACKEND_PID"
sleep 1
if ps -p $BACKEND_PID > /dev/null; then
  echo "[start.sh] ✓ Backend is running"
else
  echo "[start.sh] ⚠ Backend failed to start (check /tmp/backend.log)"
  cat /tmp/backend.log
fi

# Start Nginx in foreground (this is critical)
echo "[start.sh] ============================================"
echo "[start.sh] Starting Nginx on port 8080..."
echo "[start.sh] ============================================"
exec /usr/sbin/nginx -g "daemon off;"
