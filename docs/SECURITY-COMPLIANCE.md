# Security Compliance: FedRAMP & GDPR

This document maps Ordolix security controls to FedRAMP (NIST 800-53) control families and GDPR articles. It serves as the compliance matrix for auditors and enterprise customers.

Last updated: 2026-02-14

---

## 1. Security Architecture Overview

### Authentication Flow

```
User → Email/Password (Credentials) → Auth.js (JWT session) → Next.js Middleware
  → tRPC (protectedProcedure + RBAC) → Prisma (tenant-scoped query) → Neon PostgreSQL
```

### Data Flow & Encryption Boundaries

```
Browser ──TLS 1.2+──▶ Vercel Edge (middleware: auth + headers)
  │                          │
  │                    ┌─────▼─────┐
  │                    │ Next.js   │
  │                    │ App Router│
  │                    └─────┬─────┘
  │                          │
  ├── tRPC (internal) ──────▶ Prisma ORM ──TLS──▶ Neon (encrypted at rest, AES-256)
  │                          │
  ├── REST /api/v1/ ────────▶ API handlers (Zod validation + RBAC)
  │                          │
  ├── Real-time ────────────▶ Ably/SSE (TLS)
  │                          │
  └── File uploads ─────────▶ Cloudflare R2 (encrypted at rest, SSE-S3)
                             │
                       Upstash Redis (TLS, encrypted at rest)
```

### Key Security Controls

| Control | Implementation |
|---------|---------------|
| Authentication | Email/Password via Auth.js Credentials provider (bcrypt); Azure AD planned for Track B |
| Authorization | RBAC at tRPC middleware layer, 6 permission levels |
| Multi-tenancy | Row-level isolation via `organizationId` on every table |
| Input validation | Zod schemas on all tRPC/REST inputs |
| Transport encryption | TLS 1.2+ enforced, HSTS with preload |
| Data encryption at rest | Neon (AES-256), Upstash (AES-256), R2 (SSE-S3) |
| Audit logging | AuditLog model tracks all state changes with actor, action, diff |
| Rate limiting | Upstash Ratelimit: 300 req/min browser, 600 req/min API |
| Security headers | CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy |
| Secret management | Environment variables only, Zod-validated, never in source |
| PII protection | Log redaction (Pino), field-level sensitivity classification |
| Dependency security | npm audit in CI, Dependabot alerts enabled |

---

## 2. FedRAMP Control Mapping (NIST 800-53 Rev 5)

### AC — Access Control

| Control | ID | Ordolix Implementation | Status |
|---------|----|-----------------------|--------|
| Access control policy | AC-1 | RBAC system with 6 roles (Admin, Project Admin, Member, Developer, Viewer, Guest). Documented in CLAUDE.md and codebase. | Implemented |
| Account management | AC-2 | User accounts managed via Azure AD. Local accounts created on first SSO login. Admin can deactivate users. | Implemented |
| Access enforcement | AC-3 | `protectedProcedure` middleware checks role permissions on every tRPC call. REST API uses `apiHandler` wrapper. | Implemented |
| Information flow enforcement | AC-4 | Tenant isolation via `organizationId`. Cross-tenant data access is impossible at the ORM layer. | Implemented |
| Separation of duties | AC-5 | Role-based: only Admins manage workflows, only Project Admins configure boards. Approval module requires separate approver. | Implemented |
| Least privilege | AC-6 | Default role is Viewer (read-only). Permissions escalate only through explicit role assignment. | Implemented |
| Unsuccessful logon attempts | AC-7 | Handled by Azure AD (lockout after N failures). Rate limiting at middleware layer. | Delegated to IdP |
| Session lock | AC-11 | JWT session expiry. Frontend idle detection redirects to login. | Implemented |
| Session termination | AC-12 | Sessions expire per Auth.js configuration. Admin can revoke sessions. | Implemented |
| Remote access | AC-17 | All access is remote (web application). TLS 1.2+ required. VPN not required (zero-trust model). | Implemented |
| API access control | AC-20 | REST API requires Bearer token. Tokens scoped to organization. Rate-limited separately. | Implemented |

