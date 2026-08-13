#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")"

if ! docker compose --env-file .env.production exec -T mysql sh -c \
  'mysql -N -s -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" -e "SHOW COLUMNS FROM users LIKE '\''features'\''"' | grep -q '^features'; then
  docker compose --env-file .env.production exec -T mysql sh -c \
    'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" -e "ALTER TABLE users ADD COLUMN features JSON NULL AFTER register_source"'
fi

docker compose --env-file .env.production exec -T mysql sh -c \
  'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" -e "CREATE TABLE IF NOT EXISTS order_entitlements (id VARCHAR(64) PRIMARY KEY, order_no VARCHAR(128) NOT NULL UNIQUE, sku_type VARCHAR(32) NOT NULL, phone_hash CHAR(64) NULL, member_days INT NOT NULL DEFAULT 0, status VARCHAR(32) NOT NULL, claimed_by_user_id VARCHAR(64) NULL, claimed_at DATETIME NULL, refunded_at DATETIME NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, INDEX idx_order_entitlements_phone_status (phone_hash, status), INDEX idx_order_entitlements_claimed_by (claimed_by_user_id))"'

docker compose --env-file .env.production exec -T mysql sh -c \
  'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" -e "CREATE TABLE IF NOT EXISTS order_entitlement_requests (id VARCHAR(64) PRIMARY KEY, phone_hash CHAR(64) NOT NULL, status VARCHAR(32) NOT NULL, entitlement_id VARCHAR(64) NULL, processed_by_admin_id VARCHAR(64) NULL, processed_at DATETIME NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, INDEX idx_order_entitlement_requests_phone_status (phone_hash, status), INDEX idx_order_entitlement_requests_entitlement (entitlement_id))"'

if ! docker compose --env-file .env.production exec -T mysql sh -c \
  'mysql -N -s -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" -e "SHOW COLUMNS FROM users LIKE '\''password_hash'\''"' | grep -q '^password_hash'; then
  docker compose --env-file .env.production exec -T mysql sh -c \
    'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" -e "ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NULL AFTER nickname"'
fi

if ! docker compose --env-file .env.production exec -T mysql sh -c \
  'mysql -N -s -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" -e "SHOW COLUMNS FROM devices LIKE '\''binding_mode'\''"' | grep -q '^binding_mode'; then
  docker compose --env-file .env.production exec -T mysql sh -c \
    'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" -e "ALTER TABLE devices ADD COLUMN binding_mode VARCHAR(32) NOT NULL DEFAULT '\''registered'\'' AFTER proof_code_hash"'
fi

docker compose --env-file .env.production up -d --build --no-deps api
docker compose --env-file .env.production ps
