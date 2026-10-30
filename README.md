# Portfolio

Portfolio site of Ivan Vinski, product engineer: frontend by trade, full-stack by habit, product by focus. Live at [www.vin.ski](https://www.vin.ski).

Built with [Next.js](https://nextjs.org) 16 (App Router, Cache Components), React 19 and TypeScript. The portfolio is styled with CSS Modules; the auth forms use shadcn/ui on Tailwind CSS. Login runs on Supabase Auth.

Until launch, visitors see a teaser at `/` and every other page answers 404. After logging in, you see the full site.

## Domains

| Domain        | What it is                                                                                |
| ------------- | ----------------------------------------------------------------------------------------- |
| `www.vin.ski` | The app, on Vercel. The canonical address (`siteUrl` in [`lib/site.ts`](lib/site.ts))    |
| `vin.ski`     | Redirects (301) to `www.vin.ski`                                                          |
| `api.vin.ski` | Custom domain of the hosted Supabase project, and the app's production `NEXT_PUBLIC_SUPABASE_URL` |

`@supabase/ssr` names the auth cookie after the Supabase host: `sb-api-auth-token` in production, `sb-127-auth-token` locally. Changing the Supabase URL therefore logs everyone out once.

## Requirements

- Node.js
- pnpm 12 (the exact version is pinned in `package.json` under `packageManager`)
- Docker and the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started), for the local auth backend

## Getting started

```bash
pnpm install
cp .env.example .env.local   # already holds the local Supabase URL and key
supabase start               # local Supabase in Docker: database, Auth, gateway and Studio
pnpm dev
```

Then open [http://localhost:3000](http://localhost:3000). You'll see the teaser. To see the full site:

1. Create a user in Supabase Studio at [http://127.0.0.1:54323](http://127.0.0.1:54323) (Authentication → Add user, tick "Auto confirm"). Sign-ups are off, so this is the only way to get an account.
2. Log in at [http://localhost:3000/auth/login](http://localhost:3000/auth/login).

`supabase stop` shuts the local stack down. Its data stays in Docker volumes named `supabase_*_portfolio`.

## Scripts

| Command      | What it does                         |
| ------------ | ------------------------------------ |
| `pnpm dev`   | Start the development server         |
| `pnpm build` | Create a production build            |
| `pnpm start` | Serve the production build           |
| `pnpm lint`  | Run ESLint                           |

## How the teaser works

[`proxy.ts`](proxy.ts) runs [`lib/supabase/proxy.ts`](lib/supabase/proxy.ts) on every request. It refreshes the Supabase session, then:

- **Signed in:** the request goes through to the real page.
- **Signed out:** `/` is rewritten to the teaser (200). Every other path, `/teaser` included, returns 404. `/auth/*` stays open so you can log in.
- **Always:** every response gets `Cache-Control: private, no-store`. The same URL serves different pages to different visitors, so no cache may keep one visitor's version for another, or for a crawler.

Robots, the sitemap and generated icons skip the guard, so crawlers always get the real files.

## Supabase

- **Auth only.** The app uses nothing else, so [`supabase/config.toml`](supabase/config.toml) turns off the Data API, Realtime, Storage, Edge Functions, Analytics and the test inbox. Each has a comment on how to turn it back on.
- **Sign-ups are off** (`enable_signup = false` under `[auth]`). Otherwise anyone with the public publishable key could create an account and get past the teaser. Leave `enable_signup` under `[auth.email]` set to `true`: setting it to `false` turns off email login entirely.
- **Hosted project.** Linked with `supabase login` and `supabase link --project-ref jfnmaofecvlajflzwwsv`. The CLI keeps the ref in `supabase/.temp/`, which is gitignored.
- **Production config.** `[remotes.production]` at the end of `config.toml` overrides only `site_url` (`https://www.vin.ski`) and `additional_redirect_urls` (both domains). Everything else is pushed from the local values. When an auth callback route or OAuth provider is added, put its production URL there too.
- **Pushing config.** Run `supabase config push` and read the diff before confirming. It changes the live project.
- **Production env vars**, set in Vercel:
  - `NEXT_PUBLIC_SUPABASE_URL=https://api.vin.ski`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, the hosted project's publishable key

  Never use the secret key here: every `NEXT_PUBLIC_` variable is sent to the browser.

## Search engines

- **Only production is indexable.** `isProduction` in [`lib/site.ts`](lib/site.ts) drives the robots meta tag in the root layout and the rules in [`app/robots.ts`](app/robots.ts). Vercel previews and local builds return `noindex` and `Disallow: /`.
- **The teaser is indexable.** Nothing needs removing at launch, and Google doesn't have to rediscover the page.
- **No site-wide canonical or `og:url`.** Every page would inherit it and point Google at `/`.
- **Login is `noindex`,** but it isn't blocked in robots.txt, so crawlers can still read that tag.

## Project structure

```
app/
  layout.tsx          Root layout: html, body, fonts, site-wide metadata
  (site)/             The portfolio, with header and footer (group omitted from URLs)
    layout.tsx
    page.tsx          Home (/)
    work/ play/ blog/ Detail pages ([slug])
    _components/      Components used only by the portfolio
  teaser/             Pre-launch page, shown at / to signed-out visitors
  auth/login/         Login page, rendered bare and centred
  robots.ts
  sitemap.ts
components/ui/        shadcn/ui components, plus form.tsx (react-hook-form + zod)
features/auth/        Login form
lib/
  data.ts api.ts      Site content and the functions that read it
  site.ts             Site URL and production check
  supabase/           Browser, server and proxy clients
content/posts/        Blog posts (MDX)
supabase/             Supabase config: local stack, plus production overrides
```

## Launch checklist

Infrastructure:

- [ ] Serve `www.vin.ski`, with `vin.ski` redirecting (301) to it
- [ ] Activate the `api.vin.ski` custom domain in Supabase
- [ ] Set the production env vars in Vercel
- [ ] Run `supabase config push` (check the diff)
- [ ] Create your user in the hosted Supabase dashboard

Going public:

- [ ] Remove the signed-out branch from `lib/supabase/proxy.ts` and delete `app/teaser/`
- [ ] Add the real routes to `app/sitemap.ts`
- [ ] Submit the sitemap in Google Search Console and request indexing of `/`
