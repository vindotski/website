# Portfolio

Portfolio site of Ivan Vinski, product engineer: frontend by trade, full-stack by habit, product by focus. Live at [www.vin.ski](https://www.vin.ski).

A pnpm workspace with two apps: the site, in Next.js, and [Spotcraft](https://github.com/vindotski/spotcraft), the self-hosted CMS its content came from until the demo (see [Content](#content)). How the site works inside is in [`apps/website/README.md`](apps/website/README.md); deploying both is in [`DEPLOY.md`](DEPLOY.md).

Until launch, production shows a teaser at `/`, and every other page answers 404. Local development and Vercel previews show the full site; previews sit behind Vercel's Deployment Protection.

## Domains

| Domain        | What it is                                                                                |
| ------------- | ----------------------------------------------------------------------------------------- |
| `www.vin.ski` | The site, on Vercel. The canonical address (`siteUrl` in [`config/site.ts`](apps/website/config/site.ts))    |
| `vin.ski`     | Redirects (301) to `www.vin.ski`                                                          |
| `cms.vin.ski` | Spotcraft, on Vercel: the dashboard, the content API and sign-in. `SPOTCRAFT_URL` is `https://cms.vin.ski/vinski` |

## Requirements

- Node.js 26 (Spotcraft needs it)
- pnpm 12 (the exact version is pinned in `package.json` under `packageManager`)
- Docker, for Spotcraft's services (Postgres, Mailpit and S3)
- Optional: a Spotcraft checkout at `../spotcraft`, only to update the vendored copies (see [Updating Spotcraft](#updating-spotcraft))
- For `content:*` and `docs:check`: a `../spotcraft-main` worktree (see [Content](#content))

## Getting started

```bash
pnpm install
cp apps/website/.env.example apps/website/.env.local
pnpm dev                                # the site, http://localhost:3001
```

The site reads its content from api.vin.ski (see [Content](#content)), so `pnpm dev` alone shows the full site at [http://localhost:3001](http://localhost:3001), and `.env.local` needs nothing. The old Spotcraft (`apps/dashboard`) no longer serves the site; it stays until the demo's step 5 removes it, run with `pnpm db:start`, `pnpm db:migrate` and `pnpm dashboard`.

**Spotcraft's Docker stack is shared** with the `../spotcraft` checkout: its compose file is named `spotcraft`, so both use the same containers and database. vin.ski is the `vinski` site in it, at `http://localhost:3000/vinski`; the checkout's `example` and `docs` sites sit beside it. Both dashboards serve on port 3000, so run one at a time.

## Scripts

Run from the repository root.

| Command      | What it does                         |
| ------------ | ------------------------------------ |
| `pnpm dev`   | Start the site's development server, on port 3001 |
| `pnpm build` | Create a production build of the site (Spotcraft must be running) |
| `pnpm start` | Serve the production build, on port 3001 |
| `pnpm lint`  | Run ESLint on the site               |
| `pnpm content:check` | Check `content/` against its schemas, with Spotcraft's CLI |
| `pnpm content:import` | Publish `content/` to the `vindotski` project on the new Spotcraft (see [Content](#content)) |
| `pnpm content:export` | Write the `vindotski` project back into `content/`, after an edit in Spotcraft's dashboard |
| `pnpm docs:check` | Check `docs/` against its schemas, and that every decision record has a number, status and date |
| `pnpm dashboard` | Start Spotcraft, on port 3000     |
| `pnpm db:start` | Start Spotcraft's Postgres, Mailpit and S3 in Docker |
| `pnpm db:migrate` | Apply Spotcraft's database migrations |
| `pnpm cms:export` | Write the `vinski` site out as files (Markdown and images) to `spotcraft-content/`: a backup |
| `pnpm cms:import` | Read `spotcraft-content/` back into the `vinski` site; a dry run until `--apply` |
| `pnpm search:sync` | Rebuild the `vinski` site's search index |

Arguments after a script are passed on, e.g. `pnpm cms:import --apply`. Spotcraft's other scripts run with `pnpm --filter dashboard <script>`.

## Workspace

```
apps/website/               The site (Next.js); see its README
apps/dashboard/             Spotcraft: the CMS, its API, search and sign-in (TanStack Start); see its README
packages/spotcraft-client/  @spotcraft/client, which the site reads content and sessions with
content/                    The content in the new Spotcraft's format: Markdown typed by _schema.yaml files
.github/                    CI (build checks), issue and pull request templates, CI sample content
docs/                       The roadmap, the content parity, and the decision records
DEPLOY.md                   Deploying both apps to Vercel, with Neon, R2 and Resend
CONTENT_TODO.md             Placeholders left in the content, to fill in Spotcraft
spotcraft-content/          pnpm cms:export's backup (gitignored)
```

`apps/dashboard` and `packages/spotcraft-client` are copies of Spotcraft's `main` branch; see [Updating Spotcraft](#updating-spotcraft). The workspace root holds only what both apps share: the scripts above, the pnpm settings and the lockfile, the shared `.gitignore`, and the agent skills in `.claude/`. Each app keeps its own TypeScript, lint, shadcn and env settings, since they're built with different tools.

## Content

The site reads its content from the new Spotcraft (the demo in [`docs/roadmap.md`](docs/roadmap.md)). It's in `content/`: one Markdown file per post or project, named by its slug, with each folder's fields typed by its `_schema.yaml`. The content's source is git. It's imported into the `vindotski` project on [api.vin.ski](https://api.vin.ski), and images live in the site, in `apps/website/public/images/projects/`.

The scripts run Spotcraft's CLI from a worktree of its `main` branch, since the CLI isn't on npm yet:

```bash
git -C ../spotcraft worktree add ../spotcraft-main main
pnpm --dir ../spotcraft-main install
git -C ../spotcraft-main pull                  # to update it later; it stays on main
```

`content:import` and `content:export` need `SPOTCRAFT_API_URL` (`https://api.vin.ski`) and `SPOTCRAFT_ADMIN_SECRET` in the environment. An import makes the project's `main` match `content/`, so an edit made in the dashboard since the last import would be lost. **Export and commit first:** `pnpm content:export`, commit, then `pnpm content:import`.

## Updating Spotcraft

`apps/dashboard` and `packages/spotcraft-client` are copies of [Spotcraft](https://github.com/vindotski/spotcraft)'s `main` branch, at the commit in their `SPOTCRAFT_VERSION` files. Copy from `main` only, never from a checkout's working tree: work in progress lives on its `dev` branch.

```bash
tmp=$(mktemp -d)
git -C ../spotcraft archive main apps/dashboard packages/client | tar -x -C "$tmp"
rsync -a --exclude Dockerfile --exclude Dockerfile.dockerignore --exclude docker-compose.prod.yml \
  --exclude package.json "$tmp/apps/dashboard/" apps/dashboard/
rsync -a --exclude '*.test.ts' "$tmp/packages/client/src/" packages/spotcraft-client/src/
git -C ../spotcraft rev-parse --short main   # write it into both SPOTCRAFT_VERSION files
pnpm install                                 # rebuilds the client
pnpm db:migrate
```

- **`package.json` files:** ours differ from Spotcraft's in name and scripts (see [`apps/dashboard/README.md`](apps/dashboard/README.md) for every difference), so compare them with `$tmp` and copy new or changed dependencies by hand.
- **Deleted files:** rsync doesn't remove files that `main` deleted. Check with `git -C ../spotcraft diff --stat --diff-filter=D <old>..main`, where `<old>` is the previous `SPOTCRAFT_VERSION`.
- **Production:** run the migration there before deploying (see [`DEPLOY.md`](DEPLOY.md)).
- **The local database is shared** with the checkout (see [Getting started](#getting-started)), so a migration or `db:reset` on its `dev` branch reaches vin.ski's local data too. Restore with `cms:import` from a `cms:export` backup.

## Launch checklist

- [ ] Finish [`DEPLOY.md`](DEPLOY.md)'s after-deploy checks: delete the Supabase project and the `api.vin.ski` record, and turn on Web Analytics and Speed Insights

## Contributing

Fixes are welcome: see [CONTRIBUTING.md](CONTRIBUTING.md) for what to send where, and the terms that keep vin.ski Ivan Vinski's work. Please follow the [Code of Conduct](CODE_OF_CONDUCT.md), and report security problems privately ([SECURITY.md](SECURITY.md)).

## License & Trademarks

The repository is Copyright (c) 2026-present Ivan Vinski, all rights reserved ([`LICENSE`](LICENSE)). The site (`apps/website`) and **all of vin.ski's content** (its text, posts, project write-ups, images and portraits, in `content/` and in Spotcraft) are Copyright (c) 2026-present Ivan Vinski. **All rights reserved** ([`apps/website/LICENSE`](apps/website/LICENSE)). The source is public so it can be read, not reused.

**Third-party code** copied into the repo (shadcn/ui components, Lucide's icon shapes, agent skills) keeps its own licenses: see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Spotcraft, which serves the content from api.vin.ski, is a separate program the site reads over HTTP; none of it is in this repository.

The vin.ski and Spotcraft names and logos are trademarks of Ivan Vinski.
