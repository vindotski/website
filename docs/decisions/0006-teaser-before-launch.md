---
title: Before launch, an indexable teaser at / and 404 everywhere else; only production is indexable
number: 6
status: accepted
implementation: built
date: 2026-10-30
superseded_by: [13]
notes: Record 13 replaces how the gate decides who sees the full site (it was signing in); the teaser, the 404s and the indexing rules stand.
---

## Context

The site is built in the open, deployed long before its content is ready. Visitors and search engines should find a deliberate page, not placeholders, and the real pages shouldn't be indexed early.

## Decision

- **Before launch, `/` serves a teaser** with a 200, and every other path answers 404, `/teaser` included (`5e37c64`). Rewrites, not redirects, so each URL keeps an honest status.
- **Everyone who could sign in saw the full site** (Supabase, then the old Spotcraft; see 1).
- **The teaser is indexable,** so nothing has to change for search engines at launch.
- **Only production is indexable:** `isProduction` drives the robots meta tag and `robots.ts`; previews and local builds say `noindex` and `Disallow: /`.
- **Every response is `Cache-Control: private, no-store`,** since one URL serves different pages.

## Alternatives

- **Launching with placeholders:** honest, but the first impression would be unfinished.
- **A password-protected site:** hides the teaser from search engines too.

## Consequences

- Robots, the sitemap and generated icons skip the gate, so anything served there is public: the sitemap lists only `/` until launch.
- Launching is removing the gate and the teaser route.
