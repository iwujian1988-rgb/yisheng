#!/usr/bin/env sh
set -eu

phone="$1"
password="$2"
cd "$(dirname "$0")"

hash=$(docker compose --env-file .env.production exec \
  -e REVIEW_PHONE="$phone" \
  -T mysql sh -c \
  'mysql -N -s -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" -e "SELECT password_hash FROM users WHERE phone = '\''$REVIEW_PHONE'\''"')

docker compose --env-file .env.production exec \
  -e REVIEW_PASSWORD="$password" \
  -e REVIEW_HASH="$hash" \
  -T api node -e "const { verifyPassword } = require('./src/security/password'); if (!verifyPassword(process.env.REVIEW_PASSWORD, process.env.REVIEW_HASH)) process.exit(1); console.log('PASSWORD_HASH_VERIFIED');"
