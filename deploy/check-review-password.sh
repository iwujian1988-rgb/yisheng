#!/usr/bin/env sh
set -eu

phone="$1"
cd "$(dirname "$0")"

docker compose --env-file .env.production exec \
  -e REVIEW_PHONE="$phone" \
  -T mysql sh -c \
  'mysql -N -s -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" -e "SELECT phone, LENGTH(password_hash), LEFT(password_hash, 7) FROM users WHERE phone = '\''$REVIEW_PHONE'\''"'
