# Deploying to Vercel

One Vercel project, `portfolio`, builds the site from `apps/website` and serves it at `www.vin.ski`. The content comes from Spotcraft's API at api.vin.ski, which is deployed from Spotcraft's own repository, not this one. Its reads are open, so the site needs no secrets.

## The project

In the project's settings:

- **Build and Deployment → Root Directory:** `apps/website`, with **Include files outside the root directory in the Build Step** on, since the lockfile and pnpm settings are at the repository root.
- **Build and Deployment → Framework Preset:** Next.js, with no **Build Command**, **Output Directory** or **Install Command** overrides. Vercel installs with the pnpm version in the root `packageManager`.
- **Build and Deployment → Ignored Build Step:** "Only build production", so pushes to `dev` and pull requests don't deploy. To get a preview, turn this off for a while.
- **Node.js Version:** 26.x (also pinned in `apps/website/package.json`).
- **Environment variables:** none are needed. `SPOTCRAFT_API_URL` defaults to `https://api.vin.ski`; set it only to read from another Spotcraft.
- **Domains:** `www.vin.ski` as the main domain, and `vin.ski` redirecting to it (Vercel answers with a permanent 308).
- **Deployment Protection → Vercel Authentication,** on preview deployments. Previews show the full site, and until launch only the teaser is public.
- **Analytics** and **Speed Insights:** turned on, so the site's reports have somewhere to go.

Deploy with a push to `main`, or **Deployments → Create Deployment** from `main`. Redeploying an old deployment can reuse its old settings.

## Content

Content changes need no deploy. Pages are prerendered from api.vin.ski at build time, then read again at most every 5 minutes (the `content` cache profile, decision 12), so a published edit shows within 5 minutes. Importing is in the [README](README.md#content).

The build reads every page from api.vin.ski, so it fails while the API is down. A deployment that's already live keeps serving its cached pages for up to a week without the API.

## Hold releases until CI passes

GitHub Actions ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs one job, `website`, on every push to `dev` and `main`, and on pull requests: `content:check`, `docs:check`, lint and the production build. The two checks run Spotcraft's CLI from its `main` branch, which CI checks out with `SPOTCRAFT_READ_TOKEN`:

- **The secret:** a fine-grained GitHub token with read-only **Contents** access to `vindotski/spotcraft` only, saved in this repository's **Settings → Secrets and variables → Actions**.
- **When it expires,** the checkout fails and CI goes red until it's renewed.
- **Pull requests from forks** get no secrets, so they skip the two checks and run lint and the build.

Vercel can wait for the job. It still builds every push to `main`, but only puts it live once `website` passes; if it fails, the live site stays on the last good version. Set it in **Settings → Build and Deployment → Deployment Checks → Add Checks → GitHub**, selecting `website`.

Production's automatic domain assignment must stay on (**Settings → Environments → Production**). To release without waiting, use **Force Promote** on the deployment. Renaming the job in `ci.yml` means selecting it again here.

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| Build: `NEXT_NO_VERSION`, "No Next.js version detected" | The Root Directory isn't `apps/website` |
| Build fails fetching from Spotcraft, or "Invalid fields in Spotcraft document" | api.vin.ski is down, or a document doesn't match the site's schemas. The error names the document; fix it in `content/`, then check and import |
| An edit doesn't show after 5 minutes | It isn't imported, or isn't published: no `date`, or a date after today (UTC) |
| A production deployment is Ready but not live | The Deployment Check failed or is still running. See the run in GitHub's Actions tab; fix it, or Force Promote |
| CI fails at "Checkout vindotski/spotcraft" | `SPOTCRAFT_READ_TOKEN` is missing, expired, or can't read `vindotski/spotcraft` |
