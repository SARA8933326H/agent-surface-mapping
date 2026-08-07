# Attack Surface Discovery — Project Demo Script

This script is designed for a live demo or presentation of the **Attack Surface Discovery** prototype. It covers the project architecture, live demo flow, and the actual results from a scan of `https://httpbin.org`.

---

## Slide 1: Opening Hook (30 seconds)

> “Most security teams start testing with a list of URLs someone emailed them. But modern web apps are full of hidden pages, third-party APIs, forms, and admin panels that never make it onto that list. We built a free, open-source prototype that maps the attack surface of authorized web applications automatically — crawling like a real user, classifying functionality, and mapping it to OWASP Top 10 and CWE risks.”

---

## Slide 2: What It Does (1 minute)

> “The system does four things in one pipeline:
> 1. **Crawl & Discover** — Uses a headless browser to render SPAs, follow links, parse robots.txt and sitemaps, and capture pages, forms, APIs, and assets.
> 2. **Classify & Map** — Labels each page with functionality like API, Auth, Payment, OAuth, CRUD, using heuristics and an optional local LLM.
> 3. **Find Risks** — Matches discovered functionality against known OWASP Top 10 and CWE risk patterns, plus passive header/form/CORS checks.
> 4. **Visualize & Report** — Shows an interactive attack-surface graph, detailed tabs, and exports PDF, Markdown, JSON, and TXT reports.”

---

## Slide 3: Architecture (1 minute)

Show or describe the module diagram:

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│  Next.js    │──────▶│  NestJS API  │──────▶   Redis     │
│  Frontend   │      │              │      │  (BullMQ)   │
└─────────────┘      └──────────────┘      └──────┬──────┘
                            │                       │
                            ▼                       ▼
                     ┌──────────────┐      ┌─────────────┐
                     │   PostgreSQL │      │   Worker    │
                     │   (Prisma)   │      │ (Playwright)│
                     └──────────────┘      └─────────────┘
```

> “The frontend is Next.js 14. The backend is NestJS with Prisma. Jobs are queued in Redis and processed by BullMQ workers. The worker uses Playwright to drive a real Chromium browser. We also have a shared package for types, a classifier package, a crawler package, and a reports package that generates PDFs with Playwright.”

---

## Slide 4: Optional AI / LLM Layer (30 seconds)

> “There is also an optional AI layer. The classifier can call a local Ollama instance — default model is `gemma:2b` — to suggest additional OWASP/CWE risks based on the discovered functionality. It is disabled by default and falls back to heuristics if Ollama is not running. All LLM inference stays local; no data is sent to cloud APIs.”

---

## Slide 5: Live Demo Setup (15 seconds)

> “For this demo I have the backend, worker, and frontend running locally against Docker containers for Postgres and Redis. The target is `https://httpbin.org`, a public test site maintained by the requests library team. It is intentionally full of sample forms and APIs, so it is perfect for a safe demo.”

---

## Slide 6: Start a Scan (30 seconds)

Actions: navigate to `http://localhost:3000`, enter `https://httpbin.org`, click **Start Discovery**.

> “I enter the target URL and click Start Discovery. The backend creates a scan job, queues it in Redis, and the worker picks it up. The dashboard shows real-time progress and updates automatically as the worker crawls.”

---

## Slide 7: Dashboard & Scan Detail (30 seconds)

After the scan completes, open the scan detail page.

> “The scan completed in about 26 seconds. We can see the overview: 3 pages, 1 form, 4 endpoints, 10 assets, 29 mapped risks, 8 concrete vulnerabilities, and a risk score of 45 out of 100.”

Point out the tabs: Overview, Pages, Forms, APIs, Assets, Risks, Vulnerabilities, Changes, Recon, Screenshots, Reports.

---

## Slide 8: What the Crawler Found (1 minute)

Click through the **Pages**, **Forms**, **APIs**, and **Assets** tabs.

> “The crawler found:
> - The home page, a sample form page, and a POST endpoint.
> - A form at `/post` with 12 fields including name, telephone, email, radio buttons, checkboxes, and a textarea.
> - API endpoints including `/spec.json`, which is a Swagger/OpenAPI spec.
> - Assets like Swagger UI scripts, jQuery, and Google Fonts.”

> “Because it renders the page in a real browser, it sees the same DOM a user sees, including JavaScript-rendered content.”

---

## Slide 9: Functionality Classification (30 seconds)

Click the **Risks** tab or refer to classification cards.

> “The classifier looked at the URLs, page text, forms, and buttons and labeled:
> - `/` as **API** functionality
> - `/forms/post` as **AUTH**, **CRUD**, and **API**
> - `/post` as **API** functionality”

> “These labels drive the risk mapping. An API endpoint triggers API Top 10 risks; an auth form triggers authentication risks.”

