# ordolix-files/ - Source Specification Documents

These are the original project specification documents authored in February 2026. They serve as the authoritative source for all project requirements.

## Documents

| File | Content | Primary Audience |
|------|---------|-----------------|
| Project-Ordolix-Blueprint.docx | Features, architecture, tech stack, TDD methodology, Claude Code skills/agents, directory structure, CI/CD, hosting (Track A/B), data model (40+ entities), 8-month dev plan, cost analysis | Claude Code (primary dev context), Project Lead |
| Project-Ordolix-Defaults-Reference.docx | All Jira Cloud defaults (issue types, statuses, workflows, priorities, resolutions, fields, permissions, notifications, boards, SLAs), seed data system, test factory pattern, demo data spec, migration overlay | Claude Code (schema + seed implementation) |
| Project-Ordolix-Cross-Cutting-Concerns.docx | Security (auth, OWASP, encryption, scripting sandbox, GDPR), accessibility (WCAG AA), i18n, API versioning, rate limiting, caching, indexing, backup/DR, admin panel, email, keyboard shortcuts, dark mode, responsive/PWA, AQL parser, changelog, bulk ops, onboarding | Claude Code (every module must comply) |
| Project-Ordolix-Feature-Parity-Addendum.docx | Teams integration (channel notifications, bot, meeting, tab app), Outlook integration (email-to-issue, add-in, calendar sync), automation builder (21 triggers, 12 conditions, 22 actions, smart values, templates), notification system (30 events, 6 channels), Jira core feature gap analysis | Claude Code (feature implementation) |
| Project-Ordolix-Product-Vision.docx | 6 design principles, Jira friction analysis, screen-by-screen UX specs, multi-tenancy architecture, competitive positioning, SaaS pricing, Thoma Bravo pitch framework, product-grade architecture (white-labeling, billing, compliance) | Claude Code (UX direction), Leadership (pitch) |

## Usage

These .docx files are the original specs. Distilled Markdown versions are in `docs/` for quick reference. When in doubt, the docx files are the source of truth.

To read these files programmatically:
```python
import zipfile, xml.etree.ElementTree as ET
with zipfile.ZipFile(path) as z:
    tree = ET.fromstring(z.read('word/document.xml'))
    # Extract text from w:p/w:r/w:t elements
```
