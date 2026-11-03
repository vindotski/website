---
title: Roadmap
description: The demo (vin.ski's content from Spotcraft on api.vin.ski), then what comes after it.
---

# Roadmap

**Numbering:** a bare number in parentheses, like "(12)", is one of this repository's [decision records](decisions/README.md). Spotcraft's are written out as "Spotcraft's decision N", since the two sets of numbers overlap.

**References:** Spotcraft's plan for vin.ski is its roadmap, stage 2, step 14 (`docs/roadmap.md` on Spotcraft's `main`). Sokobanko made the same move first; its roadmap and `SPOTCRAFT_SUGGESTIONS.md` are the pattern followed here. What integrating turns up that Spotcraft could support better goes in [`SPOTCRAFT_SUGGESTIONS.md`](../SPOTCRAFT_SUGGESTIONS.md). The Spotcraft repository isn't changed from here.

## Demo: vin.ski on Spotcraft

**The goal:** vin.ski's projects and posts come from the `vindotski` project on https://api.vin.ski, and the site is deployed with them. When it's done, it's tagged `demo` ("Spotcraft Content Integration").

The Spotcraft in this repository today (`apps/dashboard`, `packages/spotcraft-client`, copied from Spotcraft's `main` at `cfc4db5`) no longer exists on Spotcraft's `main`, which has moved to the new architecture: a git-like content model, `@spotcraft/core`, the `spotcraft` CLI and the hosted API. This demo moves vin.ski onto it and removes the old copy.

**Decided for the demo:**
- **The content's source is git.** `content/` in this repository is checked and imported with Spotcraft's CLI, as Sokobanko's levels are. A document edited in the dashboard is exported back and committed (12).
- **The site reads at build time and every 5 minutes.** Pages are prerendered from api.vin.ski, and Next's cache reads it again every 5 minutes, so a published edit shows without a deploy. There's no publish webhook yet (12).
- **No sign-in.** The new Spotcraft has no accounts until its stage 3. Production shows only the teaser; local development and Vercel previews show the full site, with previews behind Vercel's Deployment Protection (13).
- **No search.** It comes back with Spotcraft's search (its stage 4) (14).
- **Images live in the site** (`apps/website/public/`). Spotcraft stores only Markdown and schemas until its stage 3 (12).
- **The site reads with `fetch`.** `@spotcraft/sdk` isn't published yet (12).
- **Each step is checked in the running app** with `next-dev-loop` (15): the pages it changes (home, a project, a post, the teaser) render, and the console and Next's errors are clean. Lint and the build still run too.

### Step 0: Tools
- [x] `agent-browser` 0.31.1 or later (`npm i -g agent-browser@latest`), for `next-dev-loop`. That skill also needs Next.js 16.3 or later (the site has 16.4.3) and Turbopack in `next dev`, which is Next 16's default.
- [x] A `../spotcraft-main` worktree on Spotcraft's `main` (`git -C ../spotcraft worktree add ../spotcraft-main main`), with `pnpm install` run in it. Steps 1 and 5 run Spotcraft's CLI from it, and it's only ever updated with `git pull` on `main`.

### Step 1: Content in Spotcraft's format
The schemas include the candidates accepted in [parity.md](parity.md#what-this-means-for-step-1).
- [x] `content/` with a `_schema.yaml` per folder (Spotcraft's decision 8: JSON Schema as YAML, unknown keys are errors, a property declared once from the root down):
  - the root: `title`, `tags` and `tldr` (required, as the site's schemas require them), `date`, `order`, `repoUrl` and `demoUrl`;
  - `projects/`: `summary`, `kind`, `stack` and `image`;
  - `projects/work/`: `company`, `role`, `years`, `impact` and `productUrl`, and the optional `team` and `reach` (one line each) and `results` (a list of `label`, `value` and `measured`, a boolean, all three required in each item);
  - `projects/play/`: `year` and `status`, with `demoUrl` required.
- [x] One Markdown file per document, named by its slug: `posts/<slug>.md`, `projects/work/<slug>.md` and `projects/play/<slug>.md`, converted from old Spotcraft's export. The keys are the site's own (camelCase, `status`), so the site's mapping layer goes. A document without a `date` is a draft.
- [x] The convention that every work project's body has a "Decisions" section: each decision with the options rejected and why. The schema can't check it, so `work/_schema.yaml` and the `vinski-content` skill state it, and `CONTENT_TODO.md` tracks writing the sections.
- [x] Images in `apps/website/public/images/projects/`, referred to by their site path.
- [x] `content:check`, `content:import` and `content:export` scripts running the CLI from the step 0 worktree, as Sokobanko's do, with the worktree's setup in the README.
- [x] `docs:check`: `docs/` checked as Spotcraft content (its `_schema.yaml` files), plus the decision-record rule: every `NNNN-*.md` has `number`, `status` and `date`, and its number matches the file name. It runs Spotcraft's `bin/check-docs.ts` from the worktree, pointed at `docs/`.
- [x] `.claude/skills/vinski-content`, a skill of our own (15): the content folders and their schemas, Spotcraft's rules (unknown keys are errors, a property declared once), and `content:check`, `content:import` and `content:export`, with the export-first rule.
- [x] Imported into `vindotski` on api.vin.ski (`SPOTCRAFT_API_URL` and `SPOTCRAFT_ADMIN_SECRET` set).

### Step 2: The site reads from api.vin.ski
- [ ] `lib/cms.ts`: a small `fetch` client for `SPOTCRAFT_URL` (default `https://api.vin.ski`) and the `vindotski` project. It lists a folder (`/v1/projects/vindotski/content/{folder}/`) and gets one document (`/content/{path}`: `data`, `body` and `headings`).
- [ ] `lib/content/api.ts` validates `data` with the site's schemas as it is, with no key mapping. The published filter (`isPublished`) stays.
- [ ] A `content` cache profile in `next.config.ts` for everything read from Spotcraft: `stale` and `revalidate` of 5 minutes, and an `expire` of a week. A published edit shows within 5 minutes, and a quiet site keeps serving its last good content while it refreshes, even when api.vin.ski is down. Not the `minutes` preset: it expires after an hour without visits, and the next visitor would wait on api.vin.ski. An `expire` under 5 minutes would also make the pages dynamic instead of prerendered (`next/dist/docs`, `cacheLife`).
- [ ] Heading ids from `github-slugger` in the body renderer, matching the API's `headings`.
- [ ] Removed: the webhook route (`app/api/spotcraft`), the remote image pattern, `@spotcraft/client`, `SPOTCRAFT_API_TOKEN` and `SPOTCRAFT_WEBHOOK_SECRET`.

### Step 3: The teaser without accounts
- [ ] `proxy.ts`: in production, `/` shows the teaser and every other page is a 404, as for guests today. Anywhere else, the full site.
- [ ] Removed: the sign-in feature (`features/auth`, `/auth/login`, `/api/me`, the signed-in marker), the admin toolbar (`features/admin`, `/api/admin/content-status`, its before-paint script and room in the layout), and the analytics rule that skipped signed-in visits.
- [ ] Vercel's Deployment Protection on preview deployments.

### Step 4: No search
- [ ] Removed: `features/search`, `/api/search`, the header's search button and ⌘K, and the `search` and `search_select` events.

### Step 5: The old Spotcraft removed
- [ ] `apps/dashboard`, `packages/spotcraft-client`, the CI content fixture (`.github/ci/`), and the scripts that ran them (`dashboard`, `db:*`, `cms:*`, `search:sync`).
- [ ] CI: one `website` job that checks out Spotcraft's `main` next to this repository and runs `pnpm install` there, then runs `content:check`, `docs:check` and lint, and builds against api.vin.ski (reads are open, so no secrets).
- [ ] `allowBuilds` in `pnpm-workspace.yaml` pruned to what the remaining packages build (`koffi` came with the old dashboard), checked with `pnpm approve-builds`.
- [ ] Docs and repository files: the READMEs, `LICENSE`, `THIRD_PARTY_NOTICES.md`, `.gitattributes`, `.gitignore`, `CONTENT_TODO.md`, and `DEPLOY.md` rewritten for one Vercel project, then reviewed with `writing-guidelines` (15).

### Step 6: Deploy
- [ ] Vercel: `SPOTCRAFT_URL=https://api.vin.ski`, the old variables removed, then deployed.
- [ ] The old stack taken down: the Spotcraft Vercel project and `cms.vin.ski`, Neon, R2, Resend and Turnstile.

### Done when
- [ ] https://www.vin.ski serves the teaser, and a preview deployment serves the full site from api.vin.ski.
- [ ] A document edited and published in Spotcraft's dashboard against api.vin.ski shows on a preview within 5 minutes. Then `pnpm content:export` brings the edit back into git.
- [ ] CI is green.

### Later, for the integration
- Sign-in and the admin toolbar, on Spotcraft's accounts (its stage 3).
- Search, on Spotcraft's search (its stage 4).
- Images stored in Spotcraft (binary files, its stage 3).
- A publish webhook instead of the 5-minute cache.
- `@spotcraft/sdk` instead of `fetch`, once it's published.
- Drafts on Spotcraft branches (`?ref=`) instead of "no date".

### Later, agent skills (15)
- `next-partial-prefetching-optimizer` and `next-bundle-optimizer` (vercel/next.js), for a performance pass before launch.
- In the same pass, `next-cache-components-optimizer` (installed) adds `@next/playwright` `instant()` tests for home and the project and post pages, bringing Playwright into the repository and CI.
- `vercel-optimize` (vercel-labs/agent-skills), once there's traffic to measure.
- `webapp-testing` (anthropics/skills), when the site gets tests.
