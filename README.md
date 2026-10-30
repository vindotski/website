# Portfolio

Personal site of Ivan Vinski, live at [www.vin.ski](https://www.vin.ski). Built with [Next.js](https://nextjs.org) 16 (App Router, Cache Components), React 19 and TypeScript. The portfolio is styled with CSS Modules; the auth forms use shadcn/ui on Tailwind CSS. Login runs on Supabase Auth.

Until launch, visitors see a teaser at `/` and every other page answers 404. After logging in, you see the full site.

## Requirements

- Node.js
- pnpm 12 (the exact version is pinned in `package.json` under `packageManager`)
- Docker and the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started), for the local auth backend

## Getting started

```bash
pnpm install
cp .env.example .env.local   # already holds the local Supabase URL and key
supabase start               # local Supabase in Docker
pnpm dev
```

Then open [http://localhost:3000](http://localhost:3000). You'll see the teaser. To see the full site:

1. Create a user in Supabase Studio at [http://127.0.0.1:54323](http://127.0.0.1:54323) (Authentication → Add user, tick "Auto confirm").
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
supabase/             Local Supabase config
```

## Launch checklist

- [ ] Remove the signed-out branch from `lib/supabase/proxy.ts` and delete `app/teaser/`
- [ ] Add the real routes to `app/sitemap.ts`
- [ ] Serve `www.vin.ski`, with `vin.ski` redirecting (301) to it
- [ ] Submit the sitemap in Google Search Console and request indexing of `/`
