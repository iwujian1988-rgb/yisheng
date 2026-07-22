# 小科打字猿部署指南 — api.maxnote.me

**架构（coexist with 已有官网）：**
```
120.26.43.68 (Alibaba Cloud Linux 3)
├── host nginx 1.20.1 (已有，不动)
│   ├── www.maxnote.me / maxnote.me → 原官网（保留）
│   └── api.maxnote.me → 反代到 127.0.0.1:8080（新加）
├── host certbot 1.23.0 (已有，扩展签发 api.maxnote.me)
├── docker compose
│   ├── mysql (内部网络)
│   └── api (绑定 127.0.0.1:8080)
├── python @ 8000 (你别的业务，不动)
└── java @ 8081 (你别的业务，不动)
```

---

## Step 0 — DNS 加 A 记录（你去域名管理后台做）

在你的域名 DNS 管理（阿里云域名控制台 / Cloudflare / 其他）加一条：

| 字段 | 值 |
|---|---|
| 主机记录 | `api` |
| 记录类型 | `A` |
| 记录值 | `120.26.43.68` |
| TTL | 默认（10 分钟） |

**验证生效**（本地 cmd 跑）：
```cmd
nslookup api.maxnote.me
```
解析出 `120.26.43.68` 就 OK。

---

## Step 1 — 上传代码 + 配置到服务器

**1.1 本地打包代码**（在你本地仓库根目录 D:\claude_work\yisheng\repo）：

```cmd
git archive --format=tar.gz -o yisheng.tar.gz HEAD
```

（如果没用 git，用 7zip 把整个 repo 打成 tar.gz 也行，注意要排除 `node_modules` `.git` `.claude` 等）

**1.2 上传到服务器**：

```cmd
scp yisheng.tar.gz root@120.26.43.68:/srv/
scp deploy\.env.production root@120.26.43.68:/srv/.env.production
scp deploy\api.maxnote.me.conf root@120.26.43.68:/srv/api.maxnote.me.conf
```

**1.3 SSH 上去解压**：

```cmd
ssh root@120.26.43.68
```

登入后：
```bash
mkdir -p /srv/yisheng
tar xzf /srv/yisheng.tar.gz -C /srv/yisheng
mv /srv/.env.production /srv/yisheng/deploy/.env.production
ls /srv/yisheng/deploy/
# 期望看到：.env.production  api.maxnote.me.conf  docker-compose.yml  nginx.conf ...
```

---

## Step 2 — 启动 docker 服务

```bash
cd /srv/yisheng/deploy

# 构建并启动（首次约 5-10 分钟，会拉 mysql:8.0 镜像 + build api 镜像）
docker compose --env-file .env.production up -d --build

# 看容器状态（两个容器都应该是 Up，mysql 显示 healthy）
docker compose --env-file .env.production ps

# 看 api 启动日志（应该有 "Yisheng backend listening" 和 "[sql-store] initial load complete"）
docker compose --env-file .env.production logs api | tail -20
```

如果 mysql 一直 restarting，等 1 分钟再看（首次初始化慢）。

---

## Step 3 — 跑 migration + seed

```bash
cd /srv/yisheng/deploy

# 建表
docker compose --env-file .env.production exec -T mysql sh -c \
  'for f in /migrations/*.sql; do echo "applying $f"; mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" < "$f"; done'

# 写入种子数据
docker compose --env-file .env.production exec -T api npm run seed

# 验证：本机 curl 应该返回 200 + JSON
curl -s http://127.0.0.1:8080/api/health | head -3
```

---

## Step 4 — 加 nginx server block + 签证书

```bash
# 把 server block 复制到 nginx 配置目录
sudo cp /srv/yisheng/deploy/api.maxnote.me.conf /etc/nginx/conf.d/

# 测试配置语法
sudo nginx -t

# 重载（此刻 api.maxnote.me 的 HTTP 会跳转到 HTTPS，但 HTTPS 还没证书，所以会失败 —— 没关系）
sudo systemctl reload nginx

# 用 certbot 自动签证书 + 自动改 nginx 配置加 SSL
sudo certbot --nginx -d api.maxnote.me \
  --email YOUR_EMAIL@example.com \
  --agree-tos --no-eff-email \
  --redirect

# 再次重载
sudo nginx -t && sudo systemctl reload nginx
```

