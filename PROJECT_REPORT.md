# Agent Surface Mapping — Detailed Project Report

**Repository:** https://github.com/SARA8933326H/agent-surface-mapping  
**Branch:** `dev`  
**Last updated:** August 2026  
**Status:** Functionally complete prototype, all builds and tests passing locally

---

## 1. Executive Summary

Agent Surface Mapping is an **authorized attack-surface discovery and vulnerability-mapping platform**. It crawls a target website, extracts its structure and behavior, classifies discovered functionality, and maps each finding to OWASP Top 10 2021 / CWE risks. The result is presented in an interactive Next.js dashboard with graphs, tables, downloadable reports, and recurring-scan support.

The tool is **read-only and passive by design** — it never sends exploit payloads, fuzzes inputs, brute forces, or performs active exploitation. It is intended for security professionals to assess applications they are authorized to test.

---

## 2. Project Goals

1. Provide a fast, single-command overview of a web application's pages, forms, endpoints, and assets.
2. Detect common security misconfigurations using passive analysis and safe HTTP probes.
3. Map every discovered functionality to known OWASP/CWE risks with evidence and remediation guidance.
4. Track changes over time through recurring scans and diffing.
5. Remain small, auditable, and easy to deploy with managed Postgres/Redis and HTTPS.

---

## 3. Architecture

The project is a pnpm monorepo.

```
agent-surface-mapping/
├── backend/          NestJS API + Prisma + BullMQ worker
├── frontend/         Next.js 14 dashboard (React Flow + Recharts)
├── shared/           TypeScript DTOs and contracts
├── crawler/          Playwright-based browser crawler
├── classifier/       Heuristic page classifier + optional LLM risk mapper
├── reports/          PDF, Markdown, JSON, TXT report generators
├── knowledge-base/   Local JSON OWASP/CWE mappings and risk patterns
└── docker/           Dockerfiles and Caddy configuration
```

### Technology Stack

| Layer | Technology |
|-------|------------|
| Language | TypeScript |
| Runtime | Node.js 20+ |
| Package Manager | pnpm 9 |
| API Framework | NestJS 10 |
| Database | PostgreSQL 15+ |
| ORM | Prisma 5 |
| Queue | BullMQ + Redis 7 |
| Browser Automation | Playwright |
| Frontend | Next.js 14, React, Tailwind CSS |
| Graph Rendering | React Flow |
| Charts | Recharts |
| PDF Reports | Playwright HTML-to-PDF |
| Reverse Proxy / HTTPS | Caddy with Let's Encrypt |

---

## 4. Module Descriptions

### 4.1 Crawler (`crawler/`)

- Launches Playwright Chromium (headless or headed).
- Respects `robots.txt` and optionally parses `sitemap.xml`.
- Crawls internal links up to configurable `maxPages` and `maxDepth`.
- Extracts:
  - Page URLs, titles, status codes, response headers, cookies
  - Forms (action, method, fields, buttons)
  - Endpoints (REST, GraphQL, static, unknown)
  - Assets (scripts, stylesheets, images, fonts, other)
  - Links inside JavaScript responses
- Captures screenshots per page.
- Supports single-origin mode and abort hooks for cancellation/timeout.

### 4.2 Classifier (`classifier/`)

- Heuristically classifies pages, endpoints, and forms into functionality types.
- Detects 21 categories:
  `AUTH`, `ADMIN`, `DASHBOARD`, `SEARCH`, `CRUD`, `UPLOAD`, `DOWNLOAD`, `API`, `GRAPHQL`, `HIDDEN`, `PAYMENT`, `OAUTH`, `PROFILE`, `SETTINGS`, `COMMENT`, `CONTACT`, `NEWSLETTER`, `WEBHOOK`, `REPORTING`, `MONITORING`, `DOCS`.
- Matches classifications against the local knowledge base to produce risk findings.
- Optionally summarizes findings with a local Ollama LLM (Gemma, Qwen, Llama, etc.). The LLM is constrained to the existing knowledge base and cannot invent vulnerabilities.

### 4.3 Backend (`backend/`)

