#!/bin/sh
set -e
cd "$(dirname "$0")"

# Image is built in CI and published to GHCR; pull the latest and recreate.
# (Push to main auto-deploys via watchtower — this is the manual equivalent.)
echo "Pulling latest image and restarting..."
docker compose pull
docker compose up -d

echo "Done. Logs:"
docker compose logs --tail 10
