#!/bin/bash
# 小科打字猿 服务器端部署脚本
# 用法：在服务器上跑 bash /srv/remote-setup.sh
# 每一步都会打印进度，出错立刻 exit

set -euo pipefail

EMAIL_FOR_CERT="${1:-}"
SRV_DIR="/srv/yisheng"
DEPLOY_DIR="$SRV_DIR/deploy"

echo "=========================================="
echo "小科打字猿部署 — api.maxnote.me"
echo "=========================================="

# ---------- Step 1: 解压代码 ----------
if [ ! -f /srv/yisheng.tar.gz ]; then
  echo "[ERROR] /srv/yisheng.tar.gz 不存在，先 scp 上传"
  exit 1
fi
echo ""
echo "[1/6] 解压代码到 $SRV_DIR ..."
mkdir -p "$SRV_DIR"
tar xzf /srv/yisheng.tar.gz -C "$SRV_DIR"

# 移动配置文件
mv /srv/.env.production "$DEPLOY_DIR/.env.production" 2>/dev/null || true
mv /srv/api.maxnote.me.conf "$DEPLOY_DIR/api.maxnote.me.conf" 2>/dev/null || true
ls "$DEPLOY_DIR/"
echo "[1/6] OK"

# ---------- Step 2: 配置 docker 镜像加速 ----------
echo ""
echo "[2/6] 配置 docker 镜像加速器 ..."
if [ ! -f /etc/docker/daemon.json ] || ! grep -q "registry-mirrors" /etc/docker/daemon.json 2>/dev/null; then
  mkdir -p /etc/docker
  cat > /etc/docker/daemon.json <<'EOF'
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com"
  ]
}
EOF
  systemctl restart docker
  echo "[2/6] docker 镜像加速已配置并重启 docker"
else
  echo "[2/6] 已存在镜像加速配置，跳过"
fi

# ---------- Step 3: 启动 docker compose ----------
echo ""
echo "[3/6] 启动 docker compose（首次约 5-10 分钟，拉 mysql + build api） ..."
cd "$DEPLOY_DIR"
docker compose --env-file .env.production up -d --build

# 等 mysql healthy
echo "[3/6] 等待 mysql healthy ..."
for i in $(seq 1 60); do
  status=$(docker inspect --format '{{.State.Health.Status}}' \
    "$(docker compose --env-file .env.production ps -q mysql)" 2>/dev/null || echo "")
  if [ "$status" = "healthy" ]; then
    echo "[3/6] mysql healthy"
    break
  fi
  sleep 5
done
if [ "$status" != "healthy" ]; then
  echo "[ERROR] mysql 60 秒内没起来，看日志："
  docker compose --env-file .env.production logs mysql | tail -30
  exit 1
fi

# ---------- Step 4: migration + seed ----------
echo ""
echo "[4/6] 跑 migration ..."
docker compose --env-file .env.production exec -T mysql sh -c \
  'for f in /migrations/*.sql; do echo "  applying $f"; mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" < "$f"; done'

echo "[4/6] 跑 seed ..."
docker compose --env-file .env.production exec -T api npm run seed

# ---------- Step 5: 验证 API ----------
echo ""
echo "[5/6] 验证 API 本机响应 ..."
sleep 3
if curl -fsS http://127.0.0.1:8080/api/health > /tmp/health.json; then
  cat /tmp/health.json
  echo ""
  echo "[5/6] OK"
else
  echo "[ERROR] API 健康检查失败，看日志："
  docker compose --env-file .env.production logs api | tail -30
  exit 1
fi

# ---------- Step 6: nginx + certbot ----------
echo ""
echo "[6/6] 配置 nginx + 签证书 ..."
if [ -z "$EMAIL_FOR_CERT" ]; then
  echo "[6/6] 跳过证书签发（未提供邮箱）"
  echo "      请稍后手动跑："
  echo "      sudo cp $DEPLOY_DIR/api.maxnote.me.conf /etc/nginx/conf.d/"
  echo "      sudo nginx -t && sudo systemctl reload nginx"
  echo "      sudo certbot --nginx -d api.maxnote.me --email YOUR_EMAIL --agree-tos --no-eff-email --redirect"
else
  sudo cp "$DEPLOY_DIR/api.maxnote.me.conf" /etc/nginx/conf.d/
  sudo nginx -t
  sudo systemctl reload nginx
  sudo certbot --nginx -d api.maxnote.me \
    --email "$EMAIL_FOR_CERT" \
    --agree-tos --no-eff-email --redirect
  sudo nginx -t && sudo systemctl reload nginx
  echo "[6/6] OK"
fi

echo ""
echo "=========================================="
echo "部署完成！验证："
echo "  curl https://api.maxnote.me/api/health"
echo "  浏览器打开 https://api.maxnote.me/admin"
echo "=========================================="
