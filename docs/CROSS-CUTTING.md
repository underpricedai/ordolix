# Ordolix - Cross-Cutting Concerns

These standards apply to EVERY module. Reference before beginning any new module.

## Security & Compliance

### Authentication
- NextAuth.js / Auth.js with Azure AD provider
- JWT-based sessions (stateless, Vercel-compatible)
- 1-hour access token, automatic silent refresh, 90-day refresh token
- Session revocation via user version counter (admin panel)

### API Authentication
- Browser: JWT session cookie (httpOnly, secure, sameSite=lax)
- API tokens: prefix + random bytes (ordolix_sk_xxx), SHA-256 hashed in DB, shown once at creation
- API tokens inherit creating user's permissions, optionally scoped to projects
- Webhook auth: HMAC signature validation per integration

### CSRF Protection
- NextAuth.js double-submit cookie pattern
- API token requests exempt from CSRF

### Data Encryption
- All traffic TLS 1.2+
- DB, Redis, storage encrypt at rest by default
- Integration credentials: AES-256-GCM at application level (ENCRYPTION_KEY env var)
- API tokens: SHA-256 hashed (not encrypted, not retrievable)
- Custom fields marked "sensitive": encrypted at application level, excluded from search index

### OWASP Top 10

| Risk | Mitigation |
|------|-----------|
| Broken Access Control | Full Jira-style RBAC: ProjectRole + Group + PermissionScheme + PermissionGrant; permission checker with Redis caching (5min TTL); requirePermission/adminProcedure middleware; IssueSecurityScheme for issue-level visibility |
| Cryptographic Failures | TLS everywhere; field-level encryption; hashed tokens; no PII in logs |
| Injection | Prisma ORM (no SQL injection); Zod validation; proper AQL parser; React (no XSS) |
| Insecure Design | Threat modeling; isolated-vm sandbox; least privilege |
| Security Misconfiguration | Zod env validation on startup; security headers (CSP, HSTS, X-Frame-Options) |
| Vulnerable Components | npm audit + Dependabot + CodeQL in CI; block merge on critical/high |
| Auth Failures | NextAuth.js; rate limiting on login; account lockout (Azure AD) |
| Data Integrity | Webhook HMAC verification; audited dependencies; CI-gated deployment |
| Logging Failures | All security events logged; structured logging; immutable audit log |
| SSRF | Scripting engine HTTP blocked; integration URLs allow-listed; user URLs validated |

### Scripting Engine Security (ScriptRunner Replacement)
- V8 isolate via isolated-vm (Trigger.dev on serverless)
- No filesystem, network, process, eval access
- Memory: 128MB max; CPU: 5s wall-clock (admin configurable, max 30s)
- Max 100 Ordolix SDK calls per execution
- SDK enforces executing user's permissions
- Exposed: issues CRUD, users read, customFields, comments, time.log, notifications, log
- NOT exposed: admin, scripts, integrations, direct DB, file ops, HTTP client

### Data Retention
- Audit logs: indefinite (immutable)
- Deleted issues: soft-delete 30-day trash, then permanent purge
- Script/automation logs: 90 days
- Time logs: indefinite (financial data, cannot hard-delete, only void)
- File attachments: retained with parent issue; orphaned cleaned daily

### GDPR
- Personal data export (ZIP of JSON) from profile settings
- Account anonymization (preserve issue history integrity)
- Data processing register as Markdown in repo
- Essential cookies only (no analytics/tracking)

## Accessibility (WCAG 2.1 Level AA)

### Semantic HTML & ARIA
- Use semantic elements (nav, main, article, section, button, a) not div+onClick
- ARIA labels on all icon-only buttons
- ARIA live regions for dynamic updates (board moves, notifications, SLA timers)
- ARIA roles on custom widgets: Kanban board = role="list"/role="listitem"; Gantt = role="treegrid"
- Form fields must have associated labels (htmlFor/id or aria-label)

### Keyboard Navigation
- Logical tab order on every page
- Focus trapping in modals/dropdowns
- Skip-to-content link as first focusable element
- Board: arrow keys between cards/columns, Enter to open, Escape to close
- Command palette (Cmd+K) fully keyboard accessible

### Visual Design
- 4.5:1 contrast for normal text, 3:1 for large text
- Color never sole indicator (always icon/text/pattern alongside)
- Visible focus ring (2px solid, high contrast) on all focusable elements
- Functional at 200% browser zoom
- Respect prefers-reduced-motion

