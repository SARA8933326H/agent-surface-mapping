export const Config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3001', 10),
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
  TRUST_PROXY: process.env.TRUST_PROXY === 'true',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/surface?schema=public',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  SCREENSHOT_DIR: process.env.SCREENSHOT_DIR || './screenshots',
  REPORT_DIR: process.env.REPORT_DIR || './reports-output',
  OLLAMA_HOST: process.env.OLLAMA_HOST,
  OLLAMA_MODEL: process.env.OLLAMA_MODEL,
  DISABLE_LLM: process.env.DISABLE_LLM === 'true',
  WORKER_CONCURRENCY: parseInt(process.env.WORKER_CONCURRENCY || '2', 10),
  QUEUE_ATTEMPTS: parseInt(process.env.QUEUE_ATTEMPTS || '3', 10),
  QUEUE_BACKOFF_DELAY: parseInt(process.env.QUEUE_BACKOFF_DELAY || '5000', 10),
  RATE_LIMIT_TTL: parseInt(process.env.RATE_LIMIT_TTL || '60', 10),
  RATE_LIMIT_LIMIT: parseInt(process.env.RATE_LIMIT_LIMIT || '100', 10),
  VULN_CHECKS_ENABLED: process.env.VULN_CHECKS_ENABLED !== 'false',
  VULN_ACTIVE_PROBES: process.env.VULN_ACTIVE_PROBES !== 'false',
  VULN_PROBE_TIMEOUT: parseInt(process.env.VULN_PROBE_TIMEOUT || '5000', 10),
  // Periodic cleanup of old scans and their on-disk files. Only runs on worker
  // nodes. Set CLEANUP_ENABLED=true on a single worker to avoid duplicate work.
  CLEANUP_ENABLED: process.env.CLEANUP_ENABLED === 'true',
  CLEANUP_INTERVAL_MS: parseInt(process.env.CLEANUP_INTERVAL_MS || '86400000', 10),
  CLEANUP_MAX_AGE_DAYS: parseInt(process.env.CLEANUP_MAX_AGE_DAYS || '30', 10),
  // When set, every API request (except /health) must present this key via
  // the X-API-Key header or ?key= query param. Unset = auth disabled (dev).
  API_KEY: process.env.API_KEY,
  // Allow scans against private/loopback/link-local targets (SSRF risk).
  // Intended for local development only; leave unset in production.
  ALLOW_PRIVATE_TARGETS: process.env.ALLOW_PRIVATE_TARGETS === 'true',
};
