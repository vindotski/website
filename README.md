# Portfolio

Portfolio site of Ivan Vinski, product engineer: frontend by trade, full-stack by habit, product by focus. Live at [www.vin.ski](https://www.vin.ski).

The site is Next.js, in `apps/website`. Its projects and posts are Markdown in `content/`, served by Spotcraft from the `vindotski` project on api.vin.ski. How the site works inside is in [`apps/website/README.md`](apps/website/README.md), and deploying it is in [`DEPLOY.md`](DEPLOY.md).

Until launch, production shows a teaser at `/`, and every other page answers 404. Local development and Vercel previews show the full site; previews sit behind Vercel's Deployment Protection.

## Domains

| Domain | What it is |
| --- | --- |
| `www.vin.ski` | The site, on Vercel. The canonical address (`siteUrl` in [`config/site.ts`](apps/website/config/site.ts)) |
| `vin.ski` | Redirects (308, permanent) to `www.vin.ski` |
| `api.vin.ski` | Spotcraft's API, where the site reads its content. Not part of this repository |

## Requirements

- Node.js 26
- pnpm 12 (the exact version is pinned in `package.json` under `packageManager`)
- For `content:*` and `docs:check` only: a `../spotcraft-main` worktree (see [Content](#content))

## Getting started

```bash
pnpm install
cp apps/website/.env.example apps/website/.env.local
pnpm dev                                # http://localhost:3001
```

The site reads its content from api.vin.ski, whose reads are open, so `.env.local` needs nothing and `pnpm dev` shows the full site, drafts and scheduled posts included.

## Scripts

Run from the repository root.

| Command | What it does |
| --- | --- |
| `pnpm dev` | Start the site's development server, on port 3001 |
| `pnpm build` | Create a production build of the site |
| `pnpm start` | Serve the production build, on port 3001 |
| `pnpm lint` | Run ESLint on the site |
| `pnpm content:check` | Check `content/` against its schemas, with Spotcraft's CLI |
| `pnpm content:import` | Publish `content/` to the `vindotski` project on api.vin.ski |
| `pnpm content:export` | Write the `vindotski` project back into `content/`, after an edit in Spotcraft's dashboard |
| `pnpm docs:check` | Check `docs/` against its schemas, and that every decision record has a number, status and date |

## Content

Every post and project is one Markdown file in `content/`, named by its slug: `posts/<slug>.md`, `projects/work/<slug>.md` and `projects/play/<slug>.md`. Each folder's `_schema.yaml` types its front matter, and `content:check` fails on a missing field or an unknown key. Images live in the site, in `apps/website/public/images/projects/`. Git is the content's source, and it's imported into Spotcraft (decision 12). The [`vinski-content`](.claude/skills/vinski-content/SKILL.md) skill has the fields, the body sections and the rules.

The scripts run Spotcraft's CLI from a worktree of its `main` branch, since the CLI isn't on npm yet:

```bash
git -C ../spotcraft worktree add ../spotcraft-main main
pnpm --dir ../spotcraft-main install
git -C ../spotcraft-main pull                  # to update it later; it stays on main
```

`content:import` and `content:export` need `SPOTCRAFT_API_URL` (`https://api.vin.ski`) and `SPOTCRAFT_ADMIN_SECRET` in the environment. An import makes the project's `main` match `content/`, so an edit made in the dashboard since the last import would be lost. **Export and commit first:** `pnpm content:export`, commit, then `pnpm content:import`. A published edit shows on the site within 5 minutes, with no deploy.

## Workspace

```text
apps/website/      The site (Next.js); see its README
content/           Posts and projects: Markdown typed by _schema.yaml files, imported into Spotcraft
docs/              The roadmap, the content parity, and the decision records
.github/           CI, issue and pull request templates
.claude/skills/    Agent skills (decision 15)
DEPLOY.md          Deploying the site to Vercel
CONTENT_TODO.md    Placeholders left in the content
```

The workspace root holds the scripts above, the pnpm settings and the lockfile, the shared `.gitignore`, and the agent skills.

## Contributing

Fixes are welcome: see [CONTRIBUTING.md](CONTRIBUTING.md) for what to send where, and the terms that keep vin.ski Ivan Vinski's work. Please follow the [Code of Conduct](CODE_OF_CONDUCT.md), and report security problems privately ([SECURITY.md](SECURITY.md)).

## License and trademarks

The repository is Copyright (c) 2026-present Ivan Vinski, all rights reserved ([`LICENSE`](LICENSE)). The site (`apps/website`) and **all of vin.ski's content** (its text, posts, project write-ups, images and portraits, in `content/` and in Spotcraft) are Copyright (c) 2026-present Ivan Vinski. **All rights reserved** ([`apps/website/LICENSE`](apps/website/LICENSE)). The source is public so it can be read, not reused.

**Third-party code** copied into the repo (shadcn/ui components, Lucide's icon shapes, agent skills) keeps its own licenses: see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Spotcraft, which serves the content from api.vin.ski, is a separate program the site reads over HTTP; none of it is in this repository.

The vin.ski and Spotcraft names and logos are trademarks of Ivan Vinski.
