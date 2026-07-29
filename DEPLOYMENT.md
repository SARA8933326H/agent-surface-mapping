# Deployment Guide

This guide covers running the attack-surface prototype in production with managed Postgres, managed Redis, HTTPS, and a TLS-terminating reverse proxy.

## Prerequisites

- A managed Postgres database (e.g., AWS RDS, Google Cloud SQL, Supabase, or a self-hosted instance).
- A managed Redis instance (e.g., AWS ElastiCache, Upstash, Redis Cloud, or self-hosted) used by BullMQ for the crawl queue.
- A server or container platform with Node.js 20+ and pnpm 9.
- A domain name and a reverse proxy (Caddy, nginx, Traefik, or a cloud load balancer) that terminates TLS.

## Environment variables

Copy `.env.example` to `.env` and fill in the production values.

Critical variables:

| Variable | Purpose | Production value |
|----------|---------|------------------|
| `DATABASE_URL` | Postgres connection string | `postgresql://user:pass@host:5432/surface?schema=public` |
| `REDIS_URL` | Redis connection string | `redis://host:6379` or `rediss://...` with TLS |
| `NODE_ENV` | Runtime mode | `production` |
| `PORT` | API port inside the container | `3001` |
| `CORS_ORIGIN` | Allowed frontend origin | `https://app.example.com` (never `*`) |
| `API_KEY` | Shared API key for backend/frontend | A long random string |
| `NEXT_PUBLIC_API_KEY` | Same key exposed to the frontend bundle | Same as `API_KEY` |
| `NEXT_PUBLIC_API_URL` | Public API URL | `https://api.example.com` |
| `TRUST_PROXY` | Trust `X-Forwarded-For` from the reverse proxy | `true` |
| `ALLOW_PRIVATE_TARGETS` | Allow scanning private/internal targets | `false` (unset) |
| `DOMAIN` / `API_DOMAIN` | Used by Caddy for Let's Encrypt | `app.example.com` / `api.example.com` |

## Database migrations

Always run Prisma migrations as a separate deployment step before starting the API or workers. Do **not** use `prisma migrate dev` in production.

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm db:deploy
```

`pnpm db:deploy` runs `prisma migrate deploy`, which applies pending migrations without generating a new migration or prompting.

## Docker Compose (production)

The repository includes `docker-compose.prod.yml`, which builds the API, worker, and frontend images and uses Caddy to obtain and renew TLS certificates automatically.

```bash
# Create a .env file first, then:
docker compose -f docker-compose.prod.yml up -d --build
```

Caddy will issue certificates for `DOMAIN` and `API_DOMAIN` via Let's Encrypt. Make sure DNS records for those domains point to the server.

## Horizontal worker scaling

Increase the worker replica count in `docker-compose.prod.yml` or set `WORKER_REPLICAS` in your environment. All workers share the same Redis-backed BullMQ queue and pick up jobs automatically.

```yaml
services:
  worker:
    deploy:
      replicas: 3
```

Tune concurrency per worker with `WORKER_CONCURRENCY`.

## Rate limiting and CORS

Rate limiting is keyed by IP. When the API sits behind a reverse proxy, set `TRUST_PROXY=true` so the real client IP is read from `X-Forwarded-For`. CORS origins must be an explicit comma-separated list; never use `*` in production.

## Monitoring

- `GET /health` on the API returns a JSON status payload.
- BullMQ dashboard and queue metrics are not exposed by default; add a dedicated monitoring worker or dashboard if needed.

## Backup and cleanup

Schedule regular Postgres backups. To prevent disk bloat from old screenshots and reports, enable the cleanup service by setting `CLEANUP_ENABLED=true` and `CLEANUP_MAX_AGE_DAYS=30` on one worker instance.
