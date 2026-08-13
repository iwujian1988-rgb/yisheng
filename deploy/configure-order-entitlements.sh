#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")"

if ! grep -q '^ORDER_ENTITLEMENT_HASH_SECRET=.' .env.production; then
  secret="$(dd if=/dev/urandom bs=32 count=1 2>/dev/null | base64 | tr -d '\n' | tr '/+' '_-')"
  printf '\nORDER_ENTITLEMENT_HASH_SECRET=%s\n' "$secret" >> .env.production
fi

docker compose --env-file .env.production up -d --build --no-deps api
