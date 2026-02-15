# Skill: i18n Audit

Finds missing, unused, or inconsistent translation keys in the codebase.

## Usage

```
/i18n-audit [--fix] [--module <module-name>]
```

- `--fix`: Automatically add placeholder values for missing keys
- `--module`: Scope the audit to a specific module

## Instructions

### Step 1: Scan for Translation Usage

Find all `useTranslations()` calls and `t()` key references in the codebase:

```bash
# Find all useTranslations namespace declarations
grep -rn "useTranslations(" src/ --include="*.tsx" --include="*.ts"

# Find all t() calls to identify used keys
grep -rn 't("' src/ --include="*.tsx" --include="*.ts"
```

If `--module` is specified, scope to `src/modules/<module>/` only.

### Step 2: Parse the Translation File

Read `src/messages/en.json` and build a complete map of all available keys, organized by namespace.

### Step 3: Cross-Reference

For each `useTranslations("<namespace>")` + `t("<key>")` pair found in the code:

1. Check if the namespace exists in `en.json`
2. Check if the specific key exists under that namespace
3. Handle nested keys (e.g., `t("columns.key")` maps to `{ "columns": { "key": "..." } }`)

### Step 4: Report Findings

Generate a report with three sections:

#### Missing Keys (Critical)
Keys referenced in code but not in `en.json`. These cause runtime crashes.

```
MISSING: errors.title (used in src/app/error.tsx:39)
MISSING: signIn.title (used in src/app/auth/signin/page.tsx:51)
```

#### Unused Keys (Warning)
Keys in `en.json` not referenced by any component. These are safe to remove but indicate dead code.

```
UNUSED: dashboard.oldFeature (not referenced in any file)
```

#### Namespace Mismatches (Error)
Components using a namespace that doesn't exist in `en.json`.

```
MISMATCH: namespace "myNewFeature" used in src/modules/my-new-feature/components/Page.tsx but not found in en.json
```

### Step 5: Auto-Fix (if `--fix`)

For each missing key:

1. Determine the namespace from `useTranslations()`
2. Generate a placeholder value based on the key name:
   - `title` → `"Title"` (capitalize)
   - `pageDescription` → `"Page Description"` (split camelCase)
   - `createItem` → `"Create Item"` (split camelCase)
3. Add the key to `src/messages/en.json` under the correct namespace
4. Report all keys added

### Step 6: Summary

| Category | Count |
|----------|-------|
| Missing keys | N |
| Unused keys | N |
| Namespace mismatches | N |
| Keys auto-added | N (if --fix) |

## Common Missing Key Patterns

| Pattern | Likely Namespace | Example Key |
|---------|-----------------|-------------|
| Error boundary | `errors` | `title`, `description`, `tryAgain`, `goHome` |
| Page header | `<moduleName>` | `title`, `pageDescription` |
| Form buttons | `common` | `save`, `cancel`, `delete` |
| Empty states | `<moduleName>` | `emptyTitle`, `emptyDescription` |
| Auth pages | `signIn` / `auth` | `title`, `subtitle`, `ssoButton` |

## Important Notes

- Missing i18n keys cause **runtime crashes** — the error boundary itself may fail if its keys are missing
- All user-facing strings must use `t()` from `next-intl` — never hardcode strings
- Translation file: `src/messages/en.json`
- Namespaces map to top-level keys in the JSON file
- Nested keys use dot notation in `t()` calls: `t("columns.key")` → `{ "columns": { "key": "..." } }`