### AU — Audit and Accountability

| Control | ID | Ordolix Implementation | Status |
|---------|----|-----------------------|--------|
| Audit policy | AU-1 | All state-changing operations logged to AuditLog table. Documented in data model. | Implemented |
| Audit events | AU-2 | AuditLog captures: actor (userId), action (create/update/delete), entity, old/new values, timestamp, IP, requestId. | Implemented |
| Content of audit records | AU-3 | Each record includes: who (userId), what (action + entityType + entityId), when (timestamp), where (IP + requestId), outcome (before/after diff). | Implemented |
| Audit log storage | AU-4 | Stored in Neon PostgreSQL. Retention per organization policy. Encrypted at rest. | Implemented |
| Response to audit failures | AU-5 | Audit log writes are non-blocking but failures are logged to error stream. | Implemented |
| Audit review | AU-6 | Admin dashboard provides audit log viewer with filtering by user, action, entity, date range. | Implemented |
| Audit reduction | AU-7 | AQL (Ordolix Query Language) supports filtering audit records. Saved filters available. | Implemented |
| Time stamps | AU-8 | All timestamps in UTC. PostgreSQL `timestamptz` type. Server-generated, not client-supplied. | Implemented |
| Protection of audit info | AU-9 | Audit records are append-only. No delete/update API exists. Only Org Admins can view. | Implemented |
| Correlation ID | AU-16 | Every request gets `X-Request-Id` header (UUID). Propagated through logs and audit records. | Implemented |

### CA — Assessment, Authorization, and Monitoring

| Control | ID | Ordolix Implementation | Status |
|---------|----|-----------------------|--------|
| Security assessment | CA-2 | CI/CD pipeline runs: TypeScript strict check, ESLint security rules, npm audit, Vitest tests. `/security-audit` skill for manual checks. | Implemented |
| Continuous monitoring | CA-7 | Dependabot alerts, npm audit in CI, structured logging with alerting capability. | Implemented |

### CM — Configuration Management

| Control | ID | Ordolix Implementation | Status |
|---------|----|-----------------------|--------|
| Configuration policy | CM-1 | All configuration via environment variables, validated at startup with Zod. | Implemented |
| Baseline configuration | CM-2 | Infrastructure as code: Prisma schema (database), `package.json` (dependencies), `next.config.ts` (app config). | Implemented |
| Configuration change control | CM-3 | Git version control. PR review required. CI must pass. Schema migrations are versioned. | Implemented |
| Least functionality | CM-7 | Minimal npm dependencies. No unnecessary system services. Serverless deployment (Vercel). | Implemented |
| Software inventory | CM-8 | `package.json` and `package-lock.json` serve as software bill of materials (SBOM). | Implemented |

### IA — Identification and Authentication

| Control | ID | Ordolix Implementation | Status |
|---------|----|-----------------------|--------|
| I&A policy | IA-1 | Azure AD as sole identity provider. No local password storage. | Implemented |
| I&A (org users) | IA-2 | Azure AD SSO (OIDC). MFA enforced at Azure AD level. | Implemented |
| Authenticator management | IA-5 | Managed by Azure AD. Ordolix stores no passwords. API tokens are hashed (SHA-256) before storage. | Implemented |
| Cryptographic module auth | IA-7 | TLS 1.2+ for all connections. JWT signing with RS256 or HS256. | Implemented |
| Re-authentication | IA-11 | Session expiry forces re-authentication through Azure AD. | Implemented |

### IR — Incident Response