### Testing
- axe-core in Playwright E2E: every page test includes accessibility audit
- Lighthouse accessibility 95+ on all primary pages
- Manual screen reader testing (VoiceOver, NVDA) at phase gates

## Internationalization (i18n)

- next-intl for App Router integration
- All user-facing strings via t() function, NEVER hardcoded
- Translation files: src/messages/en.json organized by module
- ICU MessageFormat for plurals/numbers
- Intl.DateTimeFormat for all dates, Intl.NumberFormat for numbers, Intl.RelativeTimeFormat for relative times
- All dates stored UTC in DB, displayed in user's local timezone
- CSS logical properties (margin-inline-start, padding-block-end) instead of physical
- Tailwind logical utilities (ms-4 instead of ml-4)
- NOT translated: user-generated content, issue keys, AQL syntax, script code

## API Versioning

- REST API: URL-based /api/v1/ prefix
- Internal tRPC: not versioned (frontend/backend deploy together)
- OpenAPI docs at /api/v1/docs
- OData: /api/odata/v1/
- MCP: follows MCP protocol versioning
- Deprecation: 6-month support for previous version; Sunset + Deprecation headers

## Caching Strategy

See [ARCHITECTURE.md](./ARCHITECTURE.md) for full caching layer details.

Key patterns:
- Event-driven invalidation: entity update → invalidate related cache keys
- Cache key naming: `module:entity:id`
- Stampede prevention: singleflight / stale-while-revalidate
- Warm on deploy: permissions and workflow definitions

## Email Infrastructure

### Templates (React Email)
Issue Assigned, Comment Notification, Status Change, SLA Warning, SLA Breached, Approval Requested, Approval Decision, Timesheet Approval, Sprint Summary, Scheduled Report, Welcome, Incident Notification, Password/Token Reset

### Architecture
- EmailProvider interface: ResendAdapter (Track A) / AzureEmailAdapter (Track B)
- All emails async via QStash/BullMQ; UI never blocks
- Failed: retry 3x with exponential backoff over 15 minutes
- Log: recipient, subject, template, timestamp. Bodies NOT logged.
- One-click unsubscribe per notification type (CAN-SPAM)

## Dark Mode

- Tailwind CSS class strategy (dark: prefix on html element)
- CSS variables for all colors with light/dark values
- No flash: theme class applied in HTML head before React hydration
- Charts/D3: theme-aware color scales
- Monaco editor: auto-switch light/dark theme
- Stored in user profile (synced) with localStorage fallback

## Responsive Design & PWA

- Mobile-first with breakpoints: default (<640), sm (640-768), md (768-1024), lg (1024-1280), xl (1280+)
- Mobile: bottom tab bar, single-column, action buttons for transitions (no drag-drop)
- All touch targets minimum 44x44px
- PWA: manifest.json, service worker for offline viewing, install prompt after 3+ visits
- Web Push API for notifications when browser closed

## AQL Parser

Pipeline: Lexer → Parser (recursive descent) → AST → SQL Generator (parameterized Prisma/SQL)

Grammar supports: comparisons (=, !=, >, <, IN, CONTAINS, IS EMPTY), logical (AND, OR), ORDER BY, functions (currentUser(), currentSprint(), date math), dotted field names (asset.type)

Error handling: position info, suggestions for typos, type mismatch detection, never reaches DB.

## Bulk Operations

| Operation | Max Items | Notes |
|-----------|----------|-------|
| Bulk Edit | 500 | Background job with progress |
| Bulk Transition | 500 | Per-issue validator failures don't block others |
| Bulk Delete | 100 | Soft-delete, admin only |
| CSV Import (Issues/Assets) | 5,000 rows | Column mapping preview, validate before import |
| CSV Import (Users) | 1,000 rows | Azure AD sync preferred |
| Bulk Export | No limit | Background job, download link via notification |

UX: checkboxes + "Select All" (filter-based), bottom action bar, progress bar, undo within 30s.

## User Onboarding

### First Login
Welcome screen → Theme selection → Notification preferences → Project tour (tooltip highlights) → Keyboard shortcuts intro → Dismissable

### Project Setup Wizard
Project basics → Template selection (Kanban/Scrum/Bug Tracking/ITSM/Blank) → Team setup (Azure AD autocomplete) → Board customization → Integrations → Review and create