---

## Slide 10: Vulnerability Findings (2 minutes)

Click the **Vulnerabilities** tab.

> “The tool found 8 concrete issues. Let me walk through the most important ones.”

### Finding 1: CORS Reflects Arbitrary Origins — HIGH
> “The API reflects any `Origin` header and allows credentials. I can show you the evidence: a request with `Origin: https://attacker.invalid` came back with `Access-Control-Allow-Origin: https://attacker.invalid` and `Access-Control-Allow-Credentials: true`. That means any malicious site can read authenticated responses. Fix: maintain an explicit origin allowlist.”

### Finding 2: Missing Content-Security-Policy — MEDIUM
> “There is no CSP header. If an XSS flaw exists, the browser has no policy to stop injected scripts. Fix: add `default-src 'self'` and tighten from there.”

### Finding 3: Missing Clickjacking Protection — MEDIUM
> “No `X-Frame-Options` or CSP `frame-ancestors`. The site can be framed by a malicious page. Fix: send `X-Frame-Options: DENY` or add `frame-ancestors 'self'`.”

### Finding 4: Missing HSTS — MEDIUM
> “The HTTPS page does not send `Strict-Transport-Security`, so users can be downgraded to HTTP. Fix: send HSTS with a long max-age.”

### Finding 5: Possible CSRF — MEDIUM
> “The POST form has no CSRF token. If it changes server state, it could be abused. Fix: add tokens or use `SameSite=Strict` cookies.”

### Finding 6: Server Version Disclosure — LOW
> “The server header says `gunicorn/19.9.0`, which helps attackers fingerprint the stack. Fix: remove or genericize it at the reverse proxy.”

---

## Slide 11: Attack Surface Graph (30 seconds)

Click the **Graph** tab or button.

> “This is the interactive attack-surface graph. You can see pages as nodes, navigation links as edges, API calls, form actions, and asset imports. It gives a visual map of how an attacker could move through the application.”

---

## Slide 12: Reconnaissance (30 seconds)

Click the **Recon** tab.

> “The tool also gathers passive reconnaissance: registrar info, DNS records, whois data, and Wayback Machine URLs. For httpbin.org we see it is registered through Amazon Registrar, uses AWS name servers, and has multiple A records behind a load balancer.”

---

## Slide 13: Reports (30 seconds)

Click the **Reports** tab, generate a PDF.

> “Finally, the tool generates downloadable reports in PDF, Markdown, JSON, and TXT. The PDF is rendered with a headless browser so it looks like a real security report. This is useful for sharing findings with stakeholders or importing into other tools.”

---

## Slide 14: Key Features Summary (1 minute)

> “Key features we built into this prototype:
> - Horizontal worker scaling with BullMQ and Redis
> - Job retries with exponential backoff
> - Scan cancellation and real-time progress updates
> - Grouped findings (one finding covers multiple affected URLs)
> - Scan diffing to compare results over time
> - Recurring scans for continuous monitoring
> - Rate limiting, API key auth, SSRF target validation, and input validation hardening
> - Prisma migrate deploy for managed Postgres
> - Docker Compose setup with Caddy for HTTPS in production
> - Optional local LLM risk suggestions via Ollama”

---

## Slide 15: What It Is and Is Not (30 seconds)

> “This is a prototype, not a commercial scanner. It is great for:
> - Mapping authorized attack surface quickly
> - Prioritizing manual penetration testing
> - Generating starter reports
>
> It is not designed for:
> - Active exploitation
> - Fuzzing or full brute-force testing
> - Port scanning or full subdomain enumeration
> - Unauthorized testing”

---

## Slide 16: Closing (15 seconds)

> “The code is open-source, the full stack runs locally with Docker, and it is ready to be pointed at any authorized web application. The goal is to give security teams a fast, visual, and reportable starting point for understanding their web attack surface.”

---

## Demo Checklist

Before starting the demo, verify:
- [ ] Docker Desktop is running with Postgres and Redis containers healthy
- [ ] Backend terminal: `pnpm --filter @surface/backend start:dev`
- [ ] Worker terminal: `pnpm --filter @surface/backend worker`
- [ ] Frontend terminal: `pnpm --filter @surface/frontend dev`
- [ ] Health check returns OK: `curl.exe http://localhost:3001/health`
- [ ] Browser is at `http://localhost:3000`
- [ ] Target URL ready: `https://httpbin.org`

---

## Useful URLs During Demo

- Dashboard: `http://localhost:3000`
- API docs: `http://localhost:3001/api/docs`
- Health check: `http://localhost:3001/health`
- Example scan detail: `http://localhost:3000/scan/8731a5da-1bd6-4c63-82c7-3bb1acb44308`
