<div align="center">

<img src="public/favicon.png" alt="dotnify" width="100" height="100" />

# dotnify

English|[简体中文](./README.zh-CN.md)

**A unified DNS management tool that aggregates domains from multiple DNS providers into a single interface.**

</div>

---

## Features

- **Multi-provider** — Manage DNS records across all your providers in one place
- **Full DNS CRUD** — Create, edit, and delete A/AAAA/CNAME/TXT/MX/NS/SRV records
- **Password-protected** — Single admin account with scrypt-hashed credentials
- **Fast and lightweight** — Vite + React frontend, Vercel Serverless Functions backend, Upstash Redis for storage

## Local Development

```bash
git clone https://github.com/airtouch97/Dotnify.git
cd Dotnify
npm install
```

Create `.env.local` with your Upstash credentials:

```
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxxxxx
```

Start the dev server:

```bash
npm run dev
```

Open http://localhost:5173. On first visit you'll be prompted to set up an admin password.

Other commands:

```bash
npm run build        # Production build (TypeScript check + Vite build)
npm run typecheck    # Type check frontend and API code
npm run preview      # Preview production build locally
```

## Project Structure

```
├── api/                          # Backend (Vercel Serverless Functions)
│   ├── _lib/
│   │   ├── auth.ts               # Password hashing (scrypt), session management
│   │   ├── cloudflare.ts         # Cloudflare API client (REST + Bearer token)
│   │   ├── huawei.ts             # Huawei Cloud DNS client (REST + AK/SK HMAC-SHA256 signing)
│   │   ├── http.ts               # Request/response helpers (query string, body parsing)
│   │   ├── middleware.ts         # Auth middleware (Bearer token validation)
│   │   ├── redis.ts              # Upstash Redis client + key definitions
│   │   ├── response.ts           # JSON response helpers (ok, error, notFound, etc.)
│   │   └── types.ts              # Shared backend types (Provider, DnsRecord, etc.)
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
├── src/                          # Frontend (React + Vite)
│   ├── components/               # Reusable UI components
│   ├── hooks/                    # useAuth, useFetch (SWR-like with stale-while-revalidate)
│   ├── lib/                      # API client, types, constants
│   ├── pages/
│   │   ├── Home.tsx              # Dashboard with stats and domain overview
│   │   ├── Domains.tsx           # Domain list across all providers
│   │   ├── Records.tsx           # DNS record table + create/edit forms
│   │   ├── Providers.tsx         # Provider management (add, test, delete)
│   │   ├── Login.tsx             # Login page
│   │   └── Setup.tsx             # Initial admin setup
│   ├── huawei_line.json          # Huawei Cloud resolution line data (static, ~300 entries)
│   ├── router.tsx                # React Router config with auth guards
│   └── App.tsx                   # Root component
├── scripts/
│   └── vite-plugin-dev-api.ts    # Vite plugin: serves api/ as routes during dev
├── vercel.json                   # Vercel deployment config
└── vite.config.ts                # Vite config with dev API plugin
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router 6, Tailwind CSS |
| Backend | Vercel Serverless Functions (TypeScript) |
| Database | Upstash Redis |
| Build | Vite 5, TypeScript 5 |

## License

[AGPL-v3](./LICENSE)
