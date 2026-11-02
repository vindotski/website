# Portfolio

Portfolio site of Ivan Vinski, product engineer: frontend by trade, full-stack by habit, product by focus. Live at [www.vin.ski](https://www.vin.ski).

A pnpm workspace with two apps: the site, in Next.js, and [Spotcraft](https://github.com/vindotski/spotcraft), the self-hosted CMS its content, search and sign-in come from. How the site works inside is in [`apps/website/README.md`](apps/website/README.md); deploying both is in [`DEPLOY.md`](DEPLOY.md).

Until launch, visitors see a teaser at `/` and every other page answers 404. After logging in, you see the full site.

## Domains

| Domain        | What it is                                                                                |
| ------------- | ----------------------------------------------------------------------------------------- |
| `www.vin.ski` | The site, on Vercel. The canonical address (`siteUrl` in [`config/site.ts`](apps/website/config/site.ts))    |
| `vin.ski`     | Redirects (301) to `www.vin.ski`                                                          |
| `cms.vin.ski` | Spotcraft, on Vercel: the dashboard, the content API and sign-in. `SPOTCRAFT_URL` is `https://cms.vin.ski/vinski` |

Spotcraft's sign-in cookies are set on `vin.ski` (`AUTH_COOKIE_DOMAIN`), so `www.vin.ski` receives them. Locally they need no domain: cookies ignore the port, so `localhost:3000` and `localhost:3001` share them.

## Requirements

- Node.js 26 (Spotcraft needs it)
- pnpm 12 (the exact version is pinned in `package.json` under `packageManager`)
- Docker, for Spotcraft's services (Postgres, Mailpit and S3)
- Optional: a Spotcraft checkout at `../spotcraft`, only to update the vendored copies (see [Updating Spotcraft](#updating-spotcraft))

## Getting started

```bash
pnpm install
cp apps/website/.env.example apps/website/.env.local   # then fill in the two Spotcraft secrets, below
pnpm db:start                           # Spotcraft's Postgres, Mailpit and S3 in Docker
pnpm db:migrate
pnpm dashboard                          # Spotcraft, http://localhost:3000
pnpm dev                                # the site, http://localhost:3001
```

`apps/dashboard/.env` (gitignored) holds Spotcraft's settings. In `apps/website/.env.local`, set `SPOTCRAFT_API_TOKEN` to its `SPOTCRAFT_API_TOKEN`, and `SPOTCRAFT_WEBHOOK_SECRET` to its `WEBHOOK_SECRET`. Its `WEBHOOK_URL` is `http://localhost:3001/api/spotcraft`.

Then open [http://localhost:3001](http://localhost:3001). You'll see the teaser. To see the full site:

1. Have a Spotcraft account that's a superadmin or a member of the `vinski` site. The account made at `/onboard` is a superadmin; others are invited from the dashboard's Users page. Sign-ups are off.
2. In the dashboard, set the `vinski` site's URL to `http://localhost:3001` (Settings → Site). Sign-in only sends you back to a site's own address.
3. Log in at [http://localhost:3001/auth/login](http://localhost:3001/auth/login), which goes to Spotcraft's sign-in and back.

**Spotcraft's Docker stack is shared** with the `../spotcraft` checkout: its compose file is named `spotcraft`, so both use the same containers and database. vin.ski is the `vinski` site in it, at `http://localhost:3000/vinski`; the checkout's `example` and `docs` sites sit beside it. Both dashboards serve on port 3000, so run one at a time.

## Scripts

Run from the repository root.

| Command      | What it does                         |
| ------------ | ------------------------------------ |
| `pnpm dev`   | Start the site's development server, on port 3001 |
| `pnpm build` | Create a production build of the site (Spotcraft must be running) |
| `pnpm start` | Serve the production build, on port 3001 |
| `pnpm lint`  | Run ESLint on the site               |
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
DEPLOY.md                   Deploying both apps to Vercel, with Neon, R2 and Resend
CONTENT_TODO.md             Placeholders left in the content, to fill in Spotcraft
spotcraft-content/          pnpm cms:export's backup (gitignored)
```

`apps/dashboard` and `packages/spotcraft-client` are copies of Spotcraft's `main` branch; see [Updating Spotcraft](#updating-spotcraft). The workspace root holds only what both apps share: the scripts above, the pnpm settings and the lockfile, the shared `.gitignore`, and the agent skills in `.claude/`. Each app keeps its own TypeScript, lint, shadcn and env settings, since they're built with different tools.

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

- [ ] Finish [`DEPLOY.md`](DEPLOY.md)'s after-deploy checks: test the webhook, delete the Supabase project and the `api.vin.ski` record, and turn on Web Analytics and Speed Insights

## License & Trademarks

The site (`apps/website`) and **all of vin.ski's content** (its text, posts, project write-ups, images and portraits, including what's stored in Spotcraft) are Copyright (c) 2026-present Ivan Vinski. **All rights reserved** ([`apps/website/LICENSE`](apps/website/LICENSE)). The source is public so it can be read, not reused.

The other parts keep their own licenses:

- **Spotcraft** (`apps/dashboard`) is open source under the [GNU Affero General Public License Version 3 (AGPLv3)](apps/dashboard/LICENSE) or any later version. It's a separate program the site talks to over HTTP, so its license doesn't extend to the site. Its **Source code** link points at this repository, as the AGPL asks of a copy that people use over a network.
- **`@spotcraft/client`** (`packages/spotcraft-client`) is [MIT licensed](packages/spotcraft-client/LICENSE), so the site can include it.
- **shadcn/ui components** in `apps/website/components/ui` are [MIT licensed](apps/website/components/ui/LICENSE), Copyright (c) 2023 shadcn.
- **Agent skills** in `.claude/skills` belong to their authors, under their licenses (sources in `skills-lock.json`).

The vin.ski and Spotcraft names and logos are trademarks of Ivan Vinski.
