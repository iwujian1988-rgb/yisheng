# 生产部署

## 准备

1. **域名 + 证书**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d {YOUR_DOMAIN}
   ```
   证书路径默认 `/etc/letsencrypt/live/{YOUR_DOMAIN}/`。
   Docker 部署时把证书放到 `deploy/certs/live/{YOUR_DOMAIN}/` 下。

2. **微信公众平台配置**
   - 服务器域名 → request：`https://{YOUR_DOMAIN}`
   - 服务器域名 → uploadFile：`https://{YOUR_DOMAIN}`
   - 服务器域名 → downloadFile：`https://{YOUR_DOMAIN}`
   - 接口设置 → 蓝牙：开通
   - 用户隐私保护指引 → 勾选「使用你的蓝牙」
   - 信息处理清单 → 第三方 SDK：DashScope、微信开放平台

3. **DashScope 密钥**：在阿里云控制台获取 API Key。

4. **MySQL**：Docker 部署自带 MySQL 8.0 容器；裸机部署需自备 MySQL 8.x 并 `CREATE DATABASE yisheng DEFAULT CHARSET utf8mb4`。

## 方式 A：Docker Compose（推荐）

依赖：`docker-compose.yml` + `.env.production.example` + `deploy.sh`。

```bash
cd deploy
cp .env.production.example .env.production
vim .env.production       # 填密钥/密码/微信 AppID

# 首次部署：先跑 migration（容器内 mysql 客户端逐文件灌 SQL）
./deploy.sh --migrate

# 完整起服务
./deploy.sh
docker compose --env-file .env.production ps   # 全部 healthy

# 写入种子数据（管理员账号 + 默认 prompts + 内置模板）
./deploy.sh --seed

curl https://{YOUR_DOMAIN}/api/health
```

证书挂载点：`./certs` → 容器内 `/etc/letsencrypt`。
Nginx 配置：`./nginx.conf` 中所有 `{YOUR_DOMAIN}` 需替换为真实域名（首次部署后保留只读挂载，修改后 `docker compose exec nginx nginx -s reload`）。

## 方式 B：裸机部署

```bash
# 后端
cd backend
npm ci --omit=dev
cp .env.production.example .env.production
vim .env.production
npm run migrate up      # MySQL 已就绪后
npm run seed            # 首次部署写入种子
node src/server.js      # 推荐用 pm2: pm2 start src/server.js --name api

# Nginx
cp ../deploy/nginx.conf /etc/nginx/conf.d/yisheng.conf
vim /etc/nginx/conf.d/yisheng.conf   # 替换 {YOUR_DOMAIN}
nginx -t && systemctl reload nginx
```

## 微信小程序前端

1. 修改 `app.js` 的 `globalData.baseUrl` 为 `https://{YOUR_DOMAIN}`。
2. 微信开发者工具上传 → 提交审核。
3. 体验版自测：登录 → 激活 → 绑定设备 → AI/OCR/ASR → 文本传输。

## 常用运维命令

```bash
# 查看日志
docker compose --env-file .env.production logs -f api
docker compose --env-file .env.production logs -f nginx

# 升级镜像（CI 触发或手动）
cd deploy
git pull
docker compose --env-file .env.production build api
docker compose --env-file .env.production up -d api

# 备份 MySQL
docker compose --env-file .env.production exec -T mysql \
  mysqldump -uroot -p"$DB_ROOT_PASSWORD" "$DB_NAME" > backup-$(date +%F).sql
```
