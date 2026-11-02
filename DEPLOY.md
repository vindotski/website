# Deploying to Vercel

Two Vercel projects from this one repo:

| Project | Root directory | Domain | What it is |
| --- | --- | --- | --- |
| Spotcraft | `apps/dashboard` | `cms.vin.ski` | The CMS: content, images, search, sign-in |
| Website | `apps/website` | `www.vin.ski` | The site (the existing `portfolio` project) |

**Deploy Spotcraft first.** The site's build reads its pages from Spotcraft, so it fails while Spotcraft is down. Sign-in works across both because they share the `vin.ski` cookie domain.

Services: **Neon** (Postgres), **Cloudflare R2** (images), **Resend** (email), and **Cloudflare Turnstile** on Spotcraft's sign-in.

## 1. Services

### Neon (database)

1. Create a Neon project, in a region close to where the Spotcraft functions will run (e.g. AWS `eu-central-1` with Vercel's `fra1`). Through the Vercel Marketplace or directly at neon.tech: either works.
2. Copy two connection strings from the Neon console:
   - **Pooled** (host contains `-pooler`): `DATABASE_URL` on Vercel. Serverless functions open many short connections; the pooler absorbs them.
   - **Direct** (no `-pooler`): for migrations and imports from your machine.

pgvector is built into Neon. The first migration enables it (`create extension if not exists vector`); nothing to do by hand.

### Cloudflare R2 (images)

1. Create a bucket, e.g. `spotcraft`. Keep it private: Spotcraft serves images itself at `/media`.
2. Create an R2 API token with **Object Read & Write** on that bucket. Note the access key ID and secret.
3. The endpoint is `https://<account-id>.r2.cloudflarestorage.com` (the bucket isn't in it; Spotcraft uses path-style URLs).

### Resend (email)

Spotcraft sends invites and password resets.

1. Add and verify the domain `vin.ski` (the DNS records Resend lists).
2. Create an API key with sending access.
3. `SMTP_URL=smtp://resend:<api-key>@smtp.resend.com:587`, and `MAIL_FROM=Spotcraft <noreply@vin.ski>`.

### Cloudflare Turnstile (sign-in)

Add `cms.vin.ski` to the widget's hostnames (or create a widget for it). Note the site key and secret key.

## 2. Secrets

Generate three, each at least 32 random characters, and keep them in your password manager:

```sh
openssl rand -base64 32   # BETTER_AUTH_SECRET
openssl rand -base64 32   # SPOTCRAFT_API_TOKEN
openssl rand -base64 32   # WEBHOOK_SECRET
```

**Never change `BETTER_AUTH_SECRET` once Spotcraft is live.** It encrypts the key that signs sign-in tokens; a new secret can't decrypt the old key, and every sign-in fails until the database is fixed by hand.

## 3. Spotcraft project

### Create it

In Vercel: **Add New → Project**, import this repository, then:

- **Root Directory:** `apps/dashboard`. Vercel detects TanStack Start; Nitro builds for Vercel on its own (`vite.config.ts` pins the function runtime to `nodejs26.x`).
- **Install and build commands:** leave the defaults. Vercel installs the whole pnpm workspace with the version in the root `packageManager`.
- Don't deploy yet: set the variables first. If the first deploy runs anyway, it fails or starts without a database; that's harmless.

In the project's settings:

- **Functions → Function Region:** the one closest to Neon (e.g. `fra1`).
- **Git → Ignored Build Step / preview deployments:** turn previews off, for example with the ignored build step `[ "$VERCEL_ENV" != "production" ]`. A preview would run against the production database and could change it.
- **Domains:** add `cms.vin.ski` and create the DNS record Vercel shows.

### Environment variables

Production environment only.

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Neon's **pooled** URL |
| `BETTER_AUTH_SECRET` | From step 2 |
| `BETTER_AUTH_URL` | `https://cms.vin.ski` |
| `AUTH_COOKIE_DOMAIN` | `vin.ski` |
| `SMTP_URL` | `smtp://resend:<api-key>@smtp.resend.com:587` |
| `MAIL_FROM` | `Spotcraft <noreply@vin.ski>` |
| `S3_ENDPOINT` | `https://<account-id>.r2.cloudflarestorage.com` |
| `S3_BUCKET` | `spotcraft` |
| `S3_ACCESS_KEY_ID` | R2 token's access key ID |
| `S3_SECRET_ACCESS_KEY` | R2 token's secret |
| `S3_REGION` | `auto` |
| `SPOTCRAFT_API_TOKEN` | From step 2 |
| `WEBHOOK_URL` | `https://www.vin.ski/api/spotcraft` |
| `WEBHOOK_SECRET` | From step 2 |
| `TURNSTILE_SITE_KEY` | From Turnstile |
| `TURNSTILE_SECRET_KEY` | From Turnstile |
| `VITE_SPOTCRAFT_SOURCE_URL` | `https://github.com/vindotski/portfolio` (AGPL: the source of the version you run, with its changes) |
| `OPENAI_API_KEY` | Optional: search by meaning, not just words. Run `search:sync` after adding it |

`VITE_` variables are baked in at build time: redeploy after changing one.

### Migrate, then deploy

Migrations never run on Vercel. Run them from your machine against the **direct** URL, before every deploy that brings new ones:

```sh
cd apps/dashboard
DATABASE_URL='<neon direct url>' pnpm db:migrate
```

A variable set in the shell wins over `apps/dashboard/.env`, so the local database is untouched.

Then deploy (**Deployments → Redeploy**, or push to `main`).

### Onboard right away

Open `https://cms.vin.ski`. It sends you to `/onboard`: create your account there **immediately**, since until then anyone who finds the URL could take it.

## 4. Content

Copy vin.ski's content from your local Spotcraft into production. Run these from the repo root with the local stack up (`pnpm db:start` in `apps/dashboard`).

1. A fresh export from local:

   ```sh
   pnpm cms:export ../../spotcraft-content --site vinski
   ```

2. Production values in your shell, in a file **outside the repo** (e.g. `~/vinski-production.env`) holding the **direct** `DATABASE_URL`, the four `S3_*` variables and `S3_REGION`:

   ```sh
   set -a; source ~/vinski-production.env; set +a
   ```

3. A dry run, then the import. `--create-site` makes the `vinski` site; `--site-url` points its links and the sign-in redirect allowlist at the real site:

   ```sh
   pnpm cms:import ../../spotcraft-content --site vinski --create-site --site-url https://www.vin.ski
   pnpm cms:import ../../spotcraft-content --site vinski --create-site --site-url https://www.vin.ski --apply --yes
   ```

   `--yes` confirms the database isn't local.

4. Build the search index (same shell):

   ```sh
   pnpm --filter dashboard search:sync --site vinski
   ```

5. Close the shell, so the next command doesn't run against production by accident.

Check `https://cms.vin.ski/vinski`: the documents and images should be there.

## 5. Website project

The existing `portfolio` project. In its settings:

- **Build and Deployment → Root Directory:** `apps/website`, with **Include files outside the root directory in the Build Step** on. The site uses the workspace's `packages/spotcraft-client`, which `pnpm install` builds.
- **Node.js Version:** 26.x (also pinned in `apps/website/package.json`).
- **Environment variables** (Production and Preview):

  | Variable | Value |
  | --- | --- |
  | `SPOTCRAFT_URL` | `https://cms.vin.ski/vinski` |
  | `SPOTCRAFT_API_TOKEN` | Same as Spotcraft's |
  | `SPOTCRAFT_WEBHOOK_SECRET` | Spotcraft's `WEBHOOK_SECRET` |

- **Remove** the old Supabase variables (`NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_*`) and the Turnstile ones; nothing reads them now.
- **Domains:** `www.vin.ski` as the main domain, and `vin.ski` redirecting to it with a 301.

Deploy. The build lists the pages from Spotcraft, so a failure that mentions fetching from `cms.vin.ski` means Spotcraft isn't up yet.

**Previews** show the content, but signing in on `*.vercel.app` doesn't work: the sign-in cookie belongs to `vin.ski`, and Spotcraft only redirects back to the site's own URL. That's expected; until launch, a preview shows only the teaser.

## 6. After the first deploy

- [ ] Sign in through `https://www.vin.ski/auth/login`. It goes to Spotcraft and back, signed in. The old Supabase session is gone.
- [ ] Edit and save a document in Spotcraft, then reload its page on the site: the webhook should have updated it within seconds. Failed deliveries show in the Spotcraft project's logs on Vercel.
- [ ] Delete the hosted Supabase project and the `api.vin.ski` DNS record.
- [ ] Turn on Web Analytics and Speed Insights for the website project.

## Updating later

- **Spotcraft:** after copying a new version from Spotcraft's `main` (see [Updating Spotcraft](README.md#updating-spotcraft)), run `pnpm db:migrate` against the direct URL **before** the deploy goes out: new code expects the new schema.
- **Both projects build on every push** unless told otherwise. In each project, **Build and Deployment → Root Directory → Skip deployments when there are no changes to the root directory or its dependencies** keeps a site-only change from redeploying Spotcraft, and the other way round.
- **Content changes** need no deploy: the webhook refreshes the site.

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| Site build fails fetching from Spotcraft | Spotcraft is down or `SPOTCRAFT_URL` is wrong. Deploy Spotcraft first |
| Every sign-in fails with "Failed to decrypt private key" | `BETTER_AUTH_SECRET` changed. Put the old one back |
| Signing in lands on Spotcraft's dashboard, not the site | The `vinski` site's URL in Spotcraft isn't `https://www.vin.ski`, so the redirect back isn't allowed. Fix it in Spotcraft's site settings |
| Signed in on Spotcraft but not on the site | `AUTH_COOKIE_DOMAIN` isn't `vin.ski`, or the site isn't on a `vin.ski` subdomain |
| Edits don't show on the site | The webhook: `WEBHOOK_URL`, and `WEBHOOK_SECRET` matching the site's `SPOTCRAFT_WEBHOOK_SECRET`. Spotcraft's logs on Vercel show why |
| Images missing | The `S3_*` variables, or the R2 token lacks write access (imports) or read access (serving) |
| Invites and resets never arrive | `SMTP_URL`, or `vin.ski` not verified in Resend |