| Control | ID | Ordolix Implementation | Status |
|---------|----|-----------------------|--------|
| Incident response policy | IR-1 | Incident module built into the platform for tracking security incidents. | Implemented |
| Incident handling | IR-4 | Incident workflow: Open → Triaged → Investigating → Mitigated → Resolved → Closed. Linked to audit trail. | Implemented |
| Incident monitoring | IR-5 | Audit logs, structured logging (Pino), system health endpoint. | Implemented |
| Incident reporting | IR-6 | Incident module supports stakeholder notifications. Email via Resend. | Implemented |

### MP — Media Protection

| Control | ID | Ordolix Implementation | Status |
|---------|----|-----------------------|--------|
| Media protection policy | MP-1 | All data stored in cloud services with encryption at rest. No local media. | Implemented |
| Media storage | MP-4 | Cloudflare R2 (SSE-S3 encryption). Neon PostgreSQL (AES-256). Upstash Redis (AES-256). | Implemented |
| Media transport | MP-5 | TLS 1.2+ for all data in transit. HSTS enforced. | Implemented |

### PE — Physical and Environmental Protection

| Control | ID | Ordolix Implementation | Status |
|---------|----|-----------------------|--------|
| Physical access | PE-2 through PE-6 | **Cloud provider responsibility.** Vercel (AWS), Neon (AWS), Upstash (AWS), Cloudflare — all SOC 2 Type II certified. | Inherited |

### RA — Risk Assessment

| Control | ID | Ordolix Implementation | Status |
|---------|----|-----------------------|--------|
| Risk assessment policy | RA-1 | OWASP Top 10 mitigations implemented. Security audit skill for ongoing assessment. | Implemented |
| Security categorization | RA-2 | Data classified as: Public, Internal, Confidential, PII. See Data Classification section. | Implemented |
| Vulnerability scanning | RA-5 | npm audit (CI), Dependabot (continuous), CodeQL (GitHub Advanced Security). | Implemented |

### SA — System and Services Acquisition

| Control | ID | Ordolix Implementation | Status |
|---------|----|-----------------------|--------|
| Supply chain protection | SA-12 | Dependabot monitors all npm dependencies. `package-lock.json` ensures reproducible builds. | Implemented |
| Developer security testing | SA-15 | TDD methodology. Security-focused ESLint rules. `/security-audit` skill. | Implemented |

### SC — System and Communications Protection

| Control | ID | Ordolix Implementation | Status |
|---------|----|-----------------------|--------|
| Application partitioning | SC-2 | Frontend (React) separated from backend (tRPC/API). Database accessed only through Prisma ORM. | Implemented |
| Information in shared resources | SC-4 | Tenant isolation prevents cross-organization data leakage. Redis namespaced per org. | Implemented |
| Boundary protection | SC-7 | Vercel edge network. Rate limiting. WAF capabilities via Vercel. | Implemented |
| Transmission confidentiality | SC-8 | TLS 1.2+ on all connections. HSTS with preload directive. | Implemented |
| Cryptographic protection | SC-13 | TLS for transport. AES-256 for storage. JWT for sessions. API tokens hashed with SHA-256. | Implemented |
| Public access protections | SC-14 | Authentication required for all non-public routes. CSP prevents content injection. | Implemented |
| Session authenticity | SC-23 | JWT-based sessions with cryptographic signing. CSRF protection via SameSite cookies. | Implemented |

### SI — System and Information Integrity

| Control | ID | Ordolix Implementation | Status |
|---------|----|-----------------------|--------|
| Flaw remediation | SI-2 | Dependabot PRs for vulnerable dependencies. npm audit in CI pipeline. | Implemented |
| Malicious code protection | SI-3 | No file execution. Uploaded files stored in R2 with content-type validation. Script sandbox (ScriptRunner) for user code. | Implemented |
| Information input validation | SI-10 | Zod schemas on all inputs. AQL parser whitelist prevents injection. Type-safe queries via Prisma. | Implemented |
| Error handling | SI-11 | Typed error classes. No stack traces or internal details in API responses. requestId for correlation. | Implemented |
| Information output handling | SI-15 | React auto-escapes output. CSP prevents inline script injection. PII redacted in logs. | Implemented |

