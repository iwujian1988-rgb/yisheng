#!/usr/bin/env sh
set -eu

if [ "$#" -ne 2 ]; then
  echo "usage: $0 <phone> <new-password>" >&2
  exit 64
fi

phone="$1"
password="$2"

cd "$(dirname "$0")"
set -a
. ./.env.production
set +a

hash=$(docker compose --env-file .env.production exec \
  -e REVIEW_PASSWORD="$password" \
  -T api node -e \
  "const { hashPassword } = require('./src/security/password'); process.stdout.write(hashPassword(process.env.REVIEW_PASSWORD));")

docker compose --env-file .env.production exec \
  -e REVIEW_PASSWORD="$password" \
  -e REVIEW_HASH="$hash" \
  -T api node -e \
  "const { verifyPassword } = require('./src/security/password'); if (!verifyPassword(process.env.REVIEW_PASSWORD, process.env.REVIEW_HASH)) process.exit(1);"

docker compose --env-file .env.production exec \
  -e MYSQL_PWD="$DB_ROOT_PASSWORD" \
  -e REVIEW_HASH="$hash" \
  -e REVIEW_PHONE="$phone" \
  -T mysql sh -c \
  'mysql -uroot "$MYSQL_DATABASE" -e "UPDATE users SET password_hash = '\''$REVIEW_HASH'\'' WHERE phone = '\''$REVIEW_PHONE'\''"'

session_payload=$(curl -fsS http://127.0.0.1:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d "{\"account\":\"$phone\",\"password\":\"$password\"}")
printf '%s' "$session_payload" | grep -q '"code":"OK"'
echo 'REVIEW_PASSWORD_UPDATED'
