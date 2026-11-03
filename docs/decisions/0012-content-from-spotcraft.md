---
title: Content comes from the vindotski project on api.vin.ski, with git as its source
number: 12
status: accepted
implementation: built
date: 2026-11-03
notes: Built by the demo's steps 1, 3 and 5 (docs/roadmap.md), deployed on 2026-11-03; the 5-minute cache is a `content` profile with a week's expiry, set out in step 3. It follows Spotcraft's roadmap, stage 2, step 14.
---

## Context

Spotcraft's `main` has moved to a new architecture (a git-like content model, its CLI and a hosted API at api.vin.ski), and the old Spotcraft copied into this repository (1) no longer exists there. Spotcraft's roadmap moves vin.ski onto it, as Sokobanko already did. It has no accounts, binary files, search or webhooks yet, and its SDK and CLI aren't published.

## Decision

- **The `vindotski` project on https://api.vin.ski** holds projects and posts, typed by a `_schema.yaml` per folder (Spotcraft's decision 8), with the fields accepted from [parity.md](../parity.md#what-this-means-for-step-1).
- **Git is the source:** `content/` in this repository, checked and imported with Spotcraft's CLI from a `../spotcraft-main` worktree (`content:check`, `content:import`). An edit made in the dashboard is exported back (`content:export`) and committed before the next import.
- **The site reads with `fetch`** at build time, and Next's cache reads again every 5 minutes, so a published edit shows without a deploy.
- **Images live in the site** (`apps/website/public/`), referred to by their path, until Spotcraft stores binary files.
- **Front matter uses the site's field names,** so the mapping from the old Spotcraft's names goes.

## Alternatives

- **The dashboard as the source:** no copy in git, but CI and contributors would have no real content to build against.
- **Rebuilding only on a deploy,** as Spotcraft's step 14 describes: simpler, but every content edit would need one.
- **Staying on the old Spotcraft:** it works, but it's a dead branch of Spotcraft that vin.ski would maintain alone.

## Consequences

- Scheduled posts are public in git, and on the API, whose reads are open (`SPOTCRAFT_SUGGESTIONS.md`).
- Importing replaces whatever is on the project's `main`, so the export-first rule matters.
- The old Spotcraft, its client, and its hosting (Neon, R2, Resend, `cms.vin.ski`) are removed.
