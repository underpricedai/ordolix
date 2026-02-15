# Skill: Deploy

Manages Vercel deployments, pre-flight checks, and deployment debugging.

## Usage

```
/deploy [--check] [--status] [--env]
```

- `--check`: Run pre-deployment verification (default behavior)
- `--status`: Check current deployment status
- `--env`: Audit environment variables

## Instructions

### Pre-Deployment Check (default)

Run all checks before deploying to ensure the build will succeed:

#### 1. Local Build Verification

```bash
npx prisma generate --config ./prisma/prisma.config.ts && npm run build
```

If the build fails, stop and fix errors before deploying.

#### 2. Type Check and Lint

```bash
npx tsc --noEmit && npx next lint
```

#### 3. Test Suite

```bash
npx vitest run
```

#### 4. Environment Variable Audit

Check that all required environment variables are set in `.env`:

```
DATABASE_URL          — Neon PostgreSQL connection string
UPSTASH_REDIS_URL     — Upstash Redis URL
UPSTASH_REDIS_TOKEN   — Upstash Redis token
NEXTAUTH_SECRET       — NextAuth.js secret
NEXTAUTH_URL          — Application URL
```

Read the `.env` file and verify each required variable exists (do NOT print actual values). Report any missing variables.

Also check `src/server/env.ts` or `src/env.ts` for the canonical list of required variables defined with `@t3-oss/env-nextjs`.

#### 5. Schema Validation

```bash
npx prisma validate --config ./prisma/prisma.config.ts
```

#### 6. Summary

Report a pre-flight checklist:

| Check | Status |
|-------|--------|
| Prisma validate | PASS/FAIL |
| Prisma generate | PASS/FAIL |
| TypeScript | PASS/FAIL |
| ESLint | PASS/FAIL |
| Tests | PASS/FAIL |
| Build | PASS/FAIL |
| Env vars | PASS/FAIL |

### Deployment Status (`--status`)

Check the current Vercel deployment status:

```bash
npx vercel ls --limit 5 2>&1 || echo "Vercel CLI not installed. Install with: npm i -g vercel"
```

If the Vercel CLI is not available, instruct the user to check the Vercel dashboard at https://vercel.com.

### Environment Audit (`--env`)

Compare local `.env` with what Vercel expects:

1. Read `.env` and list all variable names (not values)
2. Check `src/server/env.ts` for the `createEnv()` call to find required vs optional variables
3. Report any variables in code but not in `.env`

```bash
npx vercel env ls 2>&1 || echo "Run 'vercel link' first to connect to the project"
```

## Common Deployment Issues

### Build Fails on Vercel but Works Locally
- Check that `prisma generate` runs in the Vercel build command: `"build": "prisma generate && next build"`
- Ensure `DATABASE_URL` is set in Vercel environment variables
- Check for Node.js version mismatch (project uses Node 20+)

### Missing Environment Variables
- All env vars must be set in Vercel dashboard or via `vercel env add`
- The `@t3-oss/env-nextjs` validation will fail the build if required vars are missing

### Prisma Client Not Generated
- The `build` script in `package.json` must run `prisma generate` before `next build`
- Verify: `"build": "prisma generate && next build"`

### Database Connection Fails
- Neon databases sleep after inactivity — first request may timeout
- Check connection string format: `postgresql://user:pass@host/db?sslmode=require`

## Important Notes

- Never deploy with failing tests or type errors
- Always run the full check suite before deploying
- The Vercel build command is defined in `package.json`: `"build": "prisma generate && next build"`
- Database migrations must be applied separately from deployments
- Preview deployments are created automatically for each PR via Vercel