- **API server** (`main.ts`) exposes REST endpoints for scan lifecycle, reports, and health.
- **Worker** (`worker.ts`) consumes BullMQ jobs, runs the crawler, classifier, vulnerability checks, and reconnaissance.
- **Scheduler** (`scheduler.service.ts`) re-enqueues recurring scans when their interval elapses.
- **Cleanup service** (`cleanup.service.ts`) deletes scans, screenshots, and reports older than a configurable age.
- **Recon service** (`recon.service.ts`) gathers whois, DNS records, and Wayback Machine URLs.
- **Risk service** loads the knowledge base and maps classifications to risks.
- **Vulnerability service** runs passive checks and active probes.
- **Tech service** detects technology stack from headers and asset URLs.
- **Graph service** builds an internal node/edge graph of the application.
- **API key guard** and **throttler** protect all endpoints except `/health`.
- **SSRF target validator** blocks private, loopback, link-local, and reserved IPs (including DNS resolution checks).

### 4.4 Frontend (`frontend/`)

- Next.js 14 app router with server-side data fetching.
- Pages:
  - `/` — landing / scan input
  - `/dashboard` — scan stats overview
  - `/scans` — list of all scans
  - `/scan/[id]` — scan detail with tabs
  - `/scan/[id]/graph` — interactive attack-surface graph
  - `/scan/[id]/reports` — report generation and download
- Tabs on scan detail: Overview, Pages, Forms, APIs, Assets, Risks, Vulnerabilities, Changes, Recon, Screenshots, Reports.
- Live progress refresher for running scans.
- Scan cancellation button.

### 4.5 Reports (`reports/`)

Generates four report formats from a `ScanDetailsDto`:

| Format | File | Use Case |
|--------|------|----------|
| JSON | `json.ts` | Machine-readable full export |
| Markdown | `markdown.ts` | Human-readable document |
| PDF | `pdf.ts` | Shareable rendered document |
| TXT | `txt.ts` | Plain-text CLI-friendly output |

### 4.6 Shared (`shared/`)

Contains all TypeScript interfaces and enums shared between backend, frontend, crawler, classifier, and reports:

- `ScanStatus`, `EndpointType`, `AssetType`, `FunctionalityType`, `Severity`
- `CrawlOptions`, `CrawlResult`, `PageExtract`, `FormExtract`, `EndpointExtract`, `AssetExtract`
- `PageClassification`, `GraphData`, `RiskDto`, `DomainInfoDto`
- `CreateScanDto`, `ScanDto`, `ScanDetailsDto`, `ScanStatsDto`, `ScanDiffDto`, `ReportDto`

### 4.7 Knowledge Base (`knowledge-base/`)

- `owasp-mapping.json` — OWASP Top 10 2021 categories with representative CWEs.
- `risk-patterns.json` — maps each `FunctionalityType` to 2–3 risks with OWASP, CWE, severity, and description.

---

## 5. API Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/health` | Health check including DB and Redis connectivity | Public |
| POST | `/scans` | Create and enqueue a new scan | API key |
| GET | `/scans` | List all scans | API key |
| GET | `/scans/:id` | Get full scan details | API key |
| GET | `/scans/:id/stats` | Get scan statistics | API key |
| GET | `/scans/:id/diff` | Diff against previous completed scan | API key |
| POST | `/scans/:id/cancel` | Cancel a pending/running scan | API key |
| POST | `/reports/scans/:scanId/:format` | Generate a report (`pdf`, `markdown`, `json`, `txt`) | API key |
| GET | `/reports/:id/download` | Download a generated report | API key (in `?key=` for direct links) |

---

## 6. Database Schema (Prisma)

### Models

- **Scan** — top-level scan record, stores status, progress, options, recurring interval, errors, tech stack, classifications, domain info.
- **Page** — crawled pages with headers, cookies, links, screenshot path.
- **Form** — extracted forms linked to a page or scan.
- **Endpoint** — discovered API/static/GraphQL endpoints.
- **Asset** — discovered assets (scripts, stylesheets, images, fonts).
- **Graph** — persisted node/edge graph for the scan.
- **Risk** — mapped or detected risk findings.
- **Report** — generated report metadata and file path.

All child records cascade-delete when a scan is deleted.

### Recent Migrations

- `20260725190000_add_recurring_scans` — added `recurringIntervalMin` to `Scan`.
- `20260731190000_add_domain_info` — added `domainInfo` JSONB column to `Scan`.

---

## 7. Security Checks Catalog

### Passive Checks (no extra requests)

