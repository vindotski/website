---
title: The site is hosted on Vercel, and GitHub Actions checks hold production until they pass
number: 9
status: accepted
implementation: built
date: 2026-11-02
notes: Vercel's Deployment Checks are configured in each project's settings (DEPLOY.md), not in the repository.
---

## Context

The site was on Vercel from the start. Once it built against a CMS, a push could break production without anyone noticing until it was live.

## Decision

- **Vercel** builds and serves the site, with `www.vin.ski` as its domain and `vin.ski` redirecting to it.
- **GitHub Actions** (`d049986`) runs lint and a production build on every push to `dev` and `main` and on pull requests.
- **Vercel's Deployment Checks** wait for those jobs: a production build goes live only once they pass.

## Alternatives

- **Building and deploying from GitHub Actions** with the Vercel CLI: full control, but tokens to manage and Vercel's Git integration given up.
- **No CI:** Vercel's own build catches build errors, but not lint, and only after a production deploy has started.

## Consequences

- Renaming a CI job means selecting it again in Vercel's Deployment Checks.
- A failed check leaves the live site on its last good version; "Force Promote" overrides it.
