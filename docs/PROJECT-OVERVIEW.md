# Project Ordolix - Complete Project Overview

## Executive Summary

Project Ordolix is an enterprise project and issue tracking platform designed to replace Atlassian Jira Cloud, Confluence (via SharePoint integration), and all associated marketplace add-ons. Built with Next.js, PostgreSQL (Neon), and Redis (Upstash), deployed on Vercel for independent development with a defined migration path to Azure infrastructure.

## Problem Statement

Atlassian has implemented substantial price increases for Jira Cloud. Beyond base licensing, the organization pays significant additional fees for marketplace add-ons required for essential functionality: ScriptRunner, Tempo, BigPicture, Epic Sum Up, eazyBI, ProForma, Insight, and others. These add-on costs often exceed the base licensing itself.

## Product Thesis

It is now possible to build an enterprise issue tracker that is both more powerful and dramatically simpler than Jira. Three converging forces make this possible:
1. Modern frontend frameworks (Next.js, React, Tailwind) enable UX quality Jira's legacy architecture cannot match
2. AI-assisted development (Claude Code) compresses a 50-person, multi-year effort into a small-team, sub-year effort
3. Serverless infrastructure (Vercel, Neon, Upstash) makes enterprise-grade deployment accessible without a platform team

## Strategic Opportunity

1. Prove the product internally at Proofpoint (eliminating Atlassian costs)
2. Offer externally as a SaaS product to organizations facing the same pain
3. Proofpoint is owned by Thoma Bravo - a firm that understands software economics and could greenlight productization

## Project Goals

- Eliminate all Jira Cloud, Confluence, and marketplace add-on licensing costs
- Build all add-on functionality natively (time tracking, Gantt, scripting, SLAs, test management, forms, CMDB, approvals, retros)
- Feature parity with current organizational usage within 8 months
- Integrate with SharePoint, GitHub, Salesforce, Power BI, and MCP
- Seamless SSO with Azure AD / Entra ID
- Full data migration from Jira with zero data loss
- Self-documenting, test-driven codebase for Claude Code autonomous development

## Success Criteria

- Working prototype with core features demonstrable to stakeholders within 3 months
- All marketplace add-on functionality replaced by native features
- All active projects migrated from Jira with complete data integrity
- User adoption rate >90% within 30 days of production launch
- Page load times <500ms for primary views
- 100% test coverage on core business logic

## Scope

### In Scope - Core Platform (v1.0)
- Project management: projects, issue types, subtasks, epics, labels, components, versions
- Configurable workflow engine with custom states, transitions, validators, post-functions, approval gates
- Board views: Kanban, list view, backlog with real-time updates
- Custom fields with rollup support (Epic Sum Up)
- Role-based permission schemes (project + global level)
- Full-text search with AQL (Ordolix Query Language)
- Comments, @mentions, attachments, activity history, checklists
- Automation engine, dashboard system, notification system
- SSO/SAML with Azure AD, REST API with OpenAPI docs
- Jira data migration tooling, audit logging
- Service management: request types, queues, SLA tracking, customer portal

### In Scope - Native Add-On Replacements (v1.0)
- Epic Sum Up (native rollup), Gantt Charts, Advanced SLAs, Time Tracking
- MCP Server, ScriptRunner (TypeScript sandbox), Checklists
- Assets/CMDB, Incident Management, Test Management
- Approval Workflows, Report Builder, Dynamic Forms, Retrospective Boards
- Plans / Advanced Roadmaps (cross-project timeline, scenarios)
- Structure (tree visualization, grouping)
- Budget & Cost Management (CAPEX/OPEX, cost rates)
- Capacity Planning (resource allocation, time-off)
- Permission Management (Jira-style RBAC schemes)

### In Scope - External Integrations (v1.0)
- SharePoint (Confluence replacement), GitHub, Salesforce, Power BI

### Out of Scope (Future Phases)
- Native mobile apps (responsive web in v1)
- Plugin/marketplace ecosystem
- Multi-tenant SaaS deployment (architecture supports it from day one)
- AI features beyond MCP

## Competitive Positioning

Ordolix occupies a unique position: enterprise-grade depth (matching Jira) with modern product sensibility (matching Linear). No current product occupies this space.

| Competitor | Ordolix Advantage |
|-----------|------------------|
| Jira Cloud | Same depth, modern UX, native features (no add-ons), AI-native, lower cost |
| Linear | Enterprise features with Linear-quality UX |
| Monday/Asana | Developer-first with enterprise breadth |
| Azure DevOps | Unified platform, superior UX, deeper ITSM |
| ServiceNow | Modern ITSM at fraction of cost, developer-friendly |

## SaaS Pricing Model (Future)

| Plan | Price | Target |
|------|-------|--------|
| Free | $0 (up to 10 users) | Evaluation |
| Team | $8/user/mo | Small teams |
| Business | $16/user/mo | Mid-market |
| Enterprise | Custom | Large orgs |

For 200 users: Jira + add-ons ~$46+/user/mo vs Ordolix Business $16/user/mo = $70K+ annual savings.

## Path to Product

| Phase | Timeline | Milestone |
|-------|----------|-----------|
| 1: Internal Proof | Months 1-8 | Running in production at Proofpoint |
| 2: Product Hardening | Months 9-14 | Multi-tenancy, billing, security audit |
| 3: Private Beta | Months 15-18 | 10-20 external beta customers |
| 4: GA | Months 19-24 | Public launch, paid plans |
| 5: Scale | Month 24+ | 1,000+ customers, $10M+ ARR |
