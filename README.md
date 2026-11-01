# Portfolio

Portfolio site of Ivan Vinski, product engineer: frontend by trade, full-stack by habit, product by focus. Live at [www.vin.ski](https://www.vin.ski).

Built with [Next.js](https://nextjs.org) 16 (App Router, Cache Components), React 19 and TypeScript. It's styled with Tailwind CSS v4 and shadcn/ui (Base UI primitives). Content is MDX in the repo. Login runs on Supabase Auth, and semantic search over the content runs on Supabase pgvector.

Until launch, visitors see a teaser at `/` and every other page answers 404. After logging in, you see the full site.

## Domains

| Domain        | What it is                                                                                |
| ------------- | ----------------------------------------------------------------------------------------- |
| `www.vin.ski` | The app, on Vercel. The canonical address (`siteUrl` in [`config/site.ts`](apps/website/config/site.ts))    |
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
cp apps/website/.env.example apps/website/.env.local   # already holds the local Supabase URL and key
supabase start               # local Supabase in Docker: database, Auth, gateway and Studio
pnpm dev
```

Then open [http://localhost:3001](http://localhost:3001). You'll see the teaser. To see the full site:

1. Create a user in Supabase Studio at [http://127.0.0.1:54323](http://127.0.0.1:54323) (Authentication → Add user, tick "Auto confirm"). Sign-ups are off, so this is the only way to get an account.
2. Log in at [http://localhost:3001/auth/login](http://localhost:3001/auth/login).

`supabase stop` shuts the local stack down. Its data stays in Docker volumes named `supabase_*_portfolio`.

## Scripts

Run from the repository root. Each one runs in `apps/website`, except `db:types`.

| Command      | What it does                         |
| ------------ | ------------------------------------ |
| `pnpm dev`   | Start the development server         |
| `pnpm build` | Create a production build            |
| `pnpm start` | Serve the production build           |
| `pnpm lint`  | Run ESLint                           |
| `pnpm db:types` | Regenerate `apps/website/lib/supabase/database.types.ts` from the local database |
| `pnpm embed` | Sync the search index with `content/` (`--dry-run` to only list changes) |

## How the teaser works

[`proxy.ts`](apps/website/proxy.ts) runs the auth gate in [`features/auth/utils/session.ts`](apps/website/features/auth/utils/session.ts) on every request. It refreshes the Supabase session, then:

- **Signed in:** the request goes through to the real page, unless it's a content URL with no file behind it or one that isn't published yet. Those get a real 404 (see [Content](#content)).
- **Signed out:** `/` is rewritten to the teaser (200). Every other path, `/teaser` included, returns 404. `/auth/*` stays open so you can log in.
- **Always:** every response gets `Cache-Control: private, no-store`. The same URL serves different pages to different visitors, so no cache may keep one visitor's version for another, or for a crawler.

Robots, the sitemap and generated icons skip the guard, so crawlers always get the real files. That also means anything served at those paths is public before launch: keep `app/sitemap.ts` to `/`, and don't add per-page OG images, RSS or `llms.txt` until the site opens.

## Admin toolbar

Signed in, every page gets a WordPress-style toolbar fixed above the header ([`admin-bar.tsx`](apps/website/app/_components/admin-bar.tsx)):

- **Admin menu:** Vercel Analytics, the Supabase dashboard (Studio locally), the GitHub repo, and New post (GitHub's new-file page in `content/posts`).
- **Where you are:** Production, Preview or Local, from `VERCEL_ENV`.
- **On a project or post page:** its status (Draft, Scheduled or Published, with the date) and Edit, which opens the MDX file in GitHub's editor on `main`.
- **Account:** your email and Log out. Log out loads `/` in full, so no page rendered for the session stays in the router cache.

Pages stay prerendered; the toolbar is added in the browser:

- **Room before the first paint.** A script in the root layout's `<head>` sets `data-signed-in` on `<html>` when the Supabase session cookie exists. CSS then sets `--admin-bar-height` (32px, 0 for guests), pads the body, and paints a placeholder strip, so nothing moves when the toolbar loads.
- **Offsets.** `--top-chrome` is the toolbar and header together. The sticky header sits below the toolbar, and the hero, jumped-to headings (`scroll-mt-chrome`) and sticky elements use `--top-chrome`, so use it for anything new that has to clear the top of the screen.
- **Guests download nothing.** [`admin-bar-loader.tsx`](apps/website/app/_components/admin-bar-loader.tsx) loads the toolbar with `next/dynamic` only when the cookie is there, and checks again after client navigations, such as the one after logging in.

## Styling

Tailwind CSS v4 and shadcn/ui, set up in [`app/globals.css`](apps/website/app/globals.css). There are no CSS Modules.

- **Look.** shadcn's semantic tokens (`bg-background`, `text-muted-foreground`, …) from the `base-nova` preset: neutral, Geist, square corners. The Hero, teaser and footer carry the `dark` class, so the same tokens turn light-on-dark inside them. Light theme only for now; the tokens make dark mode cheap to add.
- **Layout tokens.** `--content-width`, `--gutter` and `--header-height` live on `:root` (the section menu reads `--header-height` from JS) and are exposed as `max-w-content`, `px-gutter`, `h-header`, `top-header` and `scroll-mt-header`.
- **Breakpoints.** Tailwind's `sm` (640) and `md` (768), plus `wide` (900, written as `56.25rem`: a px breakpoint can't be sorted against Tailwind's rem ones). Two custom variants for the Hero and teaser: `split` (tablets, or a phone held sideways) and `short-landscape` (a sideways phone). Custom variants are emitted after breakpoints, so a value that both a breakpoint and a custom variant set has to use variants that never overlap.
- **MDX bodies** use the typography plugin (`prose`, in [`Prose.tsx`](apps/website/app/(site)/_components/detail/Prose.tsx)).
- **Buttons as links** use `buttonVariants()` on the link ([`ButtonLink.tsx`](apps/website/app/(site)/_components/ButtonLink.tsx)): shadcn's `Button` always sets `role="button"`.
- **Animations** (`animate-nudge`, `animate-ticker`) and the `portrait-mask` utility are defined in `globals.css` and used with `motion-safe:`.

## Content

Projects and blog posts are MDX files in `content/<type>/<slug>.mdx`. The folder is the type and the file name is the slug.

- **Types** are defined once, in `CONTENT_TYPES` in [`config/content-types.ts`](apps/website/config/content-types.ts): label, route, Zod schema and sort order. Nothing else should list them. Adding a type means a folder, an entry there and a `[slug]` page.
- **Front matter** is validated against the type's schema in [`lib/content/schemas.ts`](apps/website/lib/content/schemas.ts). Every type has `title`, `date`, `tags`, `tldr` and optional `order`, `repoUrl`, `demoUrl`; projects add a `category`, `work` (a job: `company`, `role`, `years`, `impact`) or `play` (a side project: `year`, `status`), and each category checks its own fields. A bad field fails the build and names the file.
- **Publishing** follows `isPublished()` in [`lib/content/publish.ts`](apps/website/lib/content/publish.ts): no `date` is a draft, a future `date` is scheduled, today or earlier (UTC) is public. `next dev` shows drafts and scheduled items with a badge; builds leave them out everywhere.
- **Scheduled items go live by themselves.** The published filter is cached hourly, so the item and its links appear within the hour of its date, without a redeploy. The very first request after that can still get a not-found page, until the page regenerates.
- **404s.** A page that isn't prebuilt can only answer 200 (Next.js streams it). So [`next.config.ts`](apps/website/next.config.ts) inlines every file's slug and date as `CONTENT_PATHS`, and the proxy returns a real 404 for unknown or unpublished slugs ([`lib/content/paths.ts`](apps/website/lib/content/paths.ts)). New files need a rebuild to be known, which a deploy does.
- **Body.** The `##` headings become the table of contents and the search chunks, with the same ids `rehype-slug` gives them ([`lib/content/sections.ts`](apps/website/lib/content/sections.ts)). Images are plain markdown (`![alt](/images/…)`) and render in the 16:10 frame.
- **When nothing is published** for a type, `generateStaticParams` returns a `__none__` placeholder that 404s, because Cache Components fails the build on an empty list.

## Search

Supabase holds a search index derived from the MDX. It can be deleted and rebuilt from the repo at any time.

- **Table.** `documents` ([migration](supabase/migrations/20261030121450_create_documents_table.sql)) has one row per chunk: a summary chunk per item (`type/slug#tldr`) and one per `##` section (`type/slug#heading-id`, `:2`, `:3`… when a long section is split). It has an HNSW index on `vector(384)` with inner product.
- **Access.** Only the service role. RLS is on with no policies, `anon` and `authenticated` are revoked, and `match_documents()` is executable by `service_role` only. It returns only rows published by today. Grants are explicit because since 2026-10-30 hosted Supabase no longer grants new `public` tables to any API role by default.
- **Embeddings.** The [`embed`](supabase/functions/embed/index.ts) Edge Function runs gte-small (384 dimensions, normalized, English, input truncated at ~512 tokens). Callers send the secret key on the `apikey` header; `verify_jwt` is off for it in `config.toml` because the platform JWT check would reject a secret key. Locally: `supabase functions serve embed`. The first call takes ~10 s while the model loads.
- **Scores.** gte-small rates even unrelated text around 0.75–0.80, while good matches score 0.85–0.90. A minimum similarity cutoff belongs around 0.82, not 0.5.
- **Sync.** `pnpm embed` reads `content/`, skips drafts, and keeps scheduled items (`match_documents` hides them until their date). Each chunk's hash covers every stored field and the model name, so only new or changed chunks are embedded; rows for removed chunks, items or types are deleted afterwards. It refuses to run if it finds no content, so a broken path can't wipe the index. Sections are split at ~300 words to stay inside gte-small's 512 tokens.
- **API.** `GET /api/search?q=…` with optional `type` and `tag` (both repeatable; a result needs every tag and any one type) and `limit` (1–10, default 5). It embeds the query, calls `match_documents`, drops results below 0.82, keeps one result per page section, and returns `{ results: [{ url, title, heading, type, snippet, similarity }] }`. URLs come from the type's route, so `/blog/<slug>#<heading-id>`. Until launch it answers 401 to guests; the proxy already hides it behind a 404.
- **UI.** The search button in the header, or ⌘K / Ctrl+K, opens a command palette (shadcn `Dialog` with `Command`, filtering off since the server ranks). It searches 400 ms after typing stops, from 3 characters. Arrow keys pick a result and Enter opens it; Enter while a newer search is pending searches instead of opening a stale result. Results are real links, so ⌘-click opens a new tab. Results come from `useSearchResults` (TanStack Query): a newer query cancels the older request, and results are cached per query, case-insensitively, until five minutes after they were last shown.
- **No CI sync yet.** The GitHub workflow was removed while the repo moves to a monorepo. Until it's back, run `pnpm embed` by hand after a production deploy, with the hosted project's `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SECRET_KEY`.

Still to build:

- [x] Turn the Data API back on (`[api] enabled` in `config.toml`). supabase-js reaches `documents` and `match_documents` through it.
- [x] Server-only admin client, [`lib/supabase/admin.ts`](apps/website/lib/supabase/admin.ts), with `SUPABASE_SECRET_KEY`
- [x] Sync script, [`scripts/embed.mts`](apps/website/scripts/embed.mts): chunk, hash, embed what changed, upsert, delete stale rows
- [ ] CI sync: bring back a workflow that runs `pnpm embed` after each production deploy (removed during the monorepo move)
- [x] Search route, [`app/api/search/route.ts`](apps/website/app/api/search/route.ts)
- [x] Search UI, [`search-dialog.tsx`](apps/website/features/search/components/search-dialog.tsx)

## Analytics

[Vercel Web Analytics](https://vercel.com/docs/analytics) and Speed Insights, rendered by [`vercel-insights.tsx`](apps/website/app/_components/vercel-insights.tsx) in the root layout. It counts visitors without cookies, so there's no consent banner. It only reports from Vercel deployments, and needs Web Analytics enabled for the project in the Vercel dashboard.

- **Your own visits don't count.** [`vercel-insights.tsx`](apps/website/app/_components/vercel-insights.tsx) drops every page view, event and Speed Insights report while a Supabase session cookie exists (sign-ups are off, so that's you) and on `/auth/*`. Before launch this keeps `/` meaning the teaser.
- **Events.** Mark an element with `trackAttributes({ event, …properties })` from [`lib/analytics/track.ts`](apps/website/lib/analytics/track.ts) (`ButtonLink` takes it as `track`); one listener in [`analytics-events.tsx`](apps/website/app/_components/analytics-events.tsx) sends it on click and adds `page` (`teaser`, `home`, `projects`, `blog`) and `path`. Plus allows 8 properties per event. No personal data goes into events.

  | Event | Properties | Fires on |
  | --- | --- | --- |
  | `contact_click` | `method` (`contact_open`, `contact_email`, `contact_call`), `location` (`header`, `sheet`, `hero`, `footer`, `teaser`) | Get in touch, Email me, Book a call |
  | `outbound_click` | `kind` (`linkedin`, `github`, `figma`, `product`, `demo`, `source`, `repo`), `location` (`hero`, `footer`, `teaser`, `intro`) | Social links; project and post links |
  | `section_view` | `section` (`projects`, `services`, `experience`, `process`, `blog`) | A home section seen: half of it visible, or filling half the screen. Once per page load |
  | `post_read` | `slug` | Reaching the end of a post. Once per page load |
  | `search` | `results` (count) | A completed search, once per distinct query. Never the query text |
  | `search_select` | `type` (`projects`, `blog`), `position` (1-based) | Opening a search result |

  Views are marked with `trackViewAttributes()` and sent by the same listener; search events are sent from [`Search.tsx`](apps/website/app/(site)/_components/Search.tsx) with `track()`.
- **Speed Insights** reports Core Web Vitals from real visits. The data shows under **Speed Insights** in the project, after it's enabled there.
- **Checking it:** in production, the Network tab shows a request to `/_vercel/insights/view` on every page and `/_vercel/insights/event` on a contact click; the data shows under **Analytics** in the project.

### Analytics strategy

The site has one job: get the right people to get in touch. Analytics is there to show whether it does, and why or why not. It isn't there to grow traffic for its own sake.

**The questions, and where the answers are:**

| Question | Answered by |
| --- | --- |
| Who comes, and from where? | Visitors, referrers, countries and devices; UTM source and medium (see below) |
| What do they look at? | Page views per route (projects, blog); `section_view`, `post_read` and `search` |
| Do they get in touch, and from where on the site? | `contact_click` split by `method`, `location` and `page` |
| Where do they go instead? | `outbound_click` split by `kind`: LinkedIn and GitHub (checking me out) vs product and demo links (checking the work out) |
| Is it fast for them? | Speed Insights (Core Web Vitals from real visits) |

**The number that matters most is the contact rate:** visitors with at least one `contact_click`, divided by all visitors, per month. Everything else explains it:
- **Which source** brings people who get in touch: UTM and referrers.
- **Which projects** they read first: page views and `section_view`.
- **Which button** they use: `location` and `method`.

Before launch, the teaser is measured the same way: its page views and its e-mail, LinkedIn and GitHub clicks (`page: teaser`).

**Rules for adding to it:**
- **Track decisions, not activity.** Add an event only if its answer could change something on the site. Page views already cover "they opened it".
- **One small vocabulary.** Events are `noun_verb` in snake_case (`contact_click`). Properties are lowercase values from a fixed list, never free text. Use at most 8 properties per event (Plus); `page` and `path` are added automatically.
- **No personal data, ever.** No e-mail addresses, names, search queries or anything a visitor typed. Vercel counts visitors without cookies, which is why there's no consent banner. Keep it that way.
- **Own visits stay out.** Test as a guest, or check the debug log in `pnpm dev`, where nothing is sent.
- **Update the event table above** in the same commit that adds or changes an event.

**UTM links.** Use these instead of the bare address whenever sharing the site. Web Analytics Plus breaks visits down by them. The convention:
- `utm_source` is where the link lives;
- `utm_medium` is what kind of place that is;
- `utm_campaign` is optional, for one specific post or application;
- all lowercase, no spaces.

| Where | Link |
| --- | --- |
| LinkedIn profile (website field) | `https://www.vin.ski/?utm_source=linkedin&utm_medium=profile` |
| LinkedIn post | `https://www.vin.ski/?utm_source=linkedin&utm_medium=social&utm_campaign=<post-slug>` |
| CV (PDF) | `https://www.vin.ski/?utm_source=cv&utm_medium=pdf` |
| GitHub profile | `https://www.vin.ski/?utm_source=github&utm_medium=profile` |
| E-mail signature | `https://www.vin.ski/?utm_source=email&utm_medium=signature` |
| Job application | `https://www.vin.ski/?utm_source=<company>&utm_medium=application` |

The teaser keeps the tags: the proxy rewrites on the server, so the address in the browser, and with it the page view, still carries them.

**Reviewing it:** once a month, in **Analytics** for the project:
1. Check the contact rate.
2. Split `contact_click` by `location` and `page`.
3. Check which UTM sources and referrers led to contact.
4. Compare the most-viewed projects with the order on the home page.

Act on a pattern only once it holds for more than a month: traffic is small, so single weeks are noise.

## Supabase

- **Auth, the Data API and Edge Functions.** [`supabase/config.toml`](supabase/config.toml) turns off what the app doesn't use: Realtime, Storage, Analytics and the test inbox. Each has a comment on how to turn it back on. The Data API is on for search only; `anon` and `authenticated` have no grants on its table or function.
- **Bot protection on login.** Cloudflare Turnstile on the login form; Supabase Auth checks the token before the password (`[auth.captcha]` in `config.toml`, secret from `SUPABASE_AUTH_CAPTCHA_SECRET`). Locally, Cloudflare's always-pass test keys: `NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA` in `apps/website/.env.local` and `SUPABASE_AUTH_CAPTCHA_SECRET=1x0000000000000000000000000000000AA` in `supabase/.env` (gitignored), then restart the stack. Scripts that sign in through the Auth API need a `gotrue_meta_security.captcha_token`; any value passes with the test secret.
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

- **Only production is indexable.** `isProduction` in [`config/site.ts`](apps/website/config/site.ts) drives the robots meta tag in the root layout and the rules in [`app/robots.ts`](apps/website/app/robots.ts). Vercel previews and local builds return `noindex` and `Disallow: /`.
- **The teaser is indexable.** Nothing needs removing at launch, and Google doesn't have to rediscover the page.
- **No site-wide canonical or `og:url`.** Every page would inherit it and point Google at `/`.
- **Login is `noindex`,** but it isn't blocked in robots.txt, so crawlers can still read that tag.

## Architecture

The layout follows [bulletproof-react](https://github.com/alan2207/bulletproof-react): code flows one way, **shared → features → app**.

- **Shared** (`components/`, `config/`, `lib/`, `types/`) can be used anywhere, and imports neither features nor `app/`.
- **Features** (`features/<name>/`) hold everything one part of the site needs, in `api/`, `components/`, `types.ts`, `utils/` or `data.ts`. A feature uses shared code and itself, **never another feature**.
- **App** (`app/`) is routes plus the site chrome that composes features: the header uses search, and the footer uses profile.

When two features need the same thing, it moves into shared code, as the MDX content loading in `lib/content/` did, or `app/` passes it in, as the 404 check in `proxy.ts` does. Files are imported directly; there are no `index.ts` barrels. File and folder names are kebab-case; components keep PascalCase names.

ESLint enforces all of it (`pnpm lint`):
- `import/no-restricted-paths` blocks cross-feature imports and imports that point the wrong way;
- `eslint-plugin-check-file` enforces kebab-case names, with Next's `(group)`, `[param]` and `_private` folders allowed in `app/`.

Adding a feature means adding its name to `features` in [`eslint.config.mjs`](apps/website/eslint.config.mjs).

### Data fetching

Content (projects, posts, profile) is read by server components and prerendered; it never goes through the browser. TanStack Query is only for what the browser asks for after the page loads, set up as in bulletproof-react:

- **Setup.** [`app/provider.tsx`](apps/website/app/provider.tsx) holds the `QueryClient`, with the devtools in development only. [`lib/react-query.ts`](apps/website/lib/react-query.ts) sets the defaults (no refetch on focus, no retries, fresh for a minute) and the `QueryConfig` / `MutationConfig` helper types.
- **Requests.** [`lib/api-client.ts`](apps/website/lib/api-client.ts) calls the site's own routes and throws `ApiError` with the status, so a 401 can be told apart from a failure.
- **One file per request** in `features/<name>/api/`: the plain function, its query options (key and function), and a hook that takes `queryConfig` or `mutationConfig`. For example [`get-search-results.ts`](apps/website/features/search/api/get-search-results.ts) (`useSearchResults`) and [`login.ts`](apps/website/features/auth/api/login.ts) (`useLogin`). Server-only code can sit in the same folder, like [`search.ts`](apps/website/features/search/api/search.ts), marked with `server-only`.

## Project structure

A pnpm workspace. Each app lives in `apps/`; `supabase/` sits at the root because it's the backend every app shares. A Dashboard app comes next, and code the two apps share will move to `packages/` then.

```
apps/website/         The portfolio site (Next.js); everything below up to supabase/ is inside it
app/                  Routes and site chrome (the app layer)
  layout.tsx          Root layout: html, body, fonts, metadata, analytics
  provider.tsx        TanStack Query client, devtools in development
  _components/        admin-bar and its loader, analytics-events, vercel-insights
  (site)/             The portfolio, with header and footer (group omitted from URLs)
    _components/      header, footer, nav-links, mobile-nav
    page.tsx          Home (/): composes profile, projects and blog
    projects/ blog/ Detail pages ([slug])
  api/search/         Search route: session check and parameters, then features/search
  teaser/             Pre-launch page, shown at / to signed-out visitors
  auth/login/         Login page, rendered bare and centred
  robots.ts sitemap.ts
features/
  profile/            Hero, services, experience, process, contact actions; their copy and getters
  projects/           Projects section and project cards
  blog/               Blog section and a post's table of contents
  search/             Search dialog and the semantic search itself
  auth/               Login form, log out, their mutations, useUser, and the session gate used by proxy.ts
components/
  ui/                 shadcn/ui components (add more with `pnpm dlx shadcn@latest add`, run in apps/website)
  layouts/            section, detail-page, prose
  detail/             Parts of a project or post page
  button-link.tsx …   Small shared pieces: links, tags, badges, icons
config/
  site.ts             Site URL and production check
  content-types.ts    The content types: label, route, schema, sort order
lib/
  content/            MDX loading, schemas, publish rule, sections, 404 paths and page status, getters
  analytics/          Tracking attributes for Vercel Analytics
  supabase/           Browser, server and admin clients, the session cookie check, generated database types
  react-query.ts      Query defaults and helper types
  api-client.ts       Fetch for the site's own API routes
types/                Shared types
content/              projects/ posts/ (MDX, one file per item)
scripts/              embed.mts: syncs the search index
proxy.ts              Auth gate and content 404s, composed from features/auth and lib/content
supabase/             (repository root) Shared backend
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
- [ ] Enable Web Analytics and Speed Insights for the project in the Vercel dashboard
- [ ] Turnstile, in this order: add the site in Cloudflare (www.vin.ski, vin.ski; Managed); set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` in Vercel and deploy; **then** turn on CAPTCHA in Supabase (Authentication → Bot and Abuse Protection, Turnstile, the secret key). The other way round locks everyone out
- [ ] Once CI sync is back, add the GitHub repository secrets `NEXT_PUBLIC_SUPABASE_URL` (`https://api.vin.ski` once the custom domain is active, otherwise `https://<ref>.supabase.co`) and `SUPABASE_SECRET_KEY` (the hosted project's secret key named `default`, which the embed function checks against)

Going public:

- [ ] Remove the signed-out branch from `features/auth/utils/session.ts` and delete `app/teaser/`
- [ ] Replace the placeholder `date`, `tags` and `tldr` on projects (marked `# TODO`), and check post dates
- [ ] Generate `app/sitemap.ts` from `CONTENT_TYPES` and the published items
- [ ] Open the search route to guests
- [ ] Add OG images, RSS and `llms.txt` if wanted
- [ ] Add a privacy page that names Vercel Web Analytics (cookieless, no personal data)
- [ ] Submit the sitemap in Google Search Console and request indexing of `/`
