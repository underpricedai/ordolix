# src/app/ - Next.js App Router

## Purpose

Next.js App Router pages and layouts. This directory handles routing and page composition only. Business logic lives in `src/modules/` and `src/server/`.

## Layout Structure

- `layout.tsx` — Root layout with providers (auth, theme, i18n, query client, real-time)
- `globals.css` — Tailwind directives and CSS variables (theme colors)
- Pages import and compose components from `src/modules/`

## Route Structure (Planned)

```
/                           — Dashboard (redirect to default project board or personal dashboard)
/auth/signin                — Azure AD SSO login
/[projectKey]/              — Project root (redirects to board)
/[projectKey]/board         — Board view (Kanban/Scrum)
/[projectKey]/backlog       — Backlog management
/[projectKey]/timeline      — Gantt/timeline view
/[projectKey]/sprints       — Sprint management
/[projectKey]/issues/[key]  — Issue detail (full page)
/[projectKey]/reports       — Project reports
/[projectKey]/queue         — Service desk queue (JSM projects)
/[projectKey]/settings      — Project settings
/search                     — Advanced search (AQL)
/dashboards                 — Dashboard management
/dashboards/[id]            — Specific dashboard
/admin                      — Global admin panel
/admin/users                — User management
/admin/workflows            — Visual workflow editor
/admin/fields               — Custom field management
/admin/permissions          — Permission scheme editor
/admin/automation           — Global automation rules
/admin/integrations         — Integration settings
/admin/system               — System settings
/api/v1/                    — REST API (external consumers)
/api/odata/v1/              — OData endpoint (Power BI)
/api/trpc/                  — tRPC API (internal)
```

## Conventions

- Pages are thin: they fetch data and compose module components
- Server components by default, client components only when needed (interactivity)
- Loading states via loading.tsx files (skeleton UI, never blank screens)
- Error boundaries via error.tsx files
- Metadata via generateMetadata for SEO
- Middleware in `middleware.ts` at project root for auth, security headers, tenant detection
