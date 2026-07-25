# Attack Surface Discovery Prototype

A free, open-source attack surface discovery prototype that crawls an authorized website, extracts pages, forms, endpoints, and assets, classifies functionality with heuristics and an optional local LLM, and maps findings to OWASP Top 10 / CWE risks. It also detects common vulnerabilities — missing security headers, insecure cookies, exposed sensitive files, CORS misconfigurations, outdated JavaScript libraries, and more — using passive analysis of crawled data plus a small set of safe, read-only HTTP probes. The result is a polished, interactive dashboard with an attack-surface graph, downloadable reports, and technology stack detection.

**Important:** This tool never generates exploit payloads, attempts bypasses, brute forces, injects SQL, or fuzzes inputs. Vulnerability checks are passive or use bounded, read-only requests (GET/OPTIONS/TRACE) against the target origin. Only scan systems you are authorized to test.

## Architecture

```
attack-surface-prototype/
├── backend/          NestJS API + Prisma + BullMQ worker
├── frontend/         Next.js dashboard (React Flow + Recharts)
├── shared/           TypeScript DTOs and contracts
├── crawler/          Playwright-based crawler
├── classifier/       Heuristic + optional LLM risk mapper
├── knowledge-base/   Local JSON OWASP/CWE mappings
├── reports/          Markdown, JSON, and PDF generators
└── docker/           Dockerfiles
```

- **Monorepo:** pnpm workspaces
- **Queue:** BullMQ backed by Redis
- **Database:** PostgreSQL via Prisma
- **Crawler:** Playwright Chromium with JS rendering, robots/sitemap parsing, and SPA support
- **AI:** Optional local Ollama, Gemma, Qwen, Llama, DeepSeek, or Gemini Free API — the system works without AI using heuristic rules.

## Prerequisites

- Node.js 20+
- pnpm 9+ (`corepack enable` or `npm install -g pnpm`)
- PostgreSQL 15+ (or Docker)
- Redis 7+ (or Docker)
- Playwright browsers: `pnpm --filter @surface/crawler exec playwright install chromium`
- Optional: Ollama for local LLM summaries

## Quick Start (Local)

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Set up environment variables**

   ```bash
   cp .env.example .env
   # Edit .env with your local PostgreSQL and Redis URLs
   ```

3. **Run database migrations**

   ```bash
   pnpm db:migrate
   ```

4. **Start the backend API**

   ```bash
   pnpm start:backend
   ```

5. **Start the worker** (in another terminal)

   ```bash
   pnpm start:worker
   ```

6. **Start the frontend** (in another terminal)

   ```bash
   pnpm start:frontend
   ```

Open [http://localhost:3000](http://localhost:3000) and start a discovery.

## Quick Start (Docker Compose)

```bash
pnpm install              # or skip if you want Docker to install
docker-compose up --build
```

This starts PostgreSQL, Redis, backend API, worker, and frontend on:

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend API: [http://localhost:3001](http://localhost:3001)
- API docs: [http://localhost:3001/api/docs](http://localhost:3001/api/docs) (disabled when `NODE_ENV=production`)

## Production (HTTPS + Managed Postgres/Redis)

Use `docker-compose.prod.yml`. It drops the local postgres/redis containers, requires
`DATABASE_URL`/`REDIS_URL` for your managed services, and puts a Caddy reverse proxy in
front that terminates HTTPS with automatic Let's Encrypt certificates. Migrations run via
`prisma migrate deploy` on backend startup — `migrate dev` is never used against production.

```bash
# .env next to docker-compose.prod.yml:
#   DATABASE_URL=postgresql://user:pass@your-managed-pg:5432/surface
#   REDIS_URL=rediss://your-managed-redis:6379
#   DOMAIN=surface.example.com
#   API_DOMAIN=api.surface.example.com
#   CORS_ORIGIN=https://surface.example.com
docker compose -f docker-compose.prod.yml up --build -d
```

DNS for both `DOMAIN` and `API_DOMAIN` must resolve to the host with ports 80/443 open so
Caddy can issue certificates. Set `TRUST_PROXY=true` (already set in the prod compose) so
rate limiting keys on the real client IP.

## Scaling Workers

Workers are stateless and scale horizontally; crawl jobs retry with exponential backoff
(`QUEUE_ATTEMPTS`, `QUEUE_BACKOFF_DELAY`) and each worker runs `WORKER_CONCURRENCY`
concurrent jobs (default 2).

```bash
docker compose up -d --scale worker=4
```

or set `WORKER_REPLICAS` (default 2) in either compose file.

## How It Works

1. User enters an authorized URL.
2. The backend enqueues a crawl job on BullMQ.
3. The worker launches Playwright, explores the application, and extracts pages, forms, endpoints, assets, cookies, headers, and screenshots.
4. Heuristic classification identifies auth, admin, dashboard, search, CRUD, upload, download, API, GraphQL, and hidden pages.
5. A local JSON knowledge base maps each discovered functionality to OWASP Top 10 and CWE risks.
6. Vulnerability detection runs passive checks on the crawled data (security headers, version disclosure, mixed content, outdated libraries, form weaknesses) and optional read-only probes (sensitive paths, HTTP methods, CORS, cookie flags, HTTPS enforcement), producing evidence-backed findings with remediation guidance.
7. An optional local LLM can summarize existing findings against the same knowledge base; it never invents new vulnerabilities.
8. The backend builds an internal graph of nodes (pages, forms, endpoints, scripts, auth, admin, objects) and edges (navigation, API calls, form actions, imports, relationships).
9. The frontend displays the interactive graph, tables, stats, risks, detected vulnerabilities, screenshots, and reports.

## API Endpoints

| Method | Path                          | Description                        |
| ------ | ----------------------------- | ---------------------------------- |
| POST   | `/scans`                      | Create and enqueue a new scan       |
| GET    | `/scans`                      | List all scans                     |
| GET    | `/scans/:id`                  | Get full scan details              |
| GET    | `/scans/:id/stats`            | Get scan statistics                |
| POST   | `/reports/scans/:id/:format`  | Generate PDF, Markdown, or JSON    |
| GET    | `/reports/:id/download`       | Download a generated report        |
| GET    | `/health`                     | Health check                       |

## Reports

Reports are generated in three formats:

- **PDF:** Rendered via Playwright from a generated HTML report
- **Markdown:** Human-readable summary with OWASP/CWE mapping
- **JSON:** Full machine-readable scan output

Generated reports are stored locally in `./reports-output` (or `/app/reports-output` in Docker).

## Optional Local AI

To enable LLM summaries, set the environment variables and make sure Ollama is running with a model pulled:

```bash
export OLLAMA_HOST=http://localhost:11434
export OLLAMA_MODEL=gemma:2b
ollama pull gemma:2b
```

The LLM is only asked to map existing heuristic classifications to known OWASP/CWE risks from the local knowledge base. It does not invent vulnerabilities.

## Project Structure & Decisions

- **Separate crawler/classifier/reports packages:** Keeps each concern isolated and reusable, and lets the backend stay focused on HTTP/queue orchestration.
- **BullMQ worker:** Long-running crawls run asynchronously so the API remains responsive and users can poll scan status.
- **Shared DTOs:** A single `@surface/shared` package provides the contract between backend and frontend, preventing type drift.
- **Plain JSON knowledge base:** Auditable, editable, and requires no external services. It guarantees the AI never invents vulnerabilities by limiting it to these known mappings.
- **React Flow:** The graph is persisted as JSON nodes/edges and rendered interactively in the dashboard.

## License

MIT — free to use, modify, and extend.
