# Portfolio

Portfolio site of Ivan Vinski, product engineer: frontend by trade, full-stack by habit, product by focus. Live at [www.vin.ski](https://www.vin.ski).

Built with [Next.js](https://nextjs.org) 16 (App Router, Cache Components), React 19 and TypeScript. It's styled with Tailwind CSS v4 and shadcn/ui (Base UI primitives). Content is MDX in the repo. Login runs on Supabase Auth, and semantic search over the content runs on Supabase pgvector.

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
| `pnpm db:types` | Regenerate `lib/supabase/database.types.ts` from the local database |
| `pnpm embed` | Sync the search index with `content/` (`--dry-run` to only list changes) |

## How the teaser works

[`proxy.ts`](proxy.ts) runs [`lib/supabase/proxy.ts`](lib/supabase/proxy.ts) on every request. It refreshes the Supabase session, then:

- **Signed in:** the request goes through to the real page, unless it's a content URL with no file behind it or one that isn't published yet. Those get a real 404 (see [Content](#content)).
- **Signed out:** `/` is rewritten to the teaser (200). Every other path, `/teaser` included, returns 404. `/auth/*` stays open so you can log in.
- **Always:** every response gets `Cache-Control: private, no-store`. The same URL serves different pages to different visitors, so no cache may keep one visitor's version for another, or for a crawler.

Robots, the sitemap and generated icons skip the guard, so crawlers always get the real files. That also means anything served at those paths is public before launch: keep `app/sitemap.ts` to `/`, and don't add per-page OG images, RSS or `llms.txt` until the site opens.

## Styling

Tailwind CSS v4 and shadcn/ui, set up in [`app/globals.css`](app/globals.css). There are no CSS Modules.

- **Look.** shadcn's semantic tokens (`bg-background`, `text-muted-foreground`, …) from the `base-nova` preset: neutral, Geist, square corners. The Hero, teaser and footer carry the `dark` class, so the same tokens turn light-on-dark inside them. Light theme only for now; the tokens make dark mode cheap to add.
- **Layout tokens.** `--content-width`, `--gutter` and `--header-height` live on `:root` (the section menu reads `--header-height` from JS) and are exposed as `max-w-content`, `px-gutter`, `h-header`, `top-header` and `scroll-mt-header`.
- **Breakpoints.** Tailwind's `sm` (640) and `md` (768), plus `wide` (900, written as `56.25rem`: a px breakpoint can't be sorted against Tailwind's rem ones). Two custom variants for the Hero and teaser: `split` (tablets, or a phone held sideways) and `short-landscape` (a sideways phone). Custom variants are emitted after breakpoints, so a value that both a breakpoint and a custom variant set has to use variants that never overlap.
- **MDX bodies** use the typography plugin (`prose`, in [`Prose.tsx`](app/(site)/_components/detail/Prose.tsx)).
- **Buttons as links** use `buttonVariants()` on the link ([`ButtonLink.tsx`](app/(site)/_components/ButtonLink.tsx)): shadcn's `Button` always sets `role="button"`.
- **Animations** (`animate-label-in`, `animate-nudge`, `animate-ticker`) and the `portrait-mask` utility are defined in `globals.css` and used with `motion-safe:`.

## Content

Work, Play and blog posts are MDX files in `content/<type>/<slug>.mdx`. The folder is the type and the file name is the slug.

- **Types** are defined once, in `CONTENT_TYPES` in [`lib/content-types.ts`](lib/content-types.ts): label, route, Zod schema and sort order. Nothing else should list them. Adding a type means a folder, an entry there and a `[slug]` page.
- **Front matter** is validated against the type's schema in [`lib/content/schemas.ts`](lib/content/schemas.ts). Every type has `title`, `date`, `tags`, `tldr` and optional `order`, `repoUrl`, `demoUrl`; Work and Play add their own fields. A bad field fails the build and names the file.
- **Publishing** follows `isPublished()` in [`lib/content/publish.ts`](lib/content/publish.ts): no `date` is a draft, a future `date` is scheduled, today or earlier (UTC) is public. `next dev` shows drafts and scheduled items with a badge; builds leave them out everywhere.
- **Scheduled items go live by themselves.** The published filter is cached hourly, so the item and its links appear within the hour of its date, without a redeploy. The very first request after that can still get a not-found page, until the page regenerates.
- **404s.** A page that isn't prebuilt can only answer 200 (Next.js streams it). So [`next.config.ts`](next.config.ts) inlines every file's slug and date as `CONTENT_PATHS`, and the proxy returns a real 404 for unknown or unpublished slugs ([`lib/content/paths.ts`](lib/content/paths.ts)). New files need a rebuild to be known, which a deploy does.
- **Body.** The `##` headings become the table of contents and the search chunks, with the same ids `rehype-slug` gives them ([`lib/content/sections.ts`](lib/content/sections.ts)). Images are plain markdown (`![alt](/images/…)`) and render in the 16:10 frame.
- **When nothing is published** for a type, `generateStaticParams` returns a `__none__` placeholder that 404s, because Cache Components fails the build on an empty list.

## Search

Supabase holds a search index derived from the MDX. It can be deleted and rebuilt from the repo at any time.

- **Table.** `documents` ([migration](supabase/migrations/20261030121450_create_documents_table.sql)) has one row per chunk: a summary chunk per item (`type/slug#tldr`) and one per `##` section (`type/slug#heading-id`, `:2`, `:3`… when a long section is split). It has an HNSW index on `vector(384)` with inner product.
- **Access.** Only the service role. RLS is on with no policies, `anon` and `authenticated` are revoked, and `match_documents()` is executable by `service_role` only. It returns only rows published by today. Grants are explicit because since 2026-10-30 hosted Supabase no longer grants new `public` tables to any API role by default.
- **Embeddings.** The [`embed`](supabase/functions/embed/index.ts) Edge Function runs gte-small (384 dimensions, normalized, English, input truncated at ~512 tokens). Callers send the secret key on the `apikey` header; `verify_jwt` is off for it in `config.toml` because the platform JWT check would reject a secret key. Locally: `supabase functions serve embed`. The first call takes ~10 s while the model loads.
- **Scores.** gte-small rates even unrelated text around 0.75–0.80, while good matches score 0.85–0.90. A minimum similarity cutoff belongs around 0.82, not 0.5.
- **Sync.** `pnpm embed` reads `content/`, skips drafts, and keeps scheduled items (`match_documents` hides them until their date). Each chunk's hash covers every stored field and the model name, so only new or changed chunks are embedded; rows for removed chunks, items or types are deleted afterwards. It refuses to run if it finds no content, so a broken path can't wipe the index. Sections are split at ~300 words to stay inside gte-small's 512 tokens.
- **API.** `GET /api/search?q=…` with optional `type` and `tag` (both repeatable; a result needs every tag and any one type) and `limit` (1–10, default 5). It embeds the query, calls `match_documents`, drops results below 0.82, keeps one result per page section, and returns `{ results: [{ url, title, heading, type, snippet, similarity }] }`. URLs come from the type's route, so `/blog/<slug>#<heading-id>`. Until launch it answers 401 to guests; the proxy already hides it behind a 404.
- **UI.** The search button in the header, or ⌘K / Ctrl+K, opens a command palette (shadcn `Dialog` with `Command`, filtering off since the server ranks). It searches 400 ms after typing stops, from 3 characters. Arrow keys pick a result and Enter opens it; Enter while a newer search is pending searches instead of opening a stale result. Results are real links, so ⌘-click opens a new tab. A newer query cancels the older request, and results are cached per query for the visit.
- **In CI.** The [Search sync](.github/workflows/search-sync.yml) workflow runs `pnpm embed` after each successful Vercel production deploy (`deployment_status`), on exactly the deployed commit, so search never links to a page that isn't live yet. It runs only while the repository variable `SEARCH_SYNC` is `on`; otherwise runs show as skipped. Run it by hand from the Actions tab for a full re-sync, e.g. after a Vercel Instant Rollback, which leaves the index on the newer commit until the next deploy.

Still to build:

- [x] Turn the Data API back on (`[api] enabled` in `config.toml`). supabase-js reaches `documents` and `match_documents` through it.
- [x] Server-only admin client, [`lib/supabase/admin.ts`](lib/supabase/admin.ts), with `SUPABASE_SECRET_KEY`
- [x] Sync script, [`scripts/embed.mts`](scripts/embed.mts): chunk, hash, embed what changed, upsert, delete stale rows
- [x] CI sync, [`.github/workflows/search-sync.yml`](.github/workflows/search-sync.yml)
- [x] Search route, [`app/api/search/route.ts`](app/api/search/route.ts)
- [x] Search UI, [`Search.tsx`](app/(site)/_components/Search.tsx)

## Supabase

- **Auth, the Data API and Edge Functions.** [`supabase/config.toml`](supabase/config.toml) turns off what the app doesn't use: Realtime, Storage, Analytics and the test inbox. Each has a comment on how to turn it back on. The Data API is on for search only; `anon` and `authenticated` have no grants on its table or function.
- **Sign-ups are off** (`enable_signup = false` under `[auth]`). Otherwise anyone with the public publishable key could create an account and get past the teaser. Leave `enable_signup` under `[auth.email]` set to `true`: setting it to `false` turns off email login entirely.
- **Hosted project.** Linked with `supabase login` and `supabase link --project-ref jfnmaofecvlajflzwwsv`. The CLI keeps the ref in `supabase/.temp/`, which is gitignored.
- **Production config.** `[remotes.production]` at the end of `config.toml` overrides only `site_url` (`https://www.vin.ski`) and `additional_redirect_urls` (both domains). Everything else is pushed from the local values. When an auth callback route or OAuth provider is added, put its production URL there too.
- **Pushing config.** Run `supabase config push` and read the diff before confirming. It changes the live project.
- **Migrations.** Locally, apply new ones with `supabase migration up --local`. Avoid `supabase db reset`: there is no seed, so it deletes your local user. In production, `supabase db push`. Then run `pnpm db:types`.
- **Edge Functions.** Deploy with `supabase functions deploy embed`.
- **Production env vars**, set in Vercel:
  - `NEXT_PUBLIC_SUPABASE_URL=https://api.vin.ski`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, the hosted project's publishable key

  Never use the secret key here: every `NEXT_PUBLIC_` variable is sent to the browser. Search will also need `SUPABASE_SECRET_KEY` (server-only, no prefix) in Vercel and in CI.

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
components/ui/        shadcn/ui components (add more with `pnpm dlx shadcn@latest add`), plus form.tsx
features/auth/        Login form
lib/
  data.ts api.ts      Site data (hero, services, experience…) and the functions that read all content
  site.ts             Site URL and production check
  content-types.ts    The content types: label, route, schema, sort order
  content/            Front matter schemas, loader, publish rule, MDX sections, 404 paths
  supabase/           Browser, server and proxy clients, generated database types
content/              work/ play/ posts/ (MDX, one file per item)
supabase/
  config.toml         Local stack, plus production overrides
  migrations/         Database schema
  functions/embed/    Embedding Edge Function (Deno)
```

## Launch checklist

Infrastructure:

- [ ] Serve `www.vin.ski`, with `vin.ski` redirecting (301) to it
- [ ] Activate the `api.vin.ski` custom domain in Supabase
- [ ] Set the production env vars in Vercel
- [ ] Run `supabase config push` (check the diff)
- [ ] Create your user in the hosted Supabase dashboard
- [ ] Run `supabase db push` and `supabase functions deploy embed`
- [ ] Set `SUPABASE_SECRET_KEY` in Vercel
- [ ] Add the GitHub repository secrets `NEXT_PUBLIC_SUPABASE_URL` (`https://api.vin.ski` once the custom domain is active, otherwise `https://<ref>.supabase.co`) and `SUPABASE_SECRET_KEY` (the hosted project's secret key named `default`, which the embed function checks against)
- [ ] Set the repository variable `SEARCH_SYNC` to `on`, run the Search sync workflow once by hand, and check that the next production deploy's run prints the `Production` environment

Going public:

- [ ] Remove the signed-out branch from `lib/supabase/proxy.ts` and delete `app/teaser/`
- [ ] Replace the placeholder `date`, `tags` and `tldr` on Work and Play (marked `# TODO`), and check post dates
- [ ] Generate `app/sitemap.ts` from `CONTENT_TYPES` and the published items
- [ ] Open the search route to guests
- [ ] Add OG images, RSS and `llms.txt` if wanted
- [ ] Submit the sitemap in Google Search Console and request indexing of `/`
