#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")"
sleep 3

docker compose --env-file .env.production exec -T api wget -qO- http://127.0.0.1:8080/api/health
printf '\nsecret='
if grep -q '^ORDER_ENTITLEMENT_HASH_SECRET=.' .env.production; then
  echo SET
else
  echo MISSING
fi

printf 'tables=\n'
docker compose --env-file .env.production exec -T mysql sh -c \
  'mysql -N -s -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" -e "SHOW TABLES"' | grep '^order_entitlement'

printf 'wechat_login_http='
docker compose --env-file .env.production exec -T api node -e \
  "fetch('http://127.0.0.1:8080/api/auth/wechat-login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:'invalid-smoke-code'})}).then(function(r){console.log(r.status)}).catch(function(){process.exit(1)})"
