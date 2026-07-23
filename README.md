# Attack Surface Discovery Prototype

A free, open-source attack surface discovery prototype that crawls an authorized website, extracts pages, forms, endpoints, and assets, classifies functionality with heuristics and an optional local LLM, and maps findings to OWASP Top 10 / CWE risks. The result is a polished, interactive dashboard with an attack-surface graph, downloadable reports, and technology stack detection.

**Important:** This is a discovery and mapping tool only. It does not generate exploit payloads, attempt bypasses, brute force, SQL injection, or any attacks.

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
- API docs: [http://localhost:3001/api/docs](http://localhost:3001/api/docs)

## How It Works

1. User enters an authorized URL.
2. The backend enqueues a crawl job on BullMQ.
3. The worker launches Playwright, explores the application, and extracts pages, forms, endpoints, assets, cookies, headers, and screenshots.
4. Heuristic classification identifies auth, admin, dashboard, search, CRUD, upload, download, API, GraphQL, and hidden pages.
5. A local JSON knowledge base maps each discovered functionality to OWASP Top 10 and CWE risks.
6. An optional local LLM can summarize existing findings against the same knowledge base; it never invents new vulnerabilities.
7. The backend builds an internal graph of nodes (pages, forms, endpoints, scripts, auth, admin, objects) and edges (navigation, API calls, form actions, imports, relationships).
8. The frontend displays the interactive graph, tables, stats, risks, screenshots, and reports.

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
