# Dashboard

[Spotcraft](https://github.com/vindotski/spotcraft), the CMS behind vin.ski: the dashboard where projects and posts are edited, the API the site reads them from, search, and sign-in. It's live at [cms.vin.ski](https://cms.vin.ski), and vin.ski is its `vinski` site, at `https://cms.vin.ski/vinski`.

This folder is a copy of Spotcraft's `main` branch, at the commit in [`SPOTCRAFT_VERSION`](SPOTCRAFT_VERSION). How Spotcraft works is in [its documentation](https://spotcraft.vin.ski/); this file covers only how vin.ski runs it. Setup and scripts are in the [repository README](../../README.md), deploying in [`DEPLOY.md`](../../DEPLOY.md).

## Don't change it here

Fix or add things in Spotcraft, merge them to its `main`, then copy them over (see [Updating Spotcraft](../../README.md#updating-spotcraft)). A change made only here is overwritten by the next copy.

Our copy differs from `main` in four places:

- **No Docker deploy:** `Dockerfile`, `Dockerfile.dockerignore`, `docker-compose.prod.yml` and the `docker:prod` script are gone; it runs on Vercel. `docker-compose.yml` stays, for local development.
- **`package.json`:** named `dashboard` (`pnpm --filter dashboard …`), without `docker:prod` or the `repository` field.
- **This README and `SPOTCRAFT_VERSION`,** which `main` doesn't have.

[`LICENSE`](LICENSE) is Spotcraft's: AGPL-3.0. Because it serves users over a network, its source has to stay available to them; `VITE_SPOTCRAFT_SOURCE_URL` points the dashboard's "Source code" link at this repository.

## Locally

- **Settings** are in `.env` (gitignored), from [`.env.example`](.env.example). Every variable is described in Spotcraft's [Environment reference](https://spotcraft.vin.ski/reference/environment/).
- **Services:** `pnpm db:start` starts Postgres (with pgvector), Mailpit for email (http://localhost:8025) and SeaweedFS for images, in Docker.
- **It runs on port 3000** (`pnpm dashboard`), next to the site on 3001. The `vinski` site's URL is `http://localhost:3001`, so signing in sends you back to the site.
- **The Docker stack is shared** with the `../spotcraft` checkout, if you have one. Its compose project is named `spotcraft`, so both use the same database: vin.ski's `vinski` site sits next to the checkout's `example` and `docs` sites. This has two consequences:
  - **Use the checkout's `BETTER_AUTH_SECRET` here.** Sign-in keys are encrypted with it, and both apps read the same keys.
  - **A `db:reset` or migration in the checkout reaches vin.ski's data too.** Restore with `pnpm cms:import --apply` from a `pnpm cms:export` backup.

## In production

On Vercel, as its own project with root directory `apps/dashboard`, using Neon for Postgres, Cloudflare R2 for images and Resend for email. Migrations run from your machine before a deploy, never on Vercel. All of it is in [`DEPLOY.md`](../../DEPLOY.md).
