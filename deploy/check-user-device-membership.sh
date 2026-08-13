#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")"

docker compose --env-file .env.production exec -T mysql sh -c \
  'mysql -N -s -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" -e "SELECT COALESCE(u.member_status, '\''none'\''), d.bind_status, COUNT(*) FROM devices d LEFT JOIN users u ON u.id = d.bound_user_id GROUP BY COALESCE(u.member_status, '\''none'\''), d.bind_status ORDER BY 1, 2"'
