---
title: Decisions
description: vin.ski's Architecture Decision Records, numbered in order.
---

# Decisions (ADRs)

Architecture Decision Records for vin.ski, numbered in order, in [Spotcraft's format](https://github.com/vindotski/spotcraft/tree/main/docs/decisions). Each one says what was decided, why, what else was considered, and what follows from it. Record 1 also sums up what was decided and replaced before records began.

- **Changing a decision:** write a new record, and list the old one in its `supersedes`. The old record gets `superseded_by` (and `status: superseded` if it's wholly replaced); its body isn't rewritten.
- **Status:** each record's front matter says whether the decision is built yet, or only designed.
- **Numbers:** a bare number in parentheses, like "(12)", is one of these records. Spotcraft's own are written out as "Spotcraft's decision N".

| # | Decision | Status |
| --- | --- | --- |
| [1](0001-decision-records.md) | Decisions are recorded in `docs/decisions/`, in Spotcraft's format | Accepted |
| [2](0002-nextjs.md) | The site is Next.js 16 with the App Router and Cache Components, prerendered | Built |
| [3](0003-tailwind-and-shadcn.md) | Styling is Tailwind CSS v4 and shadcn/ui, with semantic tokens and no CSS Modules | Built |
| [4](0004-architecture.md) | Code flows shared → features → app, enforced by ESLint; TanStack Query only for browser requests | Partly built |
| [5](0005-content-types-and-publishing.md) | Content types are defined once and validated by Zod; no date is a draft, a future date is scheduled | Built |
| [6](0006-teaser-before-launch.md) | Before launch, an indexable teaser at `/` and 404 everywhere else; only production is indexable | Built; how the gate decides superseded by 13 |
| [7](0007-analytics.md) | Analytics are Vercel Web Analytics and Speed Insights, cookieless, with a small event vocabulary | Built |
| [8](0008-pnpm-workspace.md) | The repository is a pnpm workspace, with apps in `apps/` and packages in `packages/` | Built |
| [9](0009-vercel-and-ci.md) | The site is hosted on Vercel, and GitHub Actions checks hold production until they pass | Built |
| [10](0010-licensing.md) | The repository and vin.ski's content are all rights reserved; third-party parts keep their licenses | Built |
| [11](0011-contributions.md) | Contributions come in under a license grant to Ivan Vinski, with no CLA bot | Built |
| [12](0012-content-from-spotcraft.md) | Content comes from the `vindotski` project on api.vin.ski, with git as its source | Designed (demo) |
| [13](0013-teaser-by-environment.md) | Production shows only the teaser, decided by the environment, until Spotcraft has accounts | Built |
| [14](0014-no-search-for-now.md) | No search until Spotcraft has search | Built |
| [15](0015-agent-skills.md) | Agent skills are chosen for the stack and the roadmap, installed with the skills CLI into `.claude/skills` | Built |

Each record is laid out the same way, with its fields typed by [`_schema.yaml`](_schema.yaml):

- **Front matter:** `title`, `number` (matching the file name), `status` (`accepted` or `superseded`), `implementation` (`built`, `partly-built` or `designed`; left out for a principle), `date`, and where they apply `supersedes`, `superseded_by` and `notes`.
- **Sections:** Context, Decision, Alternatives and Consequences.

From the demo's step 1, `pnpm docs:check` checks them with Spotcraft's CLI, as Spotcraft checks its own.
