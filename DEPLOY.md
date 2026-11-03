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
   - When it asks what else the app needs, pick **Just Postgres**. Spotcraft brings its own sign-in, R2 holds the images, and the code runs on Vercel.
   - Skip Neon's "set up with your AI agent" prompt and `neon init`. They write a database URL into a `.env` at the repo root, which nothing here reads, and add Neon skills and an MCP server the repo doesn't need.
2. Copy two connection strings from the Neon console:
   - **Pooled** (host contains `-pooler`): `DATABASE_URL` on Vercel. Serverless functions open many short connections; the pooler absorbs them.
   - **Direct** (no `-pooler`): for migrations and imports from your machine.

pgvector is built into Neon. The first migration enables it (`create extension if not exists vector`); nothing to do by hand.

### Cloudflare R2 (images)

1. Create a bucket. Keep it private: Spotcraft serves images itself at `/media`. Its name is `S3_BUCKET` below.
2. Create an R2 API token with **Object Read & Write** on that bucket. Note the access key ID and secret.
3. The endpoint is `https://<account-id>.r2.cloudflarestorage.com`, without the bucket: Spotcraft uses path-style URLs. **A bucket in the EU jurisdiction has `.eu.` in it:** `https://<account-id>.eu.r2.cloudflarestorage.com`. The bucket's settings page shows the right one.

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

### Never change `BETTER_AUTH_SECRET`

**Never change it once Spotcraft is live.** It encrypts the key that signs sign-in tokens; a new secret can't decrypt the old key, and every sign-in fails until the database is fixed by hand.

### The production env file

Everything you run against production from your machine (migrations, the content import, the search index) reads its settings from one file **outside the repo**, so nothing in the repo can point at production by accident. Create `~/vinski-production.env`:

```sh
DATABASE_URL='<neon direct url>'
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_BUCKET=<bucket>
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_REGION=auto
```

and `chmod 600 ~/vinski-production.env`. The `DATABASE_URL` is Neon's **direct** one, and the `S3_*` values are the same ones Vercel gets below.

To use it, load it into a **new terminal**, run the commands, then close that terminal:

```sh
set -a; source ~/vinski-production.env; set +a
```

Variables in the shell win over `apps/dashboard/.env`, so in that terminal every `pnpm db:*`, `cms:*` and `search:sync` command hits production. That's why it gets closed afterwards.

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
| `S3_ENDPOINT` | `https://<account-id>.r2.cloudflarestorage.com` (with `.eu.` for an EU bucket) |
| `S3_BUCKET` | The bucket's name |
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

The `S3_*` values must match `~/vinski-production.env` exactly: the import uploads images to one bucket, and Spotcraft serves them from the one named here.

**Changing a variable doesn't change a running deployment.** Redeploy after every change; `VITE_` ones are also baked into the build.

### Migrate, then deploy

Migrations never run on Vercel. Run them from your machine, before every deploy that brings new ones, in a new terminal from the repo root:

```sh
set -a; source ~/vinski-production.env; set +a
pnpm db:migrate
```

Then deploy (**Deployments → Redeploy**, or push to `main`).

### Onboard right away

Open `https://cms.vin.ski`. It sends you to `/onboard`: create your account there **immediately**, since until then anyone who finds the URL could take it.

Spotcraft then asks for a first site. Name it `vinski` with the slug `vinski`, and set its address to `https://www.vin.ski` in its settings. The site's API is at `https://cms.vin.ski/vinski`, and sign-in only sends people back to that address.

## 4. Content

Copy vin.ski's content from your local Spotcraft into production. Run these from the repo root, with the local stack up (`pnpm db:start`).

1. **Export from local first, before loading the production env.** In a terminal where it's loaded, the export reads production instead and overwrites `spotcraft-content/` with whatever is there, which is nothing yet:

   ```sh
   pnpm cms:export
   ```

   It should report 10 documents and their images.

2. Load the production env, then do a dry run. It lists what it would add; `--site-url` keeps the site's address at the real site:

   ```sh
   set -a; source ~/vinski-production.env; set +a
   pnpm cms:import --site-url https://www.vin.ski
   ```

   If it says there's no site `vinski`, add `--create-site`.

3. Import, then build the search index:

   ```sh
   pnpm cms:import --site-url https://www.vin.ski --apply --yes
   pnpm search:sync
   ```

   `--yes` confirms the database isn't local.

4. Close the terminal.

