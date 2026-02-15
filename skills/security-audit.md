# Skill: Security Audit

Runs a comprehensive security posture check across the Ordolix codebase.

## Usage

```
/security-audit [--headers] [--auth] [--deps] [--secrets] [--owasp]
```

- No flags: Run all security checks below.
- `--headers`: Verify security headers only.
- `--auth`: Audit authentication and authorization only.
- `--deps`: Check dependencies for vulnerabilities only.
- `--secrets`: Scan for leaked secrets/credentials only.
- `--owasp`: OWASP Top 10 checklist verification only.

## Instructions

When this skill is invoked, run the applicable checks from the list below. Report results for each check with a PASS/WARN/FAIL status and details. Always run from the project root: `/home/frank/ordolix`.

---

### 1. Dependency Audit (`--deps`)

Run npm audit to check for known CVEs:

```bash
npm audit --omit=dev
```

Report:
- Total vulnerabilities by severity (critical, high, moderate, low)
- Any critical or high severity issues require immediate attention
- Suggest `npm audit fix` if safe fixes are available

Also check for outdated packages with known security patches:

```bash
npm outdated
```

---

### 2. Secret Scanning (`--secrets`)

Scan the codebase for hardcoded secrets. Search for patterns that indicate leaked credentials:

```
# Search for hardcoded API keys, passwords, tokens, and secrets
grep -rn --include="*.ts" --include="*.tsx" --include="*.js" --include="*.json" \
  -E "(password|secret|token|api_key|apiKey|private_key|privateKey)\s*[:=]\s*['\"][^'\"]{8,}" \
  src/ prisma/ --exclude-dir=node_modules
```

**Exceptions (not secrets):**
- Environment variable references (`process.env.X`)
- Type definitions and Zod schemas
- Test fixtures with obviously fake values (e.g., `test-token-123`)
- Schema field names (e.g., `password: z.string()`)

Also verify:
- `.env` is in `.gitignore` (check with `grep -q "^\.env" .gitignore`)
- No `.env` files are committed (check with `git ls-files .env*`)
- No hardcoded connection strings in source files

---

### 3. Security Headers (`--headers`)

Read `src/middleware.ts` and verify the `applySecurityHeaders` function sets ALL of these headers:

| Header | Required Value | Purpose |
|--------|---------------|---------|
| `X-Frame-Options` | `DENY` | Clickjacking prevention |
| `X-Content-Type-Options` | `nosniff` | MIME sniffing prevention |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Force HTTPS |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Referrer leakage prevention |
| `X-XSS-Protection` | `1; mode=block` | XSS filter (legacy browsers) |
| `Content-Security-Policy` | See CSP directives below | XSS/injection prevention |
| `Permissions-Policy` | Restrict camera, microphone, geolocation | Feature policy |

**CSP directives to verify:**
- `default-src 'self'`
- `script-src 'self' 'unsafe-inline' 'unsafe-eval'` (needed for Next.js)
- `style-src 'self' 'unsafe-inline'` (needed for Tailwind)
- `img-src 'self' blob: data:`
- `font-src 'self'`
- `connect-src 'self'` (with any real-time provider domains)
- `frame-ancestors 'none'`

---

### 4. Authentication & Authorization Audit (`--auth`)

#### 4a. tRPC Router Protection

Verify all tRPC routers use `protectedProcedure` (not `publicProcedure`) for non-public operations:

```
# Find all tRPC router files
glob: src/modules/*/server/*.ts

# In each router, check that procedures use protectedProcedure
grep -n "publicProcedure" src/modules/*/server/*.ts
```

**Expected:** Only authentication-related endpoints (login, register, health check) should use `publicProcedure`. All others must use `protectedProcedure`.

#### 4b. REST API Route Protection

Verify all REST API routes in `src/app/api/v1/` use the `apiHandler` wrapper or equivalent auth check:

```
# Check each route.ts for apiHandler usage
grep -rn "apiHandler\|getServerSession\|auth(" src/app/api/v1/
```

**Expected:** Every route handler is wrapped with authentication/authorization.

#### 4c. Session Configuration

Read `src/server/auth.ts` and verify:
- Session strategy is JWT or database-backed
- Token expiry is reasonable (< 24 hours for access, < 30 days for refresh)
- Callbacks validate session data

---

### 5. Input Validation (`--owasp`)

#### 5a. Zod Schema Coverage

Verify all tRPC procedures have Zod input validation:

```
# Find procedures without .input()
grep -n "protectedProcedure\.\(query\|mutation\)(" src/modules/*/server/*.ts
```