---

## 3. GDPR Compliance Matrix

### Article 5 — Principles of Processing

| Principle | Implementation |
|-----------|---------------|
| Lawfulness, fairness, transparency | Processing based on legitimate interest (enterprise tool) and consent (Azure AD login). Privacy policy required at deployment. |
| Purpose limitation | Data collected only for issue tracking, project management, and related functions. No secondary use. |
| Data minimization | Only necessary fields collected: name, email, avatar URL, organization membership. No unnecessary PII. |
| Accuracy | Users can update their profile. Azure AD sync keeps identity data current. |
| Storage limitation | Configurable retention policies per organization. Audit logs retained per compliance requirements. |
| Integrity and confidentiality | Encryption at rest and in transit. RBAC. Multi-tenancy isolation. See security architecture above. |

### Article 6 — Lawful Basis for Processing

| Basis | Applicability |
|-------|--------------|
| Consent (6.1.a) | User consents by logging in via Azure AD. Organization admin consents on behalf of org. |
| Contract (6.1.b) | Processing necessary for the service agreement between organization and Ordolix. |
| Legitimate interest (6.1.f) | Enterprise issue tracking is a legitimate business function. Balanced against minimal data collection. |

### Article 13/14 — Right to Information

| Requirement | Implementation |
|-------------|---------------|
| Identity of controller | Displayed in application footer and privacy policy page. |
| Purpose of processing | Documented in privacy policy and this compliance document. |
| Legal basis | Documented in privacy policy. |
| Retention periods | Documented in DATA-PROCESSING.md and configurable per organization. |
| Data subject rights | Documented in privacy policy with contact information. |

### Article 15 — Right of Access

| Requirement | Implementation |
|-------------|---------------|
| Access to personal data | User profile page shows all stored personal data. |
| Data export | Admin panel provides data export functionality (JSON/CSV). |
| Processing purposes | Documented in privacy policy. |

### Article 16 — Right to Rectification

| Requirement | Implementation |
|-------------|---------------|
| Correction of data | Users can update their profile (display name, avatar). Core identity synced from Azure AD. |

### Article 17 — Right to Erasure

| Requirement | Implementation |
|-------------|---------------|
| Account deletion | Admin can deactivate/anonymize user accounts. |
| Anonymization | User PII (name, email) replaced with anonymized values. Audit log references preserved with anonymized actor. |
| Cascading deletion | User's personal data anonymized across all tables (issues reassigned to "Deleted User"). |
| Retention exceptions | Audit logs may be retained for compliance even after erasure (documented in privacy policy). |

### Article 20 — Right to Data Portability

| Requirement | Implementation |
|-------------|---------------|
| Machine-readable export | REST API provides JSON export of all user-associated data. |
| Structured format | JSON export includes: profile, issues created/assigned, time logs, comments. |

### Article 25 — Data Protection by Design and Default

| Principle | Implementation |
|-----------|---------------|
| By design | Multi-tenancy isolation, encryption, RBAC, input validation, PII redaction built from the start. |
| By default | Minimal data collection. Default role is Viewer (read-only). No optional PII fields collected. |
| Pseudonymization | API tokens hashed. Internal IDs are UUIDs (not sequential). |

### Article 28 — Processor Obligations

| Requirement | Implementation |
|-------------|---------------|
| Sub-processor list | Documented in DATA-PROCESSING.md: Vercel, Neon, Upstash, Cloudflare, Ably, Resend. |
| Processing agreements | DPA required with each sub-processor (all offer standard DPAs). |
| Security measures | All sub-processors SOC 2 Type II certified. Encryption at rest and in transit. |

### Article 30 — Records of Processing Activities

