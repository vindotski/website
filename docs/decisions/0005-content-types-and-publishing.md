---
title: Content types are defined once and validated by Zod; no date is a draft, a future date is scheduled
number: 5
status: accepted
implementation: built
date: 2026-10-30
---

## Context

Projects and posts moved from hard-coded data into files, then into a CMS. Wherever they're stored, the site needs to know each type's fields, where its pages live, and what's public.

## Decision

- **`CONTENT_TYPES`** (`config/content-types.ts`, `962169a`) defines each type once: its label, route, Zod schema and sort order. Nothing else lists the types.
- **Every document is validated** by its type's schema when it's read, so a bad field fails the build and names the document.
- **Publishing** (`lib/content/publish.ts`, `eadc55f`): a document without a date is a draft; a future date is scheduled; today or earlier, in UTC, is public. `next dev` shows drafts and scheduled items with a badge; builds leave them out everywhere.

## Alternatives

- **Trusting the CMS's types:** the CMS has changed twice in a week (1); the site's own schemas stayed.
- **Publishing status as a field** (draft, published): it can't express "public from next Tuesday".

## Consequences

- The rule lives in the site, not the CMS, so it survives a change of CMS. Spotcraft's checks (12) and these schemas both have to accept a document.
- A scheduled item goes live within the cache's refresh after its date, without a deploy.
