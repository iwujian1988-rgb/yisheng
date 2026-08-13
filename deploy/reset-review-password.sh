#!/usr/bin/env sh
set -eu

if [ "$#" -ne 2 ]; then
  echo "usage: $0 <phone> <new-password>" >&2
  exit 64
fi

phone="$1"
password="$2"

cd "$(dirname "$0")"

docker compose --env-file .env.production exec \
  -e REVIEW_PHONE="$phone" \
  -T mysql sh -c \
  'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" -e "UPDATE users SET password_hash = NULL WHERE phone = '\''$REVIEW_PHONE'\''"'

docker compose --env-file .env.production up -d --force-recreate --no-deps api
sleep 3

curl -fsS http://127.0.0.1:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d "{\"phone\":\"$phone\",\"code\":\"123456\",\"password\":\"$password\"}" >/dev/null

curl -fsS http://127.0.0.1:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d "{\"account\":\"$phone\",\"password\":\"$password\"}" \
  | grep -q '"code":"OK"'

echo 'REVIEW_PASSWORD_RESET'
