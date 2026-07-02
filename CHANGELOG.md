# Changelog

## v0.1.0-beta.1 (2026-07-02)

First beta release.

### Features

- Aggregate DNS management across Cloudflare, Huawei Cloud, and DNSPod
- Full DNS record CRUD: create, edit, delete records with support for A, AAAA, CNAME, MX, TXT, CAA, SRV, and more
- Provider management: add, edit, and remove providers with credential verification
- Zone filtering: select which zones to manage per provider
- Resolution line support: view and select resolution lines (线路) for Huawei Cloud and DNSPod
- Dark mode
- i18n (Chinese / English)
- SVG provider logos on zone cards and add-provider form

### Infrastructure

- Hono-based API backend with Upstash Redis for state storage
- Password-based admin authentication with scrypt hashing
- Rate limiting on sensitive endpoints
- Security headers (X-Content-Type-Options, X-Frame-Options, etc.)
- Vercel Serverless deployment support
- Self-hosting support via `npm start` (Node.js / Docker / Railway)
