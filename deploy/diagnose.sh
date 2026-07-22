#!/bin/bash
echo "=== OS ==="
cat /etc/os-release 2>/dev/null | head -3
uname -a

echo "=== nginx ==="
which nginx
nginx -v 2>&1
systemctl is-active nginx 2>/dev/null
ls /etc/nginx/conf.d/ 2>/dev/null
ls /etc/nginx/sites-enabled/ 2>/dev/null

echo "=== nginx server_name 扫描 ==="
grep -rh "server_name" /etc/nginx/ 2>/dev/null | grep -v "#" | sort -u

echo "=== docker ==="
docker version --format "client={{.Client.Version}} server={{.Server.Version}}" 2>&1
docker ps --format "{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}" 2>&1

echo "=== certbot ==="
which certbot
certbot --version 2>&1
ls /etc/letsencrypt/live/ 2>/dev/null

echo "=== 控制面板 ==="
which bt 2>/dev/null
ls /www/server/panel/ 2>/dev/null | head -3
ls /www/server/nginx/ 2>/dev/null | head -3

echo "=== 端口占用 ==="
ss -tlnp 2>/dev/null | head -20

echo "=== 官网根目录候选 ==="
ls /var/www/ 2>/dev/null
ls /usr/share/nginx/html/ 2>/dev/null | head -5
ls /www/wwwroot/ 2>/dev/null

echo "=== 已存在的 maxnote 配置 ==="
grep -rl "maxnote" /etc/nginx/ 2>/dev/null
