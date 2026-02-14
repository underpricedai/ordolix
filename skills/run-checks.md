# Skill: Run Checks

Runs all project quality checks for the Ordolix codebase.

## Usage

```
/run-checks [--fix] [--only <check>]
```

- `--fix`: Auto-fix linting issues where possible.
- `--only`: Run only a specific check (`typecheck`, `lint`, `test`, `prisma`, `build`).

## Instructions

When this skill is invoked, run the following checks in order. Stop and report on the first failure unless all checks are requested.

### 1. Prisma Validation

Validate the Prisma schema is correct:

```bash
npx prisma validate --config ./prisma/prisma.config.ts
```

If this fails, the schema has errors that must be fixed before proceeding.

### 2. Prisma Client Generation

Ensure the Prisma client is up to date:

```bash
npx prisma generate --config ./prisma/prisma.config.ts
```

This must succeed before type-checking, as TypeScript depends on generated types.

### 3. TypeScript Type Check

Run the TypeScript compiler in check-only mode:

```bash
npx tsc --noEmit
```

Report any type errors with file paths and line numbers. These must be fixed before the code can be deployed.

### 4. ESLint

Run the linter across the entire codebase:

```bash
npx next lint
```

If `--fix` was specified, run with auto-fix:

```bash
npx next lint --fix
```

Report any remaining lint errors or warnings.

### 5. Unit and Integration Tests

Run the Vitest test suite:

```bash
npx vitest run
```

Report test results including:
- Total tests run
- Tests passed
- Tests failed (with details)
- Test suites with failures

For a specific module's tests only:

```bash
npx vitest run src/modules/<module-name>/
```

### 6. Build Verification (Optional)

If explicitly requested or running full checks before a commit, verify the Next.js build:

```bash
npm run build
```

This catches issues that type-check alone may miss (e.g., dynamic imports, route conflicts).

## Check Summary

After running all checks, provide a summary table:

| Check | Status | Details |
|-------|--------|---------|
| Prisma Validate | PASS/FAIL | Schema validation |
| Prisma Generate | PASS/FAIL | Client generation |
| Type Check | PASS/FAIL | N errors |
| Lint | PASS/FAIL | N errors, N warnings |
| Tests | PASS/FAIL | N passed, N failed |
| Build | PASS/FAIL/SKIP | Build output |

## Quick Reference

| Check | Command |
|-------|---------|
| All checks | Run steps 1-5 in order |
| Prisma only | `npx prisma validate --config ./prisma/prisma.config.ts` |
| Types only | `npx tsc --noEmit` |
| Lint only | `npx next lint` |
| Lint + fix | `npx next lint --fix` |
| Tests only | `npx vitest run` |
| Single test | `npx vitest run <path-to-test>` |
| Build only | `npm run build` |

## Important Notes

- Always run from the project root: `/home/frank/ordolix`
- Prisma commands require `--config ./prisma/prisma.config.ts` (Prisma 7 does not auto-detect the config file)
- The `.env` file is loaded by `prisma.config.ts` via `dotenv`, not by Prisma itself
- Type-check depends on Prisma generate (always run generate first)
- Tests use Vitest (not Jest) -- configuration is in `vitest.config.ts`
- Lint uses the Next.js built-in ESLint integration
