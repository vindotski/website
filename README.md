# Portfolio

Portfolio site of Ivan Vinski, product engineer: frontend by trade, full-stack by habit, product by focus. Live at [www.vin.ski](https://www.vin.ski).

Built with [Next.js](https://nextjs.org) 16 (App Router, Cache Components), React 19 and TypeScript. It's styled with Tailwind CSS v4 and shadcn/ui (Base UI primitives). Content and its search live in [Spotcraft](https://github.com/vindotski/spotcraft), a self-hosted CMS running next to it as `apps/dashboard`. Sign-in is a Spotcraft account too.

Until launch, visitors see a teaser at `/` and every other page answers 404. After logging in, you see the full site.

## Domains

| Domain        | What it is                                                                                |
| ------------- | ----------------------------------------------------------------------------------------- |
| `www.vin.ski` | The app, on Vercel. The canonical address (`siteUrl` in [`config/site.ts`](apps/website/config/site.ts))    |
| `vin.ski`     | Redirects (301) to `www.vin.ski`                                                          |
| `cms.vin.ski` | Spotcraft (planned): the dashboard, the content API and sign-in. `SPOTCRAFT_URL` is `https://cms.vin.ski/vinski` |

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

## How the teaser works

[`proxy.ts`](apps/website/proxy.ts) runs the auth gate in [`features/auth/utils/session.ts`](apps/website/features/auth/utils/session.ts) on every request. It checks Spotcraft's token, then:

- **Signed in:** the request goes through to the real page. A content URL with nothing published behind it shows the not-found page (see [Content](#content)).
- **Signed out:** `/` is rewritten to the teaser (200). Every other path, `/teaser` included, returns 404. `/auth/*` stays open so you can log in.
- **Always:** every response gets `Cache-Control: private, no-store`. The same URL serves different pages to different visitors, so no cache may keep one visitor's version for another, or for a crawler.

Robots, the sitemap, generated icons and Spotcraft's webhook (`/api/spotcraft`, which checks its own signature) skip the guard, so crawlers always get the real files. That also means anything served at those paths is public before launch: keep `app/sitemap.ts` to `/`, and don't add per-page OG images, RSS or `llms.txt` until the site opens.

## Admin toolbar

Signed in, every page gets a WordPress-style toolbar fixed above the header ([`admin-bar.tsx`](apps/website/app/_components/admin-bar.tsx)):

- **Admin menu:** Spotcraft, New post (Spotcraft's `posts` folder), Vercel Analytics and the GitHub repo.
- **Where you are:** Production, Preview or Local, from `VERCEL_ENV`.
- **On a project or post page:** its status (Draft, Scheduled or Published, with the date) and Edit, which opens the document in Spotcraft. Both come from [`/api/admin/content-status`](apps/website/app/api/admin/content-status/route.ts), signed-in only, through `useContentStatus` in `features/admin`.
- **Account:** your email and Log out. Log out loads `/` in full, so no page rendered for the session stays in the router cache.

Pages stay prerendered; the toolbar is added in the browser:

- **Room before the first paint.** A script in the root layout's `<head>` sets `data-signed-in` on `<html>` when the proxy's `signed-in=1` marker cookie exists ([`lib/signed-in-cookie.ts`](apps/website/lib/signed-in-cookie.ts)). CSS then sets `--admin-bar-height` (32px, 0 for guests), pads the body, and paints a placeholder strip, so nothing moves when the toolbar loads.
- **Offsets.** `--top-chrome` is the toolbar and header together. The sticky header sits below the toolbar, and the hero, jumped-to headings (`scroll-mt-chrome`) and sticky elements use `--top-chrome`, so use it for anything new that has to clear the top of the screen.
- **Guests download nothing.** [`admin-bar-loader.tsx`](apps/website/app/_components/admin-bar-loader.tsx) loads the toolbar with `next/dynamic` only when the cookie is there, and checks again after client navigations, such as the one after logging in.

## Styling

Tailwind CSS v4 and shadcn/ui, set up in [`app/globals.css`](apps/website/app/globals.css). There are no CSS Modules.

- **Look.** shadcn's semantic tokens (`bg-background`, `text-muted-foreground`, …) from the `base-nova` preset: neutral, Geist, square corners. The Hero, teaser and footer carry the `dark` class, so the same tokens turn light-on-dark inside them. Light theme only for now; the tokens make dark mode cheap to add.
- **Layout tokens.** `--content-width`, `--gutter` and `--header-height` live on `:root` (the section menu reads `--header-height` from JS) and are exposed as `max-w-content`, `px-gutter`, `h-header`, `top-header` and `scroll-mt-header`.
- **Breakpoints.** Tailwind's `sm` (640) and `md` (768), plus `wide` (900, written as `56.25rem`: a px breakpoint can't be sorted against Tailwind's rem ones). Two custom variants for the Hero and teaser: `split` (tablets, or a phone held sideways) and `short-landscape` (a sideways phone). Custom variants are emitted after breakpoints, so a value that both a breakpoint and a custom variant set has to use variants that never overlap.
- **Bodies** use the typography plugin (`prose`, in [`prose.tsx`](apps/website/components/layouts/prose.tsx)).
- **Buttons as links** use `buttonVariants()` on the link ([`button-link.tsx`](apps/website/components/button-link.tsx)): shadcn's `Button` always sets `role="button"`.
- **Animations** (`animate-nudge`, `animate-ticker`) and the `portrait-mask` utility are defined in `globals.css` and used with `motion-safe:`.

## Content

Projects and blog posts are documents in Spotcraft, edited in its dashboard. The site reads them with `@spotcraft/client` ([`lib/cms.ts`](apps/website/lib/cms.ts), server-only) and keeps its own routes and components.

- **Folders.** `posts/<slug>`, and `projects/work/<slug>` or `projects/play/<slug>`. The top folder is the type and the document's folder name is the slug. Each folder's `_config.json` in Spotcraft declares its fields; a document gets every config on its path, so work and play each keep their own required fields.
- **Types** are defined once, in `CONTENT_TYPES` in [`config/content-types.ts`](apps/website/config/content-types.ts): label, route, Zod schema and sort order. Nothing else should list them. Adding a type means a folder in Spotcraft, an entry there and a `[slug]` page.
- **Fields.** [`lib/content/api.ts`](apps/website/lib/content/api.ts) maps each document back into the shape [`lib/content/schemas.ts`](apps/website/lib/content/schemas.ts) describes: snake_case keys become camelCase, `category` comes from the folder, play's `stage` becomes `status` (Spotcraft reserves `status`), and the date comes from `publishedAt`. The schemas then validate it, so a bad field fails the build and names the document. Every type has `title`, `date`, `tags`, `tldr` and optional `order`, `repoUrl`, `demoUrl`; projects add `work` (a job: `company`, `role`, `years`, `impact`) or `play` (a side project: `year`, `status`) fields.
- **Publishing** follows `isPublished()` in [`lib/content/publish.ts`](apps/website/lib/content/publish.ts): a Spotcraft draft has no date, a future date is scheduled, today or earlier (UTC) is public. Spotcraft has no scheduling of its own, so the site applies this rule. `next dev` fetches drafts too (with the API token) and shows them with a badge; builds leave drafts and scheduled items out everywhere.
- **Caching.** Content is cached under the `spotcraft` tag. Publishing in Spotcraft sends a signed webhook to [`/api/spotcraft`](apps/website/app/api/spotcraft/route.ts), which drops that cache, so the next visit shows the change without a deploy. Webhooks for Spotcraft's other sites are ignored. The published filter is also cached hourly, so a scheduled item goes live within the hour of its date.
- **404s.** An unknown or unpublished slug shows the not-found page through `notFound()`. A page that isn't prebuilt starts streaming before that, so its status is 200 with `noindex`, not a real 404. Guests never see it: the gate gives them a 404 for everything but `/`.
- **Body.** Spotcraft returns it as a Markdown syntax tree, and [`body.tsx`](apps/website/components/detail/body.tsx) renders it: headings get Spotcraft's ids (`headingAnchors`, the same ones search links to), and an image alone in a paragraph renders in the 16:10 frame. The `##` headings are the table of contents.
- **Images** are uploaded next to their document in Spotcraft and served from `<SPOTCRAFT_URL>/media/…`, which `next.config.ts` allows. SVGs skip the image optimizer.
- **When nothing is published** for a type, `generateStaticParams` returns a `__none__` placeholder that 404s, because Cache Components fails the build on an empty list.
- **The client is vendored** in [`packages/spotcraft-client`](packages/spotcraft-client) (`workspace:*`), so the repo builds on its own, on Vercel too. `pnpm install` builds its `dist/` (its `prepare` script); `dist/` isn't committed.
- **Backups.** `pnpm cms:export` writes every document and image out as files; `spotcraft-content/` is gitignored.

## Search

Spotcraft searches the content: by words (Postgres full text), and by meaning too once `OPENAI_API_KEY` is set in `apps/dashboard/.env`. Saving a document re-indexes it; `pnpm search:sync` rebuilds the whole index.

- **API.** `GET /api/search?q=…` with optional `type` and `limit` (1–10, default 5). [`search.ts`](apps/website/features/search/api/search.ts) calls `cms.search`, keeps only results the site currently shows (Spotcraft would also return future-dated items), keeps one result per URL, and returns `{ results: [{ url, title, heading, type, snippet, score }] }`. URLs come from the type's route, so `/blog/<slug>#<heading-id>`; a match on the document itself links to the page. `score` is 0–1 and comparable within one search only. Until launch it answers 401 to guests; the proxy already hides it behind a 404.
- **Limit.** Spotcraft returns at most 10 results, and the future-dated ones are dropped after that, so while scheduled posts exist a search can come back short.
- **UI.** The search button in the header, or ⌘K / Ctrl+K, opens a command palette (shadcn `Dialog` with `Command`, filtering off since the server ranks). It searches 400 ms after typing stops, from 3 characters. Arrow keys pick a result and Enter opens it; Enter while a newer search is pending searches instead of opening a stale result. Results are real links, so ⌘-click opens a new tab. Results come from `useSearchResults` (TanStack Query): a newer query cancels the older request, and results are cached per query, case-insensitively, fresh for a minute.

## Analytics

[Vercel Web Analytics](https://vercel.com/docs/analytics) and Speed Insights, rendered by [`vercel-insights.tsx`](apps/website/app/_components/vercel-insights.tsx) in the root layout. It counts visitors without cookies, so there's no consent banner. It only reports from Vercel deployments, and needs Web Analytics enabled for the project in the Vercel dashboard.

- **Your own visits don't count.** [`vercel-insights.tsx`](apps/website/app/_components/vercel-insights.tsx) drops every page view, event and Speed Insights report while the `signed-in=1` marker exists (only people who work on vin.ski can sign in, so that's you) and on `/auth/*`. Before launch this keeps `/` meaning the teaser.
- **Events.** Mark an element with `trackAttributes({ event, …properties })` from [`lib/analytics/track.ts`](apps/website/lib/analytics/track.ts) (`ButtonLink` takes it as `track`); one listener in [`analytics-events.tsx`](apps/website/app/_components/analytics-events.tsx) sends it on click and adds `page` (`teaser`, `home`, `projects`, `blog`) and `path`. Plus allows 8 properties per event. No personal data goes into events.

  | Event | Properties | Fires on |
  | --- | --- | --- |
  | `contact_click` | `method` (`contact_open`, `contact_email`, `contact_call`), `location` (`header`, `sheet`, `hero`, `footer`, `teaser`) | Get in touch, Email me, Book a call |
  | `outbound_click` | `kind` (`linkedin`, `github`, `figma`, `product`, `demo`, `source`, `repo`), `location` (`hero`, `footer`, `teaser`, `intro`) | Social links; project and post links |
  | `section_view` | `section` (`projects`, `services`, `experience`, `process`, `blog`) | A home section seen: half of it visible, or filling half the screen. Once per page load |
  | `post_read` | `slug` | Reaching the end of a post. Once per page load |
  | `search` | `results` (count) | A completed search, once per distinct query. Never the query text |
  | `search_select` | `type` (`projects`, `blog`), `position` (1-based) | Opening a search result |

  Views are marked with `trackViewAttributes()` and sent by the same listener; search events are sent from [`search-dialog.tsx`](apps/website/features/search/components/search-dialog.tsx) with `track()`.
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

## Sign-in

Sign-in is a Spotcraft account (it was Supabase Auth until 2026-11-01).

- **Who:** a Spotcraft superadmin, or a member of the `vinski` site. Members of other sites in the same Spotcraft are treated as signed out.
- **Signing in:** `/auth/login` ([`route.ts`](apps/website/app/auth/login/route.ts)) redirects to Spotcraft's sign-in, which has Turnstile and a limit on attempts, and comes back to `/`.
- **Logging out:** the toolbar's Log out loads Spotcraft's logout, which ends the dashboard session too, then comes back to `/`.
- **Checking it:** Spotcraft sets `spotcraft_token`, an httpOnly ES256 token that lasts 10 minutes. The proxy ([`session.ts`](apps/website/features/auth/utils/session.ts)) checks it with `getSession` from `@spotcraft/client`, against Spotcraft's public keys (cached). That's no request to Spotcraft per page, except one renewal when the token has run out. Logging out or resetting your password ends the session within those 10 minutes.
- **Passing it on:** the proxy sets an `x-vinski-user` header for route handlers (`currentUser()` in [`current-user.ts`](apps/website/features/auth/utils/current-user.ts)). It replaces the header every time, so a browser can't fake it. It also sets the readable `signed-in=1` marker for the scripts that can't read the token. The toolbar gets your email from `/api/me`.

## Search engines

- **Only production is indexable.** `isProduction` in [`config/site.ts`](apps/website/config/site.ts) drives the robots meta tag in the root layout and the rules in [`app/robots.ts`](apps/website/app/robots.ts). Vercel previews and local builds return `noindex` and `Disallow: /`.
- **The teaser is indexable.** Nothing needs removing at launch, and Google doesn't have to rediscover the page.
- **No site-wide canonical or `og:url`.** Every page would inherit it and point Google at `/`.
- **`/auth/login` is only a redirect** to Spotcraft's sign-in, so there's no page for search engines to index.

## Architecture

The layout follows [bulletproof-react](https://github.com/alan2207/bulletproof-react): code flows one way, **shared → features → app**.

- **Shared** (`components/`, `config/`, `lib/`, `types/`) can be used anywhere, and imports neither features nor `app/`.
- **Features** (`features/<name>/`) hold everything one part of the site needs, in `api/`, `components/`, `types.ts`, `utils/` or `data.ts`. A feature uses shared code and itself, **never another feature**.
- **App** (`app/`) is routes plus the site chrome that composes features: the header uses search, and the footer uses profile.

When two features need the same thing, it moves into shared code, as the content loading in `lib/content/` did, or `app/` composes them, as the admin toolbar does with `features/admin` and `features/auth`. Files are imported directly; there are no `index.ts` barrels. File and folder names are kebab-case; components keep PascalCase names.

ESLint enforces all of it (`pnpm lint`):
- `import/no-restricted-paths` blocks cross-feature imports and imports that point the wrong way;
- `eslint-plugin-check-file` enforces kebab-case names, with Next's `(group)`, `[param]` and `_private` folders allowed in `app/`.

Adding a feature means adding its name to `features` in [`eslint.config.mjs`](apps/website/eslint.config.mjs).

### Data fetching

Content (projects, posts, profile) is read by server components and prerendered; it never goes through the browser. TanStack Query is only for what the browser asks for after the page loads, set up as in bulletproof-react:

- **Setup.** [`app/provider.tsx`](apps/website/app/provider.tsx) holds the `QueryClient`, with the devtools in development only. [`lib/react-query.ts`](apps/website/lib/react-query.ts) sets the defaults (no refetch on focus, no retries, fresh for a minute) and the `QueryConfig` helper type.
- **Requests.** [`lib/api-client.ts`](apps/website/lib/api-client.ts) calls the site's own routes and throws `ApiError` with the status, so a 401 can be told apart from a failure.
- **One file per request** in `features/<name>/api/`: the plain function, its query options (key and function), and a hook that takes `queryConfig`. For example [`get-search-results.ts`](apps/website/features/search/api/get-search-results.ts) (`useSearchResults`) and [`get-user.ts`](apps/website/features/auth/api/get-user.ts) (`useUser`). Server-only code can sit in the same folder, like [`search.ts`](apps/website/features/search/api/search.ts), marked with `server-only`.

## Project structure

A pnpm workspace. Each app lives in `apps/`: the site, and Spotcraft as `apps/dashboard`. Spotcraft's client is in `packages/spotcraft-client`. Both are copies of Spotcraft's `main` branch; see [Updating Spotcraft](#updating-spotcraft).

```
apps/dashboard/       Spotcraft: the CMS, its API and search (TanStack Start); see its own docs
packages/spotcraft-client/  @spotcraft/client, which the site reads content and sessions with
apps/website/         The portfolio site (Next.js); everything below is inside it
app/                  Routes and site chrome (the app layer)
  layout.tsx          Root layout: html, body, fonts, metadata, analytics
  provider.tsx        TanStack Query client, devtools in development
  _components/        admin-bar and its loader, analytics-events, vercel-insights
  (site)/             The portfolio, with header and footer (group omitted from URLs)
    _components/      header, footer, nav-links, mobile-nav
    page.tsx          Home (/): composes profile, projects and blog
    projects/ blog/ Detail pages ([slug])
  api/search/         Search route: session check and parameters, then features/search
  api/spotcraft/      Spotcraft's webhook: drops the content cache
  api/admin/          The admin toolbar's content status
  teaser/             Pre-launch page, shown at / to signed-out visitors
  auth/login/         Redirects to Spotcraft's sign-in
  api/me/             The signed-in user's email, for the toolbar
  robots.ts sitemap.ts
features/
  profile/            Hero, services, experience, process, contact actions; their copy and getters
  projects/           Projects section and project cards
  blog/               Blog section and a post's table of contents
  search/             Search dialog and the search itself, through Spotcraft
  admin/              The admin toolbar's content status query
  auth/               The session gate used by proxy.ts, currentUser, useUser and log out
components/
  ui/                 shadcn/ui components (add more with `pnpm dlx shadcn@latest add`, run in apps/website)
  layouts/            section, detail-page, prose
  detail/             Parts of a project or post page, including the body renderer
  button-link.tsx …   Small shared pieces: links, tags, badges, icons
config/
  site.ts             Site URL and production check
  content-types.ts    The content types: label, route, schema, sort order
lib/
  content/            Reading from Spotcraft, schemas, publish rule, getters
  cms.ts              The Spotcraft client (server-only)
  analytics/          Tracking attributes for Vercel Analytics
  signed-in-cookie.ts The before-paint check for the signed-in marker
  react-query.ts      Query defaults and helper types
  api-client.ts       Fetch for the site's own API routes
types/                Shared types
proxy.ts              Auth gate, from features/auth
```

## Updating Spotcraft

`apps/dashboard` and `packages/spotcraft-client` are copies of [Spotcraft](https://github.com/vindotski/spotcraft)'s `main` branch, at the commit in their `SPOTCRAFT_VERSION` files. Copy from `main` only, never from a checkout's working tree: work in progress lives on its `dev` branch.

```bash
rm -rf /tmp/spotcraft && mkdir /tmp/spotcraft
git -C ../spotcraft archive main apps/dashboard/src apps/dashboard/drizzle apps/dashboard/.env.example packages/client | tar -x -C /tmp/spotcraft
rsync -a /tmp/spotcraft/apps/dashboard/ apps/dashboard/
rsync -a --exclude '*.test.ts' /tmp/spotcraft/packages/client/src/ packages/spotcraft-client/src/
git -C ../spotcraft rev-parse --short main   # write it into both SPOTCRAFT_VERSION files
pnpm install                                 # rebuilds the client
pnpm db:migrate
```

- **Other files:** check `git diff` for files that were deleted upstream (rsync doesn't remove them) and for new dependencies in Spotcraft's `apps/dashboard/package.json` or `packages/client/package.json`. Copy those by hand: our copies differ in name and scripts.
- **Production:** run the migration there before deploying (see [`DEPLOY.md`](DEPLOY.md)).
- **The local database is shared** with the checkout (see [Getting started](#getting-started)), so a migration or `db:reset` on its `dev` branch reaches vin.ski's local data too. Restore with `cms:import` from a `cms:export` backup.

## Launch checklist

Infrastructure:

- [ ] Deploy Spotcraft to `cms.vin.ski` and the site to `www.vin.ski`, with Neon, Cloudflare R2 and Resend: follow [`DEPLOY.md`](DEPLOY.md), including its after-deploy checks

Going public:

- [ ] Remove the signed-out branch from `features/auth/utils/session.ts` and delete `app/teaser/`
- [ ] Work through [`CONTENT_TODO.md`](CONTENT_TODO.md) in Spotcraft, and check post dates
- [ ] Generate `app/sitemap.ts` from `CONTENT_TYPES` and the published items
- [ ] Open the search route to guests
- [ ] Add OG images, RSS and `llms.txt` if wanted
- [ ] Add a privacy page that names Vercel Web Analytics (cookieless, no personal data)
- [ ] Submit the sitemap in Google Search Console and request indexing of `/`
