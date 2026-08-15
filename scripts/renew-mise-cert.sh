#!/usr/bin/env bash
# Renew the Let's Encrypt cert that fronts Mise on the LAN and hand it to nginx-proxy-manager.
#
# Why this exists: mise.neurotrichini-darter.ts.net is a real name (a Tailscale node, so LE will
# issue for it) but AdGuard rewrites it to the LAN IP, which is what lets a phone reach the app
# over trusted HTTPS with Tailscale switched off. NPM serves the cert from a hand-written server
# block (/data/nginx/custom/http.conf), not from its database, so nothing renews it on its own.
#
# `tailscale cert` is a no-op while the cached cert has comfortable life left, so running this
# weekly costs nothing and there is no "is it time yet" logic to get wrong.
set -euo pipefail

NODE=tailscale-mise
NPM=nginx-proxy-manager
DOMAIN=mise.neurotrichini-darter.ts.net
DEST=/data/custom_ssl/mise-ts

log() { printf '%s renew-mise-cert: %s\n' "$(date -Is)" "$*"; }

for c in "$NODE" "$NPM"; do
  docker inspect -f '{{.State.Running}}' "$c" 2>/dev/null | grep -q true || {
    log "container $c is not running — aborting"; exit 1; }
done

log "requesting cert for $DOMAIN"
docker exec "$NODE" tailscale cert \
  --cert-file /var/lib/tailscale/mise.crt \
  --key-file /var/lib/tailscale/mise.key \
  "$DOMAIN"

# Compare against what nginx is currently serving; skip the reload when nothing changed, so a
# weekly run doesn't bounce every connection through NPM for no reason.
new=$(docker exec "$NODE" sha256sum /var/lib/tailscale/mise.crt | cut -d' ' -f1)
old=$(docker exec "$NPM" sha256sum "$DEST/fullchain.pem" 2>/dev/null | cut -d' ' -f1 || true)
if [ "$new" = "$old" ]; then
  log "cert unchanged — nothing to do"
  exit 0
fi

log "installing new cert into $NPM"
docker exec "$NPM" mkdir -p "$DEST"
docker exec "$NODE" cat /var/lib/tailscale/mise.crt | docker exec -i "$NPM" sh -c "cat > $DEST/fullchain.pem"
docker exec "$NODE" cat /var/lib/tailscale/mise.key | docker exec -i "$NPM" sh -c "cat > $DEST/privkey.pem"
docker exec "$NPM" chmod 600 "$DEST/privkey.pem"

# Never reload a config that doesn't parse — a bad reload takes every proxied app down, not just
# this one.
docker exec "$NPM" nginx -t
docker exec "$NPM" nginx -s reload
log "reloaded; now serving $(docker exec "$NPM" openssl x509 -in "$DEST/fullchain.pem" -noout -enddate)"
