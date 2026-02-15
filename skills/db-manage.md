# Skill: Database Management

Manages Prisma schema, migrations, seeding, and the Neon PostgreSQL database.

## Usage

```
/db-manage <command>
```

**Commands:**
- `push` — Push schema to the database
- `seed` — Seed default and demo data
- `migrate <name>` — Create and apply a named migration
- `studio` — Open Prisma Studio
- `reset` — Reset the database and re-seed (requires confirmation)
- `status` — Check migration status and connection health
- `generate` — Regenerate the Prisma client

## Instructions

### `push` — Push Schema

Push the current Prisma schema to the Neon database without creating a migration:

```bash
npx prisma db push --config ./prisma/prisma.config.ts
```

Use this during development when iterating on the schema. For production, use `migrate` instead.

### `seed` — Seed Database

Run both seed scripts to populate the database with default and demo data:

```bash
npm run db:seed
```

This creates:
- Organization, dev user, organization member (enables dev auth)
- Issue types, statuses, priorities, resolutions, workflows
- 3 demo projects (DEMO, ENG, IT) with boards
- 15 demo issues across projects
- Sprints for ENG project
- Time log entries

The seed is idempotent — safe to run multiple times.

### `migrate <name>` — Create Migration

Create a new migration with the given name:

```bash
npx prisma migrate dev --name <name> --config ./prisma/prisma.config.ts
```

After migration, regenerate the client:

```bash
npx prisma generate --config ./prisma/prisma.config.ts
```

### `studio` — Open Prisma Studio

Launch the visual database browser:

```bash
npm run db:studio
```

### `reset` — Reset Database

**WARNING: This deletes all data.** Ask for confirmation before proceeding.

```bash
npx prisma migrate reset --config ./prisma/prisma.config.ts --force
npm run db:seed
```

### `generate` — Regenerate Client

Regenerate the Prisma client after schema changes:

```bash
npx prisma generate --config ./prisma/prisma.config.ts
```

This must be run before `npx tsc --noEmit` to ensure generated types are up to date.

### `status` — Check Status

Check migration status and verify the database connection:

```bash
npx prisma migrate status --config ./prisma/prisma.config.ts
```

## Important Notes

- **Prisma 7 requires `--config ./prisma/prisma.config.ts`** on all commands. It does not auto-detect the config file.
- The config file loads `.env` via `dotenv`. Prisma does not auto-load `.env` in v7.
- `PrismaClient` must always be instantiated with `{ adapter }` — never with no arguments.
- `PrismaNeon` takes a `PoolConfig` object: `new PrismaNeon({ connectionString })`.
- The `driverAdapters` preview feature is removed in Prisma 7 — adapters work without it.
- No `url`/`directUrl` in `schema.prisma` — connection is configured in `prisma.config.ts`.
- Always run `generate` before `tsc --noEmit` since TypeScript depends on generated types.
