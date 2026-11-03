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

### Step 1: Content in Spotcraft's format
The schemas include the candidates accepted in [parity.md](parity.md#what-this-means-for-step-1).
- [ ] `content/` with a `_schema.yaml` per folder (Spotcraft's decision 8: JSON Schema as YAML, unknown keys are errors, a property declared once from the root down):
  - the root: `title` and `tldr` (required), `date`, `tags`, `order`, `repoUrl` and `demoUrl`;
  - `projects/`: `summary`, `kind`, `stack` and `image`;
  - `projects/work/`: `company`, `role`, `years`, `impact` and `productUrl`;
  - `projects/play/`: `year` and `status`, with `demoUrl` required.
- [ ] One Markdown file per document, named by its slug: `posts/<slug>.md`, `projects/work/<slug>.md` and `projects/play/<slug>.md`, converted from old Spotcraft's export. The keys are the site's own (camelCase, `status`), so the site's mapping layer goes. A document without a `date` is a draft.
- [ ] Images in `apps/website/public/images/projects/`, referred to by their site path.
- [ ] `content:check`, `content:import` and `content:export` scripts running the CLI from a `../spotcraft-main` worktree, as Sokobanko's do, with its setup in the README.
- [ ] `docs:check`: `docs/` checked as Spotcraft content (its `_schema.yaml` files), plus the decision-record rule: every `NNNN-*.md` has `number`, `status` and `date`, and its number matches the file name. Spotcraft's `bin/check-docs.ts` is the model.
- [ ] Imported into `vindotski` on api.vin.ski (`SPOTCRAFT_API_URL` and `SPOTCRAFT_ADMIN_SECRET` set).

### Step 2: The site reads from api.vin.ski
- [ ] `lib/cms.ts`: a small `fetch` client for `SPOTCRAFT_URL` (default `https://api.vin.ski`) and the `vindotski` project. It lists a folder (`/v1/projects/vindotski/content/{folder}/`) and gets one document (`/content/{path}`: `data`, `body` and `headings`).
- [ ] `lib/content/api.ts` validates `data` with the site's schemas as it is, with no key mapping, and caches for 5 minutes. The published filter (`isPublished`) stays.
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
- [ ] CI: one `website` job that checks out Spotcraft's `main` next to this repository, runs `content:check` and lint, and builds against api.vin.ski (reads are open, so no secrets).
- [ ] Docs and repository files: the READMEs, `LICENSE`, `THIRD_PARTY_NOTICES.md`, `.gitattributes`, `.gitignore`, `CONTENT_TODO.md`, and `DEPLOY.md` rewritten for one Vercel project.

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
