# Attack Surface Discovery — Scan Results Explanation Script

**Target:** `https://httpbin.org`  
**Scan ID:** `8731a5da-1bd6-4c63-82c7-3bb1acb44308`  
**Status:** Completed (100%)  
**Duration:** ~26 seconds  
**Risk Score:** 45 / 100 (Medium)

---

## 1. Executive Summary (30 seconds)

> “We ran an authorized attack-surface discovery scan against `https://httpbin.org`, a public test application. The tool crawled the site like a browser, mapped every page, form, API endpoint, and asset, classified the business functionality, and then matched what it found against known OWASP Top 10 and CWE risks. It also did passive reconnaissance: DNS records, whois data, and Wayback Machine URLs.”

> “In under 30 seconds the scan discovered 3 pages, 1 form, 4 endpoints, 10 assets, 29 mapped risks, and 8 concrete vulnerability findings. The overall risk score is 45 out of 100 — medium.”

---

## 2. What the Tool Discovered (1 minute)

### Pages Crawled (3)
1. `https://httpbin.org/` — the home page
2. `https://httpbin.org/forms/post` — a sample HTML form
3. `https://httpbin.org/post` — an API endpoint that returns 405 for GET

### Forms (1)
- A POST form at `/post` with 12 fields:
  - `custname`, `custtel`, `custemail`
  - `size` (radio buttons)
  - `topping` (checkboxes)
  - `delivery` (time)
  - `comments` (textarea)
  - Submit button: `submit order`

> “Because the tool sees a submit button and state-changing fields, it classifies this page as both authentication-related and CRUD-related.”

### Endpoints (4)
- `GET /` — home page
- `GET /spec.json` — REST API specification (Swagger/OpenAPI JSON)
- `GET /forms/post` — form page
- `GET /post` — returns 405, only POST/OPTIONS allowed

### Assets (10)
- JavaScript: `swagger-ui-bundle.js`, `swagger-ui-standalone-preset.js`, `jquery.min.js`
- Stylesheets: Google Fonts CSS, `swagger-ui.css`
- Fonts: Open Sans, Titillium Web, Source Code Pro from Google Fonts

### Tech Stack
- JavaScript, jQuery, CSS
- Server: gunicorn/19.9.0

---

## 3. How the Tool Classified Functionality (30 seconds)

> “The classifier looks at page text, URLs, form fields, and buttons. It labeled:
> - `https://httpbin.org/` as **API** functionality
> - `https://httpbin.org/forms/post` as **AUTH**, **CRUD**, and **API**
> - `https://httpbin.org/post` as **API** functionality”

> “These labels drive the risk mapping. For example, an API endpoint triggers OWASP API Top 10 risks, and an auth-related form triggers authentication risks.”

---

## 4. Top Vulnerability Findings (2–3 minutes)

### 4.1 CORS Reflects Arbitrary Origins With Credentials — HIGH
- **Finding:** The API reflects any `Origin` header in `Access-Control-Allow-Origin` and sets `Access-Control-Allow-Credentials: true`.
- **Evidence:** A request with `Origin: https://attacker.invalid` was mirrored back.
- **Risk:** Any malicious website can make authenticated cross-origin requests and read responses.
- **OWASP:** A05:2021 — Security Misconfiguration
- **CWE:** CWE-942
- **Fix:** Maintain an explicit allowlist of trusted origins instead of reflecting arbitrary origins.

### 4.2 Missing Content-Security-Policy — MEDIUM
- **Finding:** No CSP header on `https://httpbin.org/` or `https://httpbin.org/forms/post`.
- **Risk:** If an XSS flaw exists, the browser has no policy to block injected scripts or limit data exfiltration.
- **OWASP:** A05:2021 — Security Misconfiguration
- **CWE:** CWE-693
- **Fix:** Start with `default-src 'self'` and tighten based on required sources.

### 4.3 Missing Clickjacking Protection — MEDIUM
- **Finding:** No `X-Frame-Options` or CSP `frame-ancestors` directive.
- **Risk:** The site can be framed by a malicious page, tricking users into clicking hidden buttons or forms.
- **OWASP:** A05:2021 — Security Misconfiguration
- **CWE:** CWE-1021
- **Fix:** Send `X-Frame-Options: DENY` or add `frame-ancestors 'self'` to the CSP.