Check `https://cms.vin.ski/vinski/api/site` (the site's name and address) and an image from a project page. If the images don't load, see Troubleshooting.

## 5. Website project

The existing `portfolio` project. In its settings:

- **Build and Deployment → Root Directory:** `apps/website`, with **Include files outside the root directory in the Build Step** on. The site uses the workspace's `packages/spotcraft-client`, which `pnpm install` builds.
- **Build and Deployment → Framework Preset:** Next.js. Turn off any **Build Command**, **Output Directory** or **Install Command** overrides left from before the monorepo.
- **Node.js Version:** 26.x (also pinned in `apps/website/package.json`).
- **Environment variables** (Production and Preview):

  | Variable | Value |
  | --- | --- |
  | `SPOTCRAFT_URL` | `https://cms.vin.ski/vinski` |
  | `SPOTCRAFT_API_TOKEN` | Same as Spotcraft's |
  | `SPOTCRAFT_WEBHOOK_SECRET` | Spotcraft's `WEBHOOK_SECRET` |

- **Remove** the old Supabase variables (`NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_*`) and the Turnstile ones; nothing reads them now.
- **Domains:** `www.vin.ski` as the main domain, and `vin.ski` redirecting to it with a 301.

Deploy with **Deployments → Create Deployment** from `main`, or a push. Redeploying an old deployment can reuse its old settings. The build lists the pages from Spotcraft, so Spotcraft and its content have to be up first.

**Previews** show the full site, so they need Vercel's Deployment Protection: **Settings → Deployment Protection → Vercel Authentication**, on preview deployments. Until launch, production shows only the teaser.

## 6. After the first deploy

- [ ] Edit and save a document in Spotcraft, then reload its page on the site: the webhook should have updated it within seconds. Failed deliveries show in the Spotcraft project's logs on Vercel.
- [ ] Delete the hosted Supabase project and the `api.vin.ski` DNS record.
- [ ] Turn on Web Analytics and Speed Insights for the website project.

## Hold releases until CI passes

GitHub Actions ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs two checks on every push to `dev` and `main`, and on pull requests:

- **`dashboard`:** Spotcraft's typecheck and unit tests.
- **`website`:** the site's lint and production build, against a throwaway Spotcraft with sample content ([`.github/ci`](.github/ci/README.md)).

Vercel can wait for them. It still builds every push to `main`, but only puts it live once the checks pass; if one fails, the live site stays on the last good version. In each Vercel project: **Settings → Build and Deployment → Deployment Checks → Add Checks → GitHub**, then select:

| Project | Checks |
| --- | --- |
| Spotcraft | `dashboard` and `website` (the site's build runs against Spotcraft) |
| Website | `website` |

Production's automatic domain assignment must stay on (**Settings → Environments → Production**). To release without waiting, use **Force Promote** on the deployment. Renaming a job in `ci.yml` means selecting it again here.

## Updating later

- **Spotcraft:** after copying a new version from Spotcraft's `main` (see [Updating Spotcraft](README.md#updating-spotcraft)), run `pnpm db:migrate` with the production env loaded **before** the deploy goes out: new code expects the new schema.
- **Both projects build on every push** unless told otherwise. In each project, **Build and Deployment → Root Directory → Skip deployments when there are no changes to the root directory or its dependencies** keeps a site-only change from redeploying Spotcraft, and the other way round.
- **Content changes** need no deploy: the webhook refreshes the site.

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| Site build: `NEXT_NO_VERSION`, "No Next.js version detected" | The website project's Root Directory isn't `apps/website` |
| Site build fails fetching from Spotcraft | Spotcraft is down or `SPOTCRAFT_URL` is wrong. Deploy Spotcraft first |
| Site build fails with a 500, or Spotcraft's API says "There's no such site here" | The `vinski` site doesn't exist yet, or has no content. Onboard and import first |
| The import's dry run finds "0 new documents" | The export ran with the production env loaded and copied the empty site. Export again in a new terminal |
| Every sign-in fails with "Failed to decrypt private key" | `BETTER_AUTH_SECRET` changed. Put the old one back |
| Signing in lands on Spotcraft's dashboard, not the site | The `vinski` site's URL in Spotcraft isn't `https://www.vin.ski`, so the redirect back isn't allowed. Fix it in Spotcraft's site settings |
| Signed in on Spotcraft but not on the site | `AUTH_COOKIE_DOMAIN` isn't `vin.ski`, or the site isn't on a `vin.ski` subdomain |
| Edits don't show on the site | The webhook: `WEBHOOK_URL`, and `WEBHOOK_SECRET` matching the site's `SPOTCRAFT_WEBHOOK_SECRET`. Spotcraft's logs on Vercel show why |
| Images 404, while `curl -I` on the same URL gives 200 | Spotcraft knows the image but can't find the file: Vercel's `S3_ENDPOINT` or `S3_BUCKET` doesn't match the bucket the import used (check `.eu.`). Fix, then redeploy |
| Images fail with a 500 | The R2 token is wrong or lacks read access |
| Invites and resets never arrive | `SMTP_URL`, or `vin.ski` not verified in Resend |
| A production deployment is Ready but not live | A Deployment Check failed or is still running. See the run in GitHub's Actions tab; fix it, or Force Promote |
