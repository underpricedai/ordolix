# Data Processing Register (GDPR Article 30)

This document serves as the Record of Processing Activities required by GDPR Article 30. It describes all personal data processing performed by Ordolix.

Last updated: 2026-02-14

---

## 1. Controller Information

| Field | Value |
|-------|-------|
| Controller | Ordolix (operated by Proofpoint IT Engineering) |
| Contact | TBD — Data Protection Officer / Privacy contact |
| Representative (EU) | TBD — Required if processing EU residents' data without EU establishment |

---

## 2. Categories of Personal Data Collected

### 2.1 User Identity Data

| Field | Source | Purpose | Legal Basis | Retention |
|-------|--------|---------|-------------|-----------|
| Full name | Azure AD SSO | Display in UI, attribution on issues/comments | Contract (Art. 6.1.b) | Active account lifetime + 90 days |
| Email address | Azure AD SSO | Notifications, account identification, @ mentions | Contract (Art. 6.1.b) | Active account lifetime + 90 days |
| Avatar URL | Azure AD SSO | Profile display in UI | Legitimate interest (Art. 6.1.f) | Active account lifetime |
| Profile image | Azure AD SSO | Profile display in UI | Legitimate interest (Art. 6.1.f) | Active account lifetime |
| Azure AD Object ID | Azure AD SSO | SSO identity linkage | Contract (Art. 6.1.b) | Active account lifetime + 90 days |

### 2.2 Activity & Behavioral Data

| Field | Source | Purpose | Legal Basis | Retention |
|-------|--------|---------|-------------|-----------|
| Issue actions | User interaction | Audit trail, accountability | Legitimate interest (Art. 6.1.f) | 2 years (configurable) |
| Comments | User input | Collaboration on issues | Contract (Art. 6.1.b) | Issue lifetime |
| Time log entries | User input | Time tracking, reporting | Contract (Art. 6.1.b) | Organization retention policy |
| Approval decisions | User interaction | Workflow governance | Contract (Art. 6.1.b) | Issue lifetime |

### 2.3 Technical Data

| Field | Source | Purpose | Legal Basis | Retention |
|-------|--------|---------|-------------|-----------|
| IP address | HTTP request | Audit logging, security monitoring | Legitimate interest (Art. 6.1.f) | 2 years (in audit logs) |
| Request correlation ID | Generated | Debugging, incident investigation | Legitimate interest (Art. 6.1.f) | Log retention period |
| Session token | Auth.js | Authentication | Contract (Art. 6.1.b) | 30 days max |
| API token hash | User-generated | API authentication | Contract (Art. 6.1.b) | Until revoked |
| User agent | HTTP request | Compatibility, debugging | Legitimate interest (Art. 6.1.f) | Log retention period |

### 2.4 Data NOT Collected

Ordolix does **not** collect or process:
- Passwords (authentication delegated to Azure AD)
- Financial data (credit cards, bank accounts)
- Health or biometric data
- Political opinions, religious beliefs, or other special category data (Art. 9)
- Location data (beyond IP address)
- Social media profiles or behavioral advertising data

---

## 3. Purposes of Processing

| Purpose | Description | Data Used | Legal Basis |
|---------|------------|-----------|-------------|
| Service delivery | Provide issue tracking and project management functionality | Identity, activity data | Contract |
| Authentication | Verify user identity and maintain sessions | Identity, session tokens | Contract |
| Authorization | Enforce access controls and permissions | Identity, role assignments | Contract |
| Audit & compliance | Maintain audit trail of all actions for accountability | Identity, activity, IP address | Legitimate interest |
| Notifications | Send email notifications for issue updates, mentions, approvals | Email address, activity data | Contract |
| Reporting | Generate project reports (velocity, time tracking, SLA) | Activity data (aggregated) | Contract |
| Security monitoring | Detect and prevent unauthorized access | IP address, request patterns | Legitimate interest |
| Debugging | Investigate and resolve application errors | Technical data, correlation IDs | Legitimate interest |

---

## 4. Recipients and Sub-processors

### 4.1 Sub-processor Register

| Sub-processor | Service | Data Accessed | Location | DPA Status | Compliance |
|--------------|---------|---------------|----------|------------|------------|
| **Vercel Inc.** | Application hosting, edge network, serverless functions | All request data (transit), environment variables | US (AWS us-east-1) | Standard DPA available | SOC 2 Type II, ISO 27001 |
| **Neon Inc.** | PostgreSQL database hosting | All persistent data (users, issues, audit logs) | US (AWS us-east-1) | Standard DPA available | SOC 2 Type II |
| **Upstash Inc.** | Redis caching, QStash job queue | Cache keys, queue payloads (may include user IDs) | US (AWS us-east-1) | Standard DPA available | SOC 2 Type II |
| **Cloudflare Inc.** | R2 object storage (file attachments) | Uploaded files, file metadata | US (configurable) | Standard DPA available | SOC 2 Type II, ISO 27001 |
| **Ably Realtime** | Real-time messaging (WebSocket/SSE) | Channel messages (issue updates, notifications) | US (configurable) | Standard DPA available | SOC 2 Type II, ISO 27001 |
| **Resend Inc.** | Transactional email delivery | Email addresses, notification content | US | Standard DPA available | SOC 2 Type II |
| **Microsoft Corp.** | Azure Active Directory (identity provider) | User identity (name, email, groups, MFA status) | Per tenant configuration | Microsoft DPA | SOC 2, ISO 27001, FedRAMP |

