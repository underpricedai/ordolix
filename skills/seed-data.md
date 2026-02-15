# Skill: Seed Data

Generates and inserts realistic demo data for development and testing.

## Usage

```
/seed-data [--scenario <scenario>] [--reset]
```

- `--scenario`: Data scenario to seed: `minimal`, `demo` (default), `load-test`
- `--reset`: Reset database before seeding (requires confirmation)

## Instructions

### Scenario: `minimal`

Creates the bare minimum for the app to function:

```bash
npm run db:seed
```

This creates:
- 1 organization ("Default Organization")
- 1 dev user (dev@ordolix.local)
- 1 organization member (administrator)
- Default issue types, statuses, priorities, resolutions, workflows

### Scenario: `demo` (default)

Creates a full demo environment for testing all features:

```bash
npm run db:seed
```

This seeds everything from `minimal` plus:
- 3 projects (DEMO, ENG, IT) with Kanban boards
- 15 issues across projects with varied types, statuses, and priorities
- 2 sprints for ENG project (1 active, 1 future)
- 3 time log entries
- Dev user as project member on all projects

### Scenario: `load-test`

Creates a large dataset for performance testing. Use the `createDemoDataset` function from `tests/fixtures/scenarios.ts`:

1. First ensure defaults are seeded:
   ```bash
   npm run db:seed
   ```

2. Then run a custom load script or use Prisma Studio to verify scale:
   ```bash
   npm run db:studio
   ```

The `createDemoDataset` function in `tests/fixtures/scenarios.ts` creates:
- Additional demo users with organization memberships
- Multiple projects with boards
- Service desk project with queues

### Pre-Seed Checklist

Before seeding, ensure:

1. **Schema is pushed** — `npm run db:push`
2. **Database is accessible** — Check `DATABASE_URL` in `.env`
3. **Prisma client is generated** — `npx prisma generate --config ./prisma/prisma.config.ts`

### With Reset

If `--reset` is specified, **ask for confirmation first**, then:

```bash
npx prisma migrate reset --config ./prisma/prisma.config.ts --force
npm run db:seed
```

### Verification

After seeding, verify data exists:

```bash
npm run db:studio
```

Or check that the dev server loads without "Something went wrong":

```bash
npm run dev
```

## Seed Files

| File | Purpose |
|------|---------|
| `prisma/seed.ts` | Main seed: org, user, projects, issues, sprints, time logs |
| `tests/fixtures/scenarios.ts` | Reusable scenario functions (seedDefaults, createProjectWithBoard, etc.) |
| `tests/fixtures/defaults.ts` | Default configuration constants (issue types, statuses, workflows) |
| `tests/fixtures/factories.ts` | Factory functions for test data generation |

## Important Notes

- The seed is **idempotent** — safe to run multiple times without duplicating data
- Uses `upsert` for organization, user, and member records
- Uses `skipDuplicates: true` for bulk creates (issue types, statuses, priorities)
- Skips issue creation if issues already exist for a project
- The dev user `dev@ordolix.local` enables `createDevSession()` for local development auth bypass
