# 社会消防综合服务（陕西）中心

智慧消防投资演示平台，使用 Next.js、Vinext 和 Cloudflare Workers 构建。包含演示登录、消防态势总览、高德地图、报警处置、设备监控、建筑档案、巡检任务和统计报表。

## 本地运行

1. 安装 Node.js 22.13 或更高版本以及 pnpm。
2. 复制 `.env.example` 为 `.env.local`，填写高德 Web JS API Key 和安全密钥。
3. 运行 `pnpm install`，再运行 `pnpm dev`。
4. 演示账号为 `admin`，密码为 `123456`。

## Cloudflare Workers 部署

项目已经包含 `wrangler.jsonc`，生产域名设置为 `hszhe9.com`。

### 从本机部署

1. 运行 `pnpm exec wrangler login` 登录 Cloudflare。
2. 在 Cloudflare 账户中确认 `hszhe9.com` 已经由该账户管理。
3. 在 `.env.production.local` 中配置：
   - `NEXT_PUBLIC_AMAP_KEY`
   - `NEXT_PUBLIC_AMAP_SECURITY_CODE`
4. 运行 `pnpm deploy`。

### 连接 GitHub 自动部署

在 Cloudflare Workers & Pages 中创建 Worker，连接 GitHub 仓库 `tsuikaii/FireSystem`，选择 `main` 分支，并设置：

- Build command：`pnpm build`
- Deploy command：`pnpm deploy --skip-build`
- Root directory：`/`
- Production branch：`main`
- Node.js version：`22`

在构建变量中添加 `NEXT_PUBLIC_AMAP_KEY` 和 `NEXT_PUBLIC_AMAP_SECURITY_CODE`。它们必须在构建阶段可用，高德控制台的安全域名白名单还需要包含 `hszhe9.com`。

## 登录说明

当前登录是面向投资演示的前端登录门槛，不构成真正的安全鉴权。若要正式开放给客户，应接入 Cloudflare Access，或增加服务端会话与用户数据库。