| Requirement | Implementation |
|-------------|---------------|
| Processing register | Maintained in `docs/DATA-PROCESSING.md`. |
| Contents | Categories of data, purposes, recipients, transfers, retention, security measures. |

### Article 32 — Security of Processing

| Measure | Implementation |
|---------|---------------|
| Encryption | TLS 1.2+ (transit), AES-256 (rest), JWT signing (sessions). |
| Confidentiality | RBAC, tenant isolation, API authentication. |
| Integrity | Input validation (Zod), audit logging, version-controlled schema. |
| Availability | Vercel edge network (global CDN), Neon (replicated PostgreSQL), auto-scaling. |
| Regular testing | CI/CD security checks, `/security-audit` skill, dependency monitoring. |

### Article 33 — Breach Notification

| Requirement | Implementation |
|-------------|---------------|
| Detection | Audit logging captures all state changes. Anomaly detection via log analysis. |
| Internal notification | Incident module for tracking security events. Email notifications to stakeholders. |
| Authority notification | Process documented: 72-hour notification window. Incident module tracks timeline. |
| Communication to subjects | Email notification capability via Resend. Template for breach communication. |

### Article 35 — Data Protection Impact Assessment (DPIA)

| Factor | Assessment |
|--------|-----------|
| Nature of processing | Standard enterprise project management. No special category data. |
| Scope | Organization-scoped. Multi-tenant but data strictly isolated. |
| Context | Enterprise B2B tool. Users are employees, not consumers. |
| Risk level | Moderate. PII is limited (name, email). No financial or health data. |
| Mitigations | Full security architecture (encryption, RBAC, isolation, audit logging). |
| Conclusion | DPIA not mandatory (no high-risk processing per Article 35(3)), but documented here proactively. |

---

## 4. Data Classification

| Classification | Description | Examples | Controls |
|---------------|-------------|----------|----------|
| **Public** | No sensitivity. Available to anyone. | Project names (if public), issue types, workflow names | Standard access controls |
| **Internal** | Business data. Organization members only. | Issues, comments, boards, sprints, reports | RBAC + tenant isolation |
| **Confidential** | Sensitive business data. Restricted access. | SLA configurations, automation rules, scripts, API tokens | RBAC + tenant isolation + role restrictions |
| **PII** | Personal data subject to GDPR. | User name, email, avatar URL, IP address | Encryption + redaction + erasure support |

### PII Field Inventory

| Table | Field | Type | Encrypted at Rest | Redacted in Logs | Erasure Support |
|-------|-------|------|-------------------|------------------|-----------------|
| User | name | string | Yes (Neon AES-256) | Yes | Anonymized |
| User | email | string | Yes (Neon AES-256) | Yes | Anonymized |
| User | avatarUrl | string | Yes (Neon AES-256) | No (not sensitive) | Nulled |
| User | image | string | Yes (Neon AES-256) | No | Nulled |
| AuditLog | userId | UUID | Yes (Neon AES-256) | No (reference only) | Preserved (anonymized user) |
| AuditLog | ipAddress | string | Yes (Neon AES-256) | Yes | Nulled after retention |
| Session | sessionToken | string | Yes (Neon AES-256) | Yes | Deleted on logout |
| ApiToken | tokenHash | SHA-256 hash | Yes (Neon AES-256) | Yes | Deleted on revoke |

### Retention Policies

| Data Category | Default Retention | Configurable | Justification |
|--------------|-------------------|-------------|---------------|
| Active user data | Indefinite (while active) | No | Required for service |
| Deactivated user data | 90 days then anonymize | Yes | Grace period for reactivation |
| Audit logs | 2 years | Yes (org policy) | Compliance and forensics |
| Session data | 30 days | No | Security |
| Deleted issues | 30 days (soft delete) | Yes | Recovery period |
| File attachments | Follows parent issue | No | Consistency |
| API tokens | Until revoked | No | User-managed lifecycle |

---

## 5. Shared Responsibility Model

