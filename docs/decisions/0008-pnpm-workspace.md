---
title: The repository is a pnpm workspace, with apps in apps/ and packages in packages/
number: 8
status: accepted
implementation: built
date: 2026-11-01
---

## Context

Bringing in a CMS meant a second app next to the site (the old Spotcraft's dashboard, see 1), and then a shared client package.

## Decision

- **A pnpm workspace** (`039966b`): `apps/*` and `packages/*`, one lockfile, pnpm's version pinned in `packageManager`.
- **The root holds only what's shared:** the scripts most commands start from, the pnpm settings, the shared `.gitignore`, the docs and the agent skills. Each app keeps its own TypeScript, lint and env settings.

## Alternatives

- **Separate repositories:** cleaner ownership, but a change across the site and its CMS would span two of them.
- **Turborepo or Nx:** caching and task graphs that a site and one app don't need.

## Consequences

- Vercel builds `apps/website` with files outside its root directory included.
- When the demo removes the old Spotcraft (12), the workspace may hold the site alone; it stays a workspace, so a package can come back without restructuring.
