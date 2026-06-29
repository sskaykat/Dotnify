<div align="center">

<img src="public/favicon.png" alt="dotnify" width="100" height="100" />

# dotnify

[English](./README.md) | 简体中文

**一个 DNS 统一管理工具，把多个 DNS 供应商的域名聚合到同一个界面里。**

</div>

---

## 功能

- **多供应商** — 统一管理所有 DNS 供应商的记录
- **完整的 DNS CRUD** — 创建、编辑、删除 A/AAAA/CNAME/TXT/MX/NS/SRV 等记录
- **密码保护** — 单管理员账户，密码使用 scrypt 哈希存储
- **轻量快速** — Vite + React 前端，Vercel Serverless Functions 后端，Upstash Redis 存储

## 本地开发

```bash
git clone https://github.com/airtouch97/Dotnify.git
cd Dotnify
npm install
```

创建 `.env.local`，填入 Upstash 凭证：

```
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxxxxx
```

启动开发服务器：

```bash
npm run dev
```

打开 http://localhost:5173，首次访问会要求设置管理员密码。

其他命令：

```bash
npm run build        # 生产构建（TypeScript 检查 + Vite 构建）
npm run typecheck    # 类型检查前端和 API 代码
npm run preview      # 本地预览生产构建
```

## 项目结构

```
├── api/                          # 后端（Vercel Serverless Functions）
│   ├── _lib/
│   │   ├── auth.ts               # 密码哈希（scrypt）、会话管理
│   │   ├── cloudflare.ts         # Cloudflare API 客户端（REST + Bearer Token）
│   │   ├── huawei.ts             # 华为云 DNS 客户端（REST + AK/SK HMAC-SHA256 签名）
│   │   ├── http.ts               # 请求/响应辅助（查询字符串、请求体解析）
│   │   ├── middleware.ts         # 鉴权中间件（Bearer Token 校验）
│   │   ├── redis.ts              # Upstash Redis 客户端 + 键名定义
│   │   ├── response.ts           # JSON 响应辅助（ok、error、notFound 等）
│   │   └── types.ts              # 后端共享类型（Provider、DnsRecord 等）
│   ├── auth/
│   │   ├── login.ts              # POST /api/auth/login
│   │   ├── logout.ts             # POST /api/auth/logout
│   │   ├── me.ts                 # GET  /api/auth/me
│   │   └── setup.ts              # POST /api/auth/setup
│   ├── providers/
│   │   ├── index.ts              # GET/POST /api/providers
│   │   ├── verify.ts             # POST /api/providers/verify
│   │   ├── [id].ts               # GET/PATCH/DELETE /api/providers/:id
│   │   └── [id]/zones.ts         # GET /api/providers/:id/zones
│   └── zones/
│       ├── index.ts              # GET /api/zones
│       └── [zoneId]/
│           ├── lines.ts          # GET /api/zones/:zoneId/lines
│           └── records/
│               ├── index.ts      # GET/POST /api/zones/:zoneId/records
│               └── [recordId].ts # PATCH/DELETE /api/zones/:zoneId/records/:recordId
├── src/                          # 前端（React + Vite）
│   ├── components/               # 可复用 UI 组件
│   ├── hooks/                    # useAuth、useFetch（类 SWR，stale-while-revalidate）
│   ├── lib/                      # API 客户端、类型、常量
│   ├── pages/
│   │   ├── Home.tsx              # 仪表盘，展示统计和域名概览
│   │   ├── Domains.tsx           # 所有供应商的域名列表
│   │   ├── Records.tsx           # DNS 记录表格 + 创建/编辑表单
│   │   ├── Providers.tsx         # 供应商管理（添加、测试连通性、删除）
│   │   ├── Login.tsx             # 登录页
│   │   └── Setup.tsx             # 初始管理员设置
│   ├── router.tsx                # React Router 配置，含鉴权守卫
│   └── App.tsx                   # 根组件
├── huawei_line.json              # 华为云解析线路数据（静态文件，约 300 条）
├── scripts/
│   └── vite-plugin-dev-api.ts    # Vite 插件：开发时将 api/ 作为路由服务
├── vercel.json                   # Vercel 部署配置
└── vite.config.ts                # Vite 配置，含开发 API 插件
```

## 技术栈

| 层级 | 技术 |
|---|---|
| 前端 | React 18, React Router 6, Tailwind CSS |
| 后端 | Vercel Serverless Functions (TypeScript) |
| 数据库 | Upstash Redis |
| 构建 | Vite 5, TypeScript 5 |

## 许可证

[AGPL-v3](./LICENSE)