### 4.2 Sub-processor Change Notification

Organizations will be notified 30 days in advance of any sub-processor changes via:
- Email notification to organization administrators
- In-app notification banner
- Updated DATA-PROCESSING.md in the repository

---

## 5. Cross-Border Data Transfers

### 5.1 Current Transfer Mechanisms

| Transfer | From | To | Mechanism | Safeguard |
|----------|------|----|-----------| ----------|
| User data → Vercel | EU users | US (Vercel) | Standard Contractual Clauses (SCCs) | Vercel DPA includes EU SCCs |
| User data → Neon | EU users | US (Neon) | Standard Contractual Clauses (SCCs) | Neon DPA includes EU SCCs |
| Cache data → Upstash | EU users | US (Upstash) | Standard Contractual Clauses (SCCs) | Upstash DPA includes EU SCCs |
| Files → Cloudflare | EU users | US (Cloudflare) | Standard Contractual Clauses (SCCs) | Cloudflare DPA includes EU SCCs |
| Notifications → Ably | EU users | US (Ably) | Standard Contractual Clauses (SCCs) | Ably DPA includes EU SCCs |
| Email → Resend | EU users | US (Resend) | Standard Contractual Clauses (SCCs) | Resend DPA includes EU SCCs |

### 5.2 EU Data Residency Option (Track B)

For organizations requiring EU data residency, Track B deployment supports:
- Azure Container Apps in EU regions (West Europe, North Europe)
- Azure PostgreSQL in EU regions
- Azure Redis in EU regions
- Azure Blob Storage in EU regions
- No cross-border transfer required for EU-only deployment

---

## 6. Data Subject Rights Implementation

| Right | Article | Implementation | Response Time |
|-------|---------|---------------|---------------|
| Right of access | Art. 15 | User profile page displays all personal data. Admin can export user data via REST API (`GET /api/v1/users/:id/export`). | 30 days |
| Right to rectification | Art. 16 | Users update profile via Azure AD (synced on next login). Display name editable in-app. | Immediate |
| Right to erasure | Art. 17 | Admin triggers account anonymization. PII replaced with "Deleted User" / anonymized email. | 30 days |
| Right to restriction | Art. 18 | Admin can deactivate user account (preserves data but prevents processing). | 30 days |
| Right to portability | Art. 20 | REST API provides JSON export of all user-associated data. | 30 days |
| Right to object | Art. 21 | User can disable email notifications. Account deactivation available. | Immediate |

### 6.1 Erasure Process

When a data subject requests erasure:

1. **Admin initiates** anonymization via admin panel or API
2. **User record** updated: name → "Deleted User", email → `deleted-{uuid}@anonymized.local`, avatar → null
3. **Authored content** preserved for business continuity but attributed to "Deleted User"
4. **Audit logs** retained (legal obligation) but user reference anonymized
5. **Sessions & tokens** immediately revoked
6. **Email** sent confirming erasure completion
7. **Sub-processors** notified to purge cached data (cache TTL ensures automatic purge within 24 hours)

---

## 7. Security Measures (Article 32)

| Measure | Description |
|---------|-------------|
| Encryption in transit | TLS 1.2+ on all connections. HSTS enforced with preload. |
| Encryption at rest | AES-256 for all databases and object storage. |
| Access control | RBAC with 6 role levels. Tenant isolation via organizationId. |
| Authentication | Azure AD SSO with MFA. No local password storage. |
| Input validation | Zod schemas on all API inputs. Parameterized database queries. |
| Audit logging | All state changes logged with actor, action, timestamp, IP. |
| PII redaction | Sensitive fields redacted in application logs (Pino redact). |
| Rate limiting | 300 req/min (browser), 600 req/min (API token). |
| Security headers | CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy. |
| Dependency monitoring | Dependabot alerts, npm audit in CI pipeline. |
| Incident response | Incident module for tracking security events. 72-hour breach notification process. |

---

## 8. Data Protection Impact Assessment Summary

Per GDPR Article 35, a DPIA is required for high-risk processing. Ordolix's processing has been assessed:

| Factor | Assessment |
|--------|-----------|
| **Systematic monitoring** | No. Audit logging is for accountability, not behavioral monitoring. |
| **Large-scale processing of special categories** | No. No special category data processed. |
| **Large-scale systematic monitoring of public areas** | No. Enterprise internal tool only. |
| **Automated decision-making with legal effects** | No. All decisions are human-driven. Automation rules are configurable by admins. |
| **Innovative use of technology** | No. Standard web application architecture. |
| **Processing preventing data subjects from exercising rights** | No. All GDPR rights implemented (see Section 6). |

**Conclusion:** Full DPIA not mandatory per Article 35(3) criteria. This summary serves as a lightweight assessment. A full DPIA can be conducted if required by a supervisory authority or customer contract.

---

## 9. Revision History

| Date | Change | Author |
|------|--------|--------|
| 2026-02-14 | Initial version | Frank (Proofpoint IT Engineering) |