### 4.4 Missing HTTP Strict Transport Security — MEDIUM
- **Finding:** No `Strict-Transport-Security` header on HTTPS pages.
- **Risk:** Users can be downgraded to HTTP via SSL-stripping attacks.
- **OWASP:** A02:2021 — Cryptographic Failures
- **CWE:** CWE-319
- **Fix:** Send `Strict-Transport-Security: max-age=31536000; includeSubDomains`.

### 4.5 Possible Missing CSRF Protection — MEDIUM
- **Finding:** The POST form at `/post` has 12 fields but none match a CSRF token pattern.
- **Risk:** If the form changes state on the server, it may be vulnerable to cross-site request forgery.
- **OWASP:** A01:2021 — Broken Access Control
- **CWE:** CWE-352
- **Fix:** Add per-session anti-CSRF tokens, or enforce `SameSite=Strict` cookies with origin checks.

### 4.6 Technology Version Disclosure — LOW
- **Finding:** `Server: gunicorn/19.9.0` is returned in responses.
- **Risk:** Attackers can use the version to select known exploits or fingerprint the stack.
- **OWASP:** A05:2021 — Security Misconfiguration
- **CWE:** CWE-200
- **Fix:** Remove or genericize the `Server` header at the reverse proxy.

### 4.7 Missing X-Content-Type-Options — LOW
- **Finding:** No `X-Content-Type-Options: nosniff` header.
- **Risk:** Browsers may MIME-sniff responses and execute attacker-controlled content as script.
- **OWASP:** A05:2021 — Security Misconfiguration
- **CWE:** CWE-693
- **Fix:** Send `X-Content-Type-Options: nosniff` on all responses.

### 4.8 Missing Referrer-Policy — LOW
- **Finding:** No `Referrer-Policy` is set.
- **Risk:** Full URLs (which may contain tokens or sensitive paths) can leak to third-party origins.
- **OWASP:** A05:2021 — Security Misconfiguration
- **CWE:** CWE-200
- **Fix:** Send `Referrer-Policy: strict-origin-when-cross-origin` or stricter.

---

## 5. Mapped Risks (Heuristic, Based on Functionality)

> “Because the classifier found API and authentication functionality, the risk engine mapped 29 risks including broken object-level authorization, broken authentication, excessive data exposure, mass assignment, credential stuffing, weak password policy, user enumeration, password reset abuse, session fixation, insecure direct object references, and cross-site request forgery.”

> “These are not all confirmed vulnerabilities — they are risk patterns tied to the functionality the tool observed. They tell a tester where to look first.”

---

## 6. Reconnaissance Data (30 seconds)

> “The tool also gathered passive reconnaissance for the domain:
> - **Registrar:** Amazon Registrar, Inc.
> - **DNS:** multiple A records pointing to AWS IPs, AWS name servers, and a TXT/SPF record
> - **Tech stack:** JavaScript, jQuery, CSS
> - **Server header:** gunicorn/19.9.0”

> “This gives context about hosting, infrastructure, and potential attack surface outside the application itself.”

---

## 7. Recommendations Summary (1 minute)

| Priority | Action |
|----------|--------|
| High | Fix CORS to use an explicit origin allowlist instead of reflecting arbitrary origins. |
| High | Review API authorization for every endpoint (BOLA, BFLA). |
| Medium | Add a restrictive Content-Security-Policy. |
| Medium | Add clickjacking protection (`X-Frame-Options` or CSP `frame-ancestors`). |
| Medium | Add HSTS header to all HTTPS responses. |
| Medium | Add CSRF tokens or modern cookie protections to state-changing forms. |
| Low | Remove or genericize version-revealing headers. |
| Low | Add `X-Content-Type-Options: nosniff` and `Referrer-Policy`. |

---

## 8. Demo Closing (15 seconds)

> “This scan ran in seconds, produced an interactive attack-surface graph, and generated downloadable PDF, Markdown, JSON, and TXT reports. The same workflow can be pointed at any authorized web application to map its surface and prioritize security testing.”

---

## 9. How to Use This Script

- Read sections 1, 2, 4, 7, and 8 for a **5-minute demo**.
- Read the full script for a **deep-dive walkthrough**.
- Open the scan in the dashboard at: `http://localhost:3000/scan/8731a5da-1bd6-4c63-82c7-3bb1acb44308`
- Try the **Reports** tab to export the same findings as PDF, Markdown, JSON, or TXT.
