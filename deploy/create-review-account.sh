#!/usr/bin/env sh
set -eu

if [ "$#" -ne 2 ]; then
  echo "usage: $0 <phone> <password>" >&2
  exit 64
fi

phone="$1"
password="$2"

cd "$(dirname "$0")"
set -a
. ./.env.production
set +a

login_payload=$(curl -fsS http://127.0.0.1:8080/api/admin/auth/login \
  -H 'Content-Type: application/json' \
  -d "{\"account\":\"$ADMIN_ACCOUNT\",\"password\":\"$ADMIN_PASSWORD\"}")
token=$(printf '%s' "$login_payload" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
[ -n "$token" ]

curl -fsS http://127.0.0.1:8080/api/admin/paid-users \
  -X POST \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $token" \
  -d "{\"phone\":\"$phone\",\"expiryDate\":\"2027-08-31T23:59:59.000Z\",\"transferDemo\":true}" >/dev/null

# Set a password without binding an actual device or WeChat identity.
curl -fsS http://127.0.0.1:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d "{\"phone\":\"$phone\",\"code\":\"123456\",\"password\":\"$password\"}" >/dev/null

session_payload=$(curl -fsS http://127.0.0.1:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d "{\"account\":\"$phone\",\"password\":\"$password\"}")
printf '%s' "$session_payload" | grep -q '"transferDemo":true'
printf '%s' "$session_payload" | grep -q '"deviceBindingStatus":"not_bound"'
user_token=$(printf '%s' "$session_payload" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
[ -n "$user_token" ]
templates_payload=$(curl -fsS http://127.0.0.1:8080/api/templates \
  -H "Authorization: Bearer $user_token")
if printf '%s' "$templates_payload" | grep -q '"audience":"professional"'; then
  exit 1
fi
echo 'REVIEW_ACCOUNT_CREATED'
