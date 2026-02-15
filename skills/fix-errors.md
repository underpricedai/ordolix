# Skill: Fix Errors

Systematically diagnoses and fixes type errors, lint errors, test failures, and runtime errors.

## Usage

```
/fix-errors [--type <error-type>] [--module <module-name>]
```

- `--type`: Focus on a specific error type: `typecheck`, `lint`, `test`, `runtime` (default: all)
- `--module`: Focus on a specific module under `src/modules/`

## Instructions

When this skill is invoked, follow this workflow:

### Step 1: Collect Errors

Run the appropriate commands based on the error type requested:

**Type errors:**
```bash
npx tsc --noEmit 2>&1
```

**Lint errors:**
```bash
npx next lint 2>&1
```

**Test failures:**
```bash
npx vitest run 2>&1
```

If `--module` is specified, scope the test run:
```bash
npx vitest run src/modules/<module-name>/ 2>&1
```

If no `--type` is specified, run all three in order: typecheck, lint, tests.

### Step 2: Analyze and Group Errors

Group errors by root cause. Common categories:

1. **Missing imports** — Module not found, cannot find name
2. **Type mismatches** — Type 'X' is not assignable to type 'Y'
3. **Missing properties** — Property 'X' does not exist on type 'Y'
4. **Schema drift** — Prisma types out of sync (run `prisma generate`)
5. **i18n gaps** — Missing translation keys causing runtime crashes
6. **Stale test mocks** — Mock shape doesn't match updated types

### Step 3: Fix in Dependency Order

Fix errors in this order to prevent cascading issues:

1. **Prisma client** — Run `npx prisma generate --config ./prisma/prisma.config.ts` if Prisma types are stale
2. **Shared types/schemas** — Fix `src/shared/types/` and Zod schemas first
3. **Service layers** — Fix `src/modules/*/server/*-service.ts`
4. **tRPC routers** — Fix `src/modules/*/server/*-router.ts`
5. **Components** — Fix `src/modules/*/components/*.tsx`
6. **Pages** — Fix `src/app/**/*.tsx`
7. **Tests** — Fix test files last (they depend on all the above)

### Step 4: Verify After Each Batch

After fixing a group of related errors, re-run the check:

```bash
npx tsc --noEmit 2>&1 | head -30
```

This catches any new errors introduced by the fix. Continue until zero errors remain.

### Step 5: Final Verification

Run the full check suite:

```bash
npx tsc --noEmit && npx next lint && npx vitest run
```

Report a summary:

| Check | Before | After |
|-------|--------|-------|
| Type errors | N | 0 |
| Lint errors | N | 0 |
| Test failures | N | 0 |

## Common Fix Patterns

### Prisma Types Out of Sync
```bash
npx prisma generate --config ./prisma/prisma.config.ts
```

### Missing i18n Keys
Add the missing key to `src/messages/en.json` under the appropriate namespace.

### Import Path Issues
Check for `@/` path aliases. All imports from `src/` use `@/` prefix.

### Mock Shape Mismatch
Update test mocks in `tests/fixtures/factories.ts` to match current types.

### Lint Auto-Fix
```bash
npx next lint --fix
```

## Important Notes

- Always run `prisma generate` before type-checking
- Fix root-cause errors first (types/schemas) before fixing consumers
- If an error count increases after a fix, revert and try a different approach
- Check `tests/fixtures/factories.ts` when multiple tests fail with similar errors
