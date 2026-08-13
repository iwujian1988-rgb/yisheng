#!/usr/bin/env bash
# 小科打字猿 一键部署脚本
# 前提：目标机器已装好 docker + docker compose + 已签发 TLS 证书
# 用法：
#   ./deploy.sh                # 默认部署（首次或更新）
#   ./deploy.sh --migrate      # 仅执行 DB migration（不重启服务）
#   ./deploy.sh --seed         # 写入种子数据（管理员账号 + 默认 prompts）
set -euo pipefail

cd "$(dirname "$0")"

ENV_FILE="${ENV_FILE:-.env.production}"
if [ ! -f "$ENV_FILE" ]; then
  echo "[deploy] missing $ENV_FILE. cp .env.production.example $ENV_FILE first."
  exit 1
fi

required_vars="DB_ROOT_PASSWORD DB_PASSWORD ADMIN_PASSWORD DASHSCOPE_API_KEY WECHAT_APP_ID WECHAT_APP_SECRET ORDER_ENTITLEMENT_HASH_SECRET"
for key in $required_vars; do
  value=$(sed -n "s/^${key}=//p" "$ENV_FILE" | tail -n 1)
  if [ -z "$value" ] || printf '%s' "$value" | grep -Eqi 'change[_-]?me|xxxxxxxx|replace-with|example'; then
    echo "[deploy] invalid or missing production setting: $key"
    exit 1
  fi
done

# 解析参数
RUN_MIGRATE=false
RUN_SEED=false
for arg in "$@"; do
  case "$arg" in
    --migrate) RUN_MIGRATE=true ;;
    --seed) RUN_SEED=true ;;
  esac
done

# 1. 启动 MySQL（其他服务等 migration 完成后再起）
if [ "$RUN_MIGRATE" = true ]; then
  echo "[deploy] starting MySQL only..."
  docker compose --env-file "$ENV_FILE" up -d mysql
  echo "[deploy] waiting for MySQL healthy..."
  for i in $(seq 1 60); do
    status=$(docker inspect --format '{{.State.Health.Status}}' "$(docker compose --env-file "$ENV_FILE" ps -q mysql)" 2>/dev/null || echo "")
    if [ "$status" = "healthy" ]; then break; fi
    sleep 2
  done
  echo "[deploy] running migrations..."
  docker compose --env-file "$ENV_FILE" build api
  docker compose --env-file "$ENV_FILE" run --rm api npm run migrate up
  echo "[deploy] migration done"
  exit 0
fi

# 2. 完整部署：构建镜像 + 起全部服务
echo "[deploy] building api image..."
docker compose --env-file "$ENV_FILE" build api

echo "[deploy] starting all services..."
docker compose --env-file "$ENV_FILE" up -d

echo "[deploy] applying pending migrations..."
docker compose --env-file "$ENV_FILE" exec -T api npm run migrate up

# 3. 等待 API 健康
echo "[deploy] waiting for API healthy..."
for i in $(seq 1 60); do
  if curl -fsS http://127.0.0.1/api/health >/dev/null 2>&1 || \
     docker compose --env-file "$ENV_FILE" exec -T api wget -qO- http://127.0.0.1:8080/api/health >/dev/null 2>&1; then
    echo "[deploy] API healthy"
    API_HEALTHY=true
    break
  fi
  sleep 2
done
if [ "${API_HEALTHY:-false}" != true ]; then
  echo "[deploy] API health check timed out"
  docker compose --env-file "$ENV_FILE" ps
  exit 1
fi

# 4. seed（可选）
if [ "$RUN_SEED" = true ]; then
  echo "[deploy] running seed..."
  docker compose --env-file "$ENV_FILE" exec -T api npm run seed
fi

echo "[deploy] done. services:"
docker compose --env-file "$ENV_FILE" ps