| Domain | Ordolix Responsibility | Cloud Provider Responsibility |
|--------|----------------------|------------------------------|
| **Application security** | RBAC, input validation, output encoding, session management, CSRF/XSS prevention, CSP headers | N/A |
| **Data encryption (transit)** | TLS configuration, HSTS enforcement | TLS termination, certificate management |
| **Data encryption (rest)** | Field-level sensitivity classification, token hashing | AES-256 storage encryption (Neon, Upstash, R2) |
| **Identity management** | Auth.js integration, session handling, role assignment | Azure AD (MFA, password policy, lockout) |
| **Network security** | Rate limiting, CORS policy, security headers | DDoS protection, WAF, edge network (Vercel) |
| **Physical security** | N/A | Data center security, SOC 2 Type II (all providers) |
| **Availability** | Application error handling, graceful degradation | Infrastructure uptime SLAs, auto-scaling, replication |
| **Backup & recovery** | Schema migrations, seed data, data export API | Automated backups (Neon point-in-time recovery) |
| **Compliance certifications** | Application-level controls documented here | SOC 2, ISO 27001, GDPR DPA (per provider) |
| **Incident response** | Application-level detection and logging | Infrastructure-level monitoring and alerting |
| **Vulnerability management** | Dependency updates, code scanning, security audits | Infrastructure patching, zero-day response |

### Cloud Provider Compliance Status

| Provider | Service | SOC 2 | ISO 27001 | GDPR DPA | Data Region |
|----------|---------|-------|-----------|----------|-------------|
| Vercel | Hosting, Edge, CDN | Yes | Yes | Available | US (configurable) |
| Neon | PostgreSQL Database | Yes | Yes | Available | US (configurable) |
| Upstash | Redis, QStash | Yes | In progress | Available | US (configurable) |
| Cloudflare | R2 Object Storage | Yes | Yes | Available | US (configurable) |
| Ably | Real-time messaging | Yes | Yes | Available | US (configurable) |
| Resend | Email delivery | Yes | In progress | Available | US |
| Microsoft | Azure AD (IdP) | Yes | Yes | Available | Per tenant config |

---

## Appendix A: OWASP Top 10 (2021) Mitigation Status

| # | Risk | Mitigation | Status |
|---|------|-----------|--------|
| A01 | Broken Access Control | RBAC middleware, tenant isolation, protectedProcedure on all routes | Mitigated |
| A02 | Cryptographic Failures | TLS 1.2+, AES-256 at rest, no plaintext secrets, token hashing | Mitigated |
| A03 | Injection | Zod input validation, Prisma parameterized queries, AQL parser whitelist | Mitigated |
| A04 | Insecure Design | Security by design, threat modeling, TDD, code review | Mitigated |
| A05 | Security Misconfiguration | Zod env validation, security headers, minimal dependencies, no defaults | Mitigated |
| A06 | Vulnerable Components | Dependabot, npm audit in CI, regular updates | Mitigated |
| A07 | Auth Failures | Azure AD SSO, JWT sessions, rate limiting, no local passwords | Mitigated |
| A08 | Data Integrity Failures | Signed JWTs, schema validation, CI/CD pipeline checks | Mitigated |
| A09 | Logging Failures | Structured logging (Pino), audit trail, correlation IDs, PII redaction | Mitigated |
| A10 | SSRF | No user-controlled URL fetching. Integration URLs validated against allowlist. | Mitigated |

---

## Appendix B: Compliance Contacts

| Role | Responsibility |
|------|---------------|
| Application Owner | Frank (Proofpoint IT Engineering) — security architecture, code-level controls |
| Infrastructure | Vercel/Neon/Upstash support — infrastructure-level controls |
| Identity Provider | Microsoft Azure AD admin — authentication, MFA, directory policies |
| Privacy Officer | TBD — GDPR compliance, DPIA reviews, breach notification |
| Security Auditor | TBD — periodic assessment, penetration testing |
