---
title: Production shows only the teaser, decided by the environment, until Spotcraft has accounts
number: 13
status: accepted
implementation: designed
date: 2026-11-03
supersedes: [6]
notes: Replaces only how record 6's gate decides; the teaser, the 404s and the indexing rules stand. The demo's step 3 builds it.
---

## Context

The teaser gate (6) let anyone who could sign in see the full site, through the old Spotcraft's accounts. The new Spotcraft has no accounts until its stage 3, so there's nothing to sign in with.

## Decision

- **Production** (`VERCEL_ENV` is `production`) **shows only the teaser:** `/` is the teaser, and every other path answers 404, as before.
- **Local development and Vercel previews show the full site,** with previews behind Vercel's Deployment Protection.
- **Signing in is removed:** the sign-in routes, the signed-in marker, the admin toolbar and the analytics rule that skipped signed-in visits.

## Alternatives

- **A shared password gate** on production, with a cookie: keeps the toolbar, but it's sign-in code to throw away once Spotcraft has accounts.
- **Launching the full site:** its content has placeholders still (`CONTENT_TODO.md`).

## Consequences

- The full site is reviewed on previews, not on www.vin.ski.
- Sign-in and the admin toolbar come back with Spotcraft's accounts.