**Expected:** Every query and mutation has `.input(z.object(...))` or `.input(someSchema)` before the resolver.

#### 5b. SQL Injection Prevention

Verify no raw SQL queries exist (all queries should go through Prisma):

```
grep -rn "\$queryRaw\|\$executeRaw\|\.query(" src/ --include="*.ts"
```

**Expected:** Zero results, or any raw queries use parameterized inputs (`$queryRaw\`...${Prisma.sql}...\``).

#### 5c. XSS Prevention

Check for dangerous patterns:
- `dangerouslySetInnerHTML` usage (should be minimal and sanitized)
- Direct HTML string interpolation

```
grep -rn "dangerouslySetInnerHTML\|innerHTML" src/ --include="*.tsx" --include="*.ts"
```

**Expected:** Zero or minimal usage, each with DOMPurify or equivalent sanitization.

---

### 6. Tenant Isolation

Verify multi-tenancy isolation is enforced:

#### 6a. Prisma Middleware

Read `src/server/db.ts` or the Prisma client setup and verify:
- A middleware or extension automatically injects `organizationId` filter on queries
- No way to bypass tenant isolation from application code

#### 6b. Query Scoping

Spot-check key query files for `organizationId` in WHERE clauses:

```
grep -rn "prisma\.\(issue\|project\|user\|timeLog\|asset\)" src/modules/*/server/*.ts | head -20
```

**Expected:** All data queries include `organizationId` filtering.

---

### 7. PII & Logging

Read the logger configuration (likely `src/shared/utils/logger.ts` or similar) and verify:

- Sensitive fields are redacted: `password`, `token`, `secret`, `authorization`, `cookie`, `creditCard`, `ssn`
- Log level is configurable via environment variable
- No `console.log` with user data in production code

```
grep -rn "console\.log\|console\.error" src/ --include="*.ts" --include="*.tsx" | grep -v "test\|spec\|__mock"
```

**Expected:** Production code uses structured logger (Pino), not console.log.

---

### 8. Environment & Configuration

Verify environment variable handling:

```
# Check .gitignore includes .env files
grep "\.env" .gitignore

# Check no .env files are tracked
git ls-files | grep "\.env"

# Check env validation exists
cat src/shared/utils/env.ts  # or wherever env validation lives
```

**Expected:**
- `.env*` patterns in `.gitignore`
- No `.env` files tracked in git
- Zod-based environment variable validation at startup

---

### 9. CORS Configuration

Check for CORS headers in API routes and middleware:

```
grep -rn "Access-Control\|cors\|CORS" src/ --include="*.ts"
```

**Expected:** CORS is configured to allow only trusted origins, not `*` in production.

---

### 10. Rate Limiting

Verify rate limiting is applied:

```
grep -rn "ratelimit\|rateLimiter\|Ratelimit" src/ --include="*.ts"
```

**Expected:**
- Rate limiter imported from `@upstash/ratelimit`
- Applied at tRPC middleware layer
- Limits: ~300 req/min for browser, ~600 req/min for API tokens

---

## Audit Summary

After running all checks, provide a summary table:

| Check | Status | Details |
|-------|--------|---------|
| Dependencies | PASS/WARN/FAIL | N vulnerabilities (critical/high/moderate) |
| Secret Scanning | PASS/FAIL | N hardcoded secrets found |
| Security Headers | PASS/WARN | N of 7 headers present |
| Auth Coverage | PASS/WARN | N unprotected endpoints |
| Input Validation | PASS/WARN | N procedures without Zod input |
| SQL Injection | PASS/FAIL | N raw queries found |
| XSS Prevention | PASS/WARN | N dangerouslySetInnerHTML usages |
| Tenant Isolation | PASS/WARN | organizationId scoping verified |
| PII in Logs | PASS/WARN | Redaction rules in place |
| Environment | PASS/FAIL | .env handling secure |
| CORS | PASS/WARN | Origin restrictions verified |
| Rate Limiting | PASS/WARN | Limits configured |

## Severity Levels

- **FAIL**: Critical security issue that must be fixed before deployment.
- **WARN**: Non-critical issue or best practice not fully implemented. Should be addressed.
- **PASS**: Check passed. Control is in place and functioning.

## Important Notes

- Always run from the project root: `/home/frank/ordolix`
- This audit checks code-level controls only. Infrastructure-level controls (TLS, network segmentation, etc.) are the responsibility of the hosting provider (Vercel, Neon, Upstash).
- For a full compliance assessment, see `docs/SECURITY-COMPLIANCE.md` (FedRAMP/GDPR mapping).
- For the data processing register, see `docs/DATA-PROCESSING.md`.