`YOUR_EMAIL@example.com` 换成你的邮箱（证书过期前 Let's Encrypt 会发邮件提醒）。

certbot 会自动设置 cron 续期（你什么都不用做）。

---

## Step 5 — 外部验证

```bash
# 5.1 公网访问 API 健康检查
curl https://api.maxnote.me/api/health
# 期望 JSON，storeMode="mysql"，aiConfigured=true，wechatConfigured=true（前提：AppSecret 已填）

# 5.2 公网访问管理后台
curl -I https://api.maxnote.me/admin
# 期望 200

# 5.3 浏览器打开
# https://api.maxnote.me/admin → 用 admin / ChangeMe123! 登录
# 录入至少 1 台设备 serialNo（用于真机绑定）
```

---

## Step 6 — 微信公众平台配置

登录 https://mp.weixin.qq.com：

**6.1 开发管理 → 开发设置 → 服务器域名：**
- request 合法域名：`https://api.maxnote.me`
- uploadFile 合法域名：`https://api.maxnote.me`
- downloadFile 合法域名：`https://api.maxnote.me`

**6.2 开发管理 → 接口设置：**
- 蓝牙：开通

**6.3 设置 → 用户隐私保护指引：**
- 勾选「使用你的蓝牙」
- 信息处理清单 → 第三方 SDK：
  - DashScope（阿里云百炼）：AI 文本整理/OCR/ASR；阿里云计算有限公司
  - 微信开放平台：账号登录；腾讯

---

## Step 7 — 体验版真机自测

**7.1** 微信开发者工具上传代码，选「体验版」。
**7.2** 手机微信扫码进体验版。
**7.3** 跑 3 个场景：

| 场景 | 操作 | 预期 |
|---|---|---|
| 未付费未绑机 | 注册登录 → 首页 | 只能用通用工具 |
| 已付费已绑机未连蓝牙 | 激活 → 绑定 → 不开蓝牙 → 调 AI | 返回**通用整理**结果 |
| 已付费已绑机已连蓝牙 | 激活 → 绑定 → 连上硬件 → 调 AI | 返回**专业整理**结果 |

**7.4** 抓包绕过验证：
```bash
curl -X POST https://api.maxnote.me/api/agent/text \
  -H "Authorization: Bearer <你的token>" \
  -H "X-Device-Session: <你的session>" \
  -H "X-Device-Live: fake-proof" \
  -H "Content-Type: application/json" \
  -d '{"templateType":"general","rawText":"测试"}'
# 期望：不返回医疗 prompt 的内容
```

---

## Step 8 — 提交审核

微信公众平台 → 版本管理 → 提交审核，填：
- 服务类目：「工具 - 效率」
- 测试账号说明：「需配合蓝牙硬件使用。账号 A 未绑定硬件，可体验通用编辑功能」
- 用户协议 / 隐私政策链接：填小程序内路径

---

## 常见问题

**Q: docker compose build 拉镜像超时**
A: 阿里云服务器配置 docker 镜像加速器：
```bash
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json <<-'EOF'
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com"
  ]
}
EOF
sudo systemctl restart docker
```

**Q: certbot 签证书失败 "Connection refused"**
A: 80 端口被占或安全组没放。检查 `sudo ss -tlnp | grep :80` 和阿里云安全组。

**Q: api 容器一直 restarting**
A: `docker compose logs api` 看错误。常见：
- MySQL 没起完 → 等 30 秒
- AppSecret 没填 → 编辑 `.env.production`

**Q: 想看数据库**
A:
```bash
docker compose --env-file .env.production exec mysql \
  mysql -uyisheng -p"$DB_PASSWORD" yisheng
```

**Q: 想看日志**
A:
```bash
docker compose --env-file .env.production logs -f api    # 实时 API 日志
docker compose --env-file .env.production logs -f mysql  # 实时 MySQL 日志
```