| Check | Evidence Source |
|-------|-----------------|
| Missing Content-Security-Policy | Response headers |
| Missing Clickjacking Protection | Response headers / CSP frame-ancestors |
| Missing X-Content-Type-Options | Response headers |
| Missing HSTS | Response headers (HTTPS only) |
| Missing Referrer-Policy | Response headers |
| Technology Version Disclosure | `Server`, `X-Powered-By`, etc. |
| Mixed Content | HTTPS pages loading HTTP assets |
| Vulnerable JavaScript Libraries | Asset URL patterns (jQuery, Bootstrap, AngularJS) |
| Credentials Sent Over HTTP | Password forms with HTTP action |
| Possible Missing CSRF Protection | POST forms without hidden token |
| JWT With alg=none | Cookies / headers |
| JWT Without Expiry | Cookies / headers |

### Active Probes (safe, read-only GET/OPTIONS/TRACE/POST introspection)

| Check | Request |
|-------|---------|
| Exposed `.git` directory | `GET /.git/HEAD`, `/.git/config` |
| Exposed `.env` file | `GET /.env` |
| Exposed backup archives | `GET /backup.zip`, `/backup.sql`, `/db.sql`, `/config.php.bak` |
| Exposed `.svn`, `.DS_Store`, `phpinfo`, `server-status`, Spring actuator, WordPress users | `GET` on known paths |
| Dangerous HTTP methods | `OPTIONS /` |
| TRACE enabled (XST) | `TRACE /` |
| CORS reflects arbitrary origins with credentials | `GET /` with `Origin` header |
| Overly permissive CORS (`*`) | `GET /` with `Origin` header |
| Cookie missing security flags | `GET /` response cookies |
| Site served over plain HTTP | `GET http://target` |
| Deprecated TLS version | Raw TLS handshake |
| Expired / expiring certificate | Raw TLS handshake |
| Directory listing enabled | `GET` on derived directories |
| GraphQL introspection enabled | `POST /graphql` introspection query |

---

## 8. Reconnaissance Features

For public domain targets, the worker gathers:

- **Whois:** registrar, expiry date, days until expiry, name servers, DNSSEC status.
- **DNS records:** A, AAAA, CNAME, MX, NS, SOA, TXT, DMARC.
- **Wayback Machine:** up to 10,000 unique historical URLs from `web.archive.org` CDX API.

These are stored in `Scan.domainInfo` and rendered on the **Recon** tab.

---

## 9. Deployment

### Local Development

```bash
pnpm install
cp .env.example .env
# Start Postgres + Redis (Docker Desktop must be running)
docker compose up -d postgres redis
pnpm db:deploy
pnpm dev
```

### Production

```bash
# .env must contain managed DATABASE_URL, REDIS_URL, DOMAIN, API_DOMAIN, API_KEY, etc.
docker compose -f docker-compose.prod.yml up --build -d
```

Production stack:
- Backend API container
- Worker containers (horizontally scalable)
- Frontend static container
- Caddy reverse proxy with automatic Let's Encrypt TLS
- External managed Postgres and Redis

Migrations run via `pnpm db:deploy` (which calls `prisma migrate deploy`), never `prisma migrate dev`.

---

## 10. Configuration

Key environment variables:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres connection string |
| `REDIS_URL` | Redis connection string |
| `NODE_ENV` | `development` or `production` |
| `PORT` | Backend port (default 3001) |
| `CORS_ORIGIN` | Allowed frontend origin(s) |
| `API_KEY` / `NEXT_PUBLIC_API_KEY` | Shared API key (required in production) |
| `ALLOW_PRIVATE_TARGETS` | Allow scanning localhost/private IPs (dev only) |
| `TRUST_PROXY` | Trust `X-Forwarded-For` from reverse proxy |
| `WORKER_REPLICAS` / `WORKER_CONCURRENCY` | Worker scaling |
| `QUEUE_ATTEMPTS` / `QUEUE_BACKOFF_DELAY` | BullMQ retries |
| `RATE_LIMIT_TTL` / `RATE_LIMIT_LIMIT` | Rate limiting |
| `SCAN_MAX_DURATION_MIN` | Maximum scan runtime guard |
| `CLEANUP_ENABLED` / `CLEANUP_MAX_AGE_DAYS` | Old scan cleanup |
| `VULN_*` | Enable/disable vulnerability checks and probes |
| `OLLAMA_HOST` / `OLLAMA_MODEL` / `DISABLE_LLM` | Optional local LLM integration |

