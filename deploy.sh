#!/bin/sh
set -e
cd "$(dirname "$0")"

echo "Building image..."
docker build -t mise .

echo "Restarting container..."
docker rm -f mise 2>/dev/null || true
docker run -d \
  --name mise \
  -p 3000:3000 \
  -v /DATA/AppData/mise:/app/data \
  -e DATABASE_URL=file:/app/data/meal-planner.db \
  -e NODE_ENV=production \
  -e NEXT_TELEMETRY_DISABLED=1 \
  --restart unless-stopped \
  mise

echo "Done. Logs:"
docker logs mise --tail 10
