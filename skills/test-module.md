# Skill: Test Module

Runs tests for a specific module with focused output, supporting TDD workflow.

## Usage

```
/test-module <module-name> [--coverage] [--watch] [--file <filename>]
```

- `module-name`: The module under `src/modules/` (e.g., `issues`, `workflows`, `boards`, `time-tracking`)
- `--coverage`: Generate a coverage report for the module
- `--watch`: Run tests in watch mode for TDD iteration
- `--file`: Run a specific test file within the module

## Instructions

### 1. Validate the Module

Check that `src/modules/<module-name>/` exists. If not, list available modules:

```bash
ls src/modules/
```

### 2. Run Tests

**Standard run:**
```bash
npx vitest run src/modules/<module-name>/
```

**With coverage:**
```bash
npx vitest run src/modules/<module-name>/ --coverage
```

**Watch mode (TDD):**
```bash
npx vitest src/modules/<module-name>/
```

**Specific file:**
```bash
npx vitest run src/modules/<module-name>/**/<filename>
```

### 3. Report Results

After the test run, report:

- Total test files found in the module
- Tests passed / failed / skipped / todo
- Any error details for failed tests
- Coverage summary (if `--coverage` was used)

### 4. If Tests Fail

For each failing test:
1. Show the test name and file path
2. Show the error message and relevant diff
3. Suggest a fix based on the error type:
   - **Type mismatch**: Check if schema/types changed — run `prisma generate`
   - **Mock mismatch**: Check `tests/fixtures/factories.ts` for stale mocks
   - **Assertion failure**: Compare expected vs actual values
   - **Import error**: Check for renamed/moved files

## Available Modules

The following modules exist in `src/modules/`:
- `approvals`, `assets`, `automation`, `boards`, `checklists`
- `custom-fields`, `dashboards`, `forms`, `gantt`, `incidents`
- `issues`, `notifications`, `projects`, `queues`, `reports`
- `retrospectives`, `scripts`, `search`, `settings`, `sla`
- `sprints`, `test-management`, `time-tracking`, `users`, `workflows`

## Quick Reference

| Action | Command |
|--------|---------|
| Run module tests | `npx vitest run src/modules/<module>/` |
| Run with coverage | `npx vitest run src/modules/<module>/ --coverage` |
| Watch mode | `npx vitest src/modules/<module>/` |
| Run single file | `npx vitest run <path-to-test-file>` |
| Run all tests | `npx vitest run` |

## Important Notes

- Tests use Vitest (not Jest) — configuration is in `vitest.config.ts`
- Test files are co-located with source code (e.g., `issue-service.test.ts` next to `issue-service.ts`)
- Factory functions for test data are in `tests/fixtures/factories.ts`
- MSW is used for mocking external API calls
- Prisma-dependent tests may need the database seeded first (`/db-manage seed`)