---

## 11. Testing

### Test Suites

| Package | Files | Tests | Status |
|---------|-------|-------|--------|
| `classifier` | `heuristics.spec.ts` | 14 | ✅ pass |
| `backend` | passive checks, integration, target validator, cleanup, crawl worker, health, recon | 70 | ✅ pass |
| **Total** | | **84** | ✅ **pass** |

### Running Tests

```bash
pnpm --filter @surface/classifier test
pnpm --filter @surface/backend test
pnpm --filter @surface/backend typecheck
pnpm --filter @surface/frontend build
```

---

## 12. CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push to `master`/`dev` and every PR to `master`:

1. Checkout
2. Install pnpm via `packageManager` field
3. Setup Node.js 24
4. Install dependencies with `--frozen-lockfile`
5. Build all packages
6. Generate Prisma client
7. Run classifier tests
8. Run backend tests
9. Typecheck backend
10. Build frontend
11. Upload artifacts on failure

---

## 13. Comparison with FinalRecon

| Capability | FinalRecon | This Project |
|------------|------------|--------------|
| Header analysis | ✅ | ✅ |
| Cookie breakdown | ✅ | ✅ |
| SSL certificate info | ✅ | ✅ (protocol + expiry) |
| Website crawler | ✅ | ✅ (deeper, JS-rendered) |
| robots.txt / sitemap | ✅ | ✅ |
| Links in JS | ✅ | ✅ |
| Whois | ✅ | ✅ |
| DNS enumeration | ✅ (40+ record types) | ✅ (A, AAAA, CNAME, MX, NS, SOA, TXT, DMARC) |
| Subdomain enumeration (external APIs) | ✅ (15 sources) | ❌ not implemented |
| Directory brute force | ✅ (wordlist + soft-404 filter) | ⚠️ fixed sensitive-path probes only |
| Wayback Machine | ✅ (50k URLs, triaged) | ✅ (10k URLs) |
| Port scan | ✅ (top 1000) | ❌ not implemented |
| TXT export | ✅ | ✅ |
| Interactive dashboard | ❌ | ✅ |
| Recurring scans + diffing | ❌ | ✅ |
| Risk mapping to OWASP/CWE | ❌ | ✅ |
| PDF/JSON/Markdown reports | ❌ | ✅ |

**Key difference:** FinalRecon is an OSINT/recon CLI; this project is an authorized, interactive attack-surface mapper with vulnerability detection and risk mapping.

---

## 14. Known Limitations

- No active exploitation, fuzzing, or brute force (by design).
- No subdomain enumeration from external threat-intel sources.
- No port scanning.
- No full wordlist-based directory brute force.
- Outdated-library detection is signature-based, not a full CVE database.
- LLM integration is optional and local-only.

---

## 15. Future Roadmap

High-value next features:

1. **Subdomain enumeration** — integrate crt.sh, VirusTotal, Chaos free tier.
2. **Port scanning** — fast top-1000 TCP scan against discovered subdomains/IPs.
3. **Wordlist directory brute force** — with soft-404 filtering and file extensions.
4. **Webhook/email alerts** — notify on scan completion or new critical findings.
5. **Scan list pagination and search** — for large recurring scan histories.
6. **Full CVE-based library checker** — integrate OSV or similar API.
7. **Multi-tenant / user accounts** — move from single shared API key to per-user auth.

---

## 16. Verification Status

- ✅ All workspace packages build
- ✅ Backend typecheck passes
- ✅ Frontend production build succeeds
- ✅ 84/84 tests pass
- ✅ Recurring scheduler verified live
- ✅ Scan diffing verified live
- ✅ New vulnerability detections verified live against local fixture
- ✅ TXT reports, whois/DNS, and Wayback Machine implemented and unit-tested
- ⏳ CI status pending next push to `origin/dev`
- ⏳ Latest database migration pending deployment to local Postgres

---

## 17. How to Push Current State

```bash
git switch dev
git push origin dev
```

Then apply the migration:

```bash
# Ensure Docker Desktop + Postgres are running
docker compose up -d postgres redis
pnpm db:deploy
```

---

*End of report.*
