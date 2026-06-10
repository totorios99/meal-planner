#!/bin/sh
set -e
cd "$(dirname "$0")"

echo "Building and restarting..."
docker compose up -d --build

echo "Done. Logs:"
docker compose logs --tail 10
