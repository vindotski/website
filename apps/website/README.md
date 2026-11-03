# Website

The portfolio site at [www.vin.ski](https://www.vin.ski): Next.js 16 (App Router, Cache Components), React 19 and TypeScript, styled with Tailwind CSS v4 and shadcn/ui (Base UI primitives). Content comes from Spotcraft, on [api.vin.ski](https://api.vin.ski).

This is how the site works inside. Setup, scripts and deploying are in the [repository README](../../README.md) and [`DEPLOY.md`](../../DEPLOY.md); run the commands from the repository root.

## How the teaser works

Until launch, [`proxy.ts`](proxy.ts) decides by environment, on every request:

- **Production** (`VERCEL_ENV=production`): `/` is rewritten to the teaser (200), and every other path, `/teaser` included, returns 404. Rewrites, not redirects, so every URL keeps an honest status.
- **Anywhere else** (local development, `pnpm start`, Vercel previews): the request goes through to the real page. A content URL with nothing published behind it shows the not-found page (see [Content](#content)). Previews sit behind Vercel's Deployment Protection, so only people with access see the full site (decision 13).

Robots, the sitemap and generated icons skip the proxy, so crawlers always get the real files. That also means anything served at those paths is public before launch: keep `app/sitemap.ts` to `/`, and don't add per-page OG images, RSS or `llms.txt` until the site opens.

**Offsets.** `--top-chrome` is the height fixed at the top of the screen (the sticky header). The hero, jumped-to headings (`scroll-mt-chrome`) and sticky elements use it, so use it for anything new that has to clear the top of the screen.

## Styling

Tailwind CSS v4 and shadcn/ui, set up in [`app/globals.css`](app/globals.css). There are no CSS Modules.

- **Look.** shadcn's semantic tokens (`bg-background`, `text-muted-foreground`, …) from the `base-nova` preset: neutral, Geist, square corners. The Hero, teaser and footer carry the `dark` class, so the same tokens turn light-on-dark inside them. Light theme only for now; the tokens make dark mode cheap to add.
- **Layout tokens.** `--content-width`, `--gutter` and `--header-height` live on `:root` (the section menu reads `--header-height` from JS) and are exposed as `max-w-content`, `px-gutter`, `h-header`, `top-header` and `scroll-mt-header`.
- **Breakpoints.** Tailwind's `sm` (640) and `md` (768), plus `wide` (900, written as `56.25rem`: a px breakpoint can't be sorted against Tailwind's rem ones). Two custom variants for the Hero and teaser: `split` (tablets, or a phone held sideways) and `short-landscape` (a sideways phone). Custom variants are emitted after breakpoints, so a value that both a breakpoint and a custom variant set has to use variants that never overlap.
- **Bodies** use the typography plugin (`prose`, in [`prose.tsx`](components/layouts/prose.tsx)).
- **Buttons as links** use `buttonVariants()` on the link ([`button-link.tsx`](components/button-link.tsx)): shadcn's `Button` always sets `role="button"`.
- **Animations** (`animate-nudge`, `animate-ticker`) and the `portrait-mask` utility are defined in `globals.css` and used with `motion-safe:`.

## Content

Projects and blog posts are Markdown in [`content/`](../../content) at the repository root, imported into the `vindotski` project on Spotcraft's API ([api.vin.ski](https://api.vin.ski)); the [repository README](../../README.md#content) has the scripts. The site reads them over HTTP with [`lib/content/spotcraft.ts`](lib/content/spotcraft.ts) (server-only), a small `fetch` client shaped like `@spotcraft/sdk`'s, and keeps its own routes and components (decision 12).

- **Folders.** `posts/<slug>`, and `projects/work/<slug>` or `projects/play/<slug>`. Each folder's `_schema.yaml` declares its fields; a document gets every schema on its path, so work and play each keep their own required fields.
- **Types** are defined once, in `CONTENT_TYPES` in [`config/content-types.ts`](config/content-types.ts): label, route, Spotcraft folders, Zod schema and sort order. Nothing else should list them. Adding a type means a folder in `content/`, an entry there and a `[slug]` page.
- **Fields.** [`lib/content/api.ts`](lib/content/api.ts) lists each folder and gets every document, then validates its front matter with [`lib/content/schemas.ts`](lib/content/schemas.ts) as it is: the keys in `content/` are the schemas' own, and `category` comes from the folder. A bad field fails the build and names the document. Every type has `title`, `date`, `tags`, `tldr` and optional `order`, `repoUrl`, `demoUrl`; projects add `work` (a job: `company`, `role`, `years`, `impact`, and optional `team`, `reach`, `results`) or `play` (a side project: `year`, `status`) fields. The Zod schemas and the `_schema.yaml` files describe the same fields, so change both.
- **Publishing** follows `isPublished()` in [`lib/content/publish.ts`](lib/content/publish.ts): no date is a draft, a future date is scheduled, today or earlier (UTC) is public. Spotcraft has no scheduling of its own, so the site applies this rule. `next dev` shows drafts and scheduled items with a badge; builds leave them out everywhere.
- **Caching.** Everything read from Spotcraft uses the `content` cache profile in [`next.config.ts`](next.config.ts): read again every 5 minutes, so a published edit or a scheduled item's date shows without a deploy, and kept for a week, so a quiet site still answers from its last good copy while api.vin.ski is down. There's no publish webhook yet.
- **404s.** An unknown or unpublished slug shows the not-found page through `notFound()`. A page that isn't prebuilt starts streaming before that, so its status is 200 with `noindex`, not a real 404. In production the proxy gives a 404 for everything but `/` anyway.
- **Body.** Spotcraft returns it as a Markdown syntax tree with its `headings` beside it. `getContent` gives the body's headings those ids, in the order Spotcraft lists them, so they match the table of contents (the `##` headings). [`body.tsx`](components/detail/body.tsx) renders it, and an image alone in a paragraph renders in the 16:10 frame.
- **Images** live in the site, in [`public/images/projects/`](public/images/projects), and the content refers to them by their path (`/images/projects/huddleos.svg`). Spotcraft stores only Markdown for now. SVGs skip the image optimizer.
- **When nothing is published** for a type, `generateStaticParams` returns a `__none__` placeholder that 404s, because Cache Components fails the build on an empty list.

## Search

None for now: it comes back with Spotcraft's own search (decision 14). The old search (a ⌘K dialog over the old Spotcraft's index, with TanStack Query) is in git history before `15f780b` (`refactor(website): remove search until spotcraft has it`).

## Analytics

[Vercel Web Analytics](https://vercel.com/docs/analytics) and Speed Insights, rendered by [`vercel-insights.tsx`](app/_components/vercel-insights.tsx) in the root layout. It counts visitors without cookies, so there's no consent banner. It only reports from Vercel deployments, and needs Web Analytics enabled for the project in the Vercel dashboard.

- **Before launch, production is the teaser alone,** so every page view on `/` is the teaser. Previews report too, under their own environment in the dashboard.
- **Events.** Mark an element with `trackAttributes({ event, …properties })` from [`lib/analytics/track.ts`](lib/analytics/track.ts) (`ButtonLink` takes it as `track`); one listener in [`analytics-events.tsx`](app/_components/analytics-events.tsx) sends it on click and adds `page` (`teaser`, `home`, `projects`, `blog`) and `path`. Plus allows 8 properties per event. No personal data goes into events.

  | Event | Properties | Fires on |
  | --- | --- | --- |
  | `contact_click` | `method` (`contact_open`, `contact_email`, `contact_call`), `location` (`header`, `sheet`, `hero`, `footer`, `teaser`) | Get in touch, Email me, Book a call |
  | `outbound_click` | `kind` (`linkedin`, `github`, `figma`, `product`, `demo`, `source`, `repo`), `location` (`hero`, `footer`, `teaser`, `intro`) | Social links; project and post links |
  | `section_view` | `section` (`projects`, `services`, `experience`, `process`, `blog`) | A home section seen: half of it visible, or filling half the screen. Once per page load |
  | `post_read` | `slug` | Reaching the end of a post. Once per page load |

  Views are marked with `trackViewAttributes()` and sent by the same listener.
- **Speed Insights** reports Core Web Vitals from real visits. The data shows under **Speed Insights** in the project, after it's enabled there.
- **Checking it:** in production, the Network tab shows a request to `/_vercel/insights/view` on every page and `/_vercel/insights/event` on a contact click; the data shows under **Analytics** in the project.

### Analytics strategy

The site has one job: get the right people to get in touch. Analytics is there to show whether it does, and why or why not. It isn't there to grow traffic for its own sake.

**The questions, and where the answers are:**

| Question | Answered by |
| --- | --- |
| Who comes, and from where? | Visitors, referrers, countries and devices; UTM source and medium (see below) |
| What do they look at? | Page views per route (projects, blog); `section_view` and `post_read` |
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

## Search engines

- **Only production is indexable.** `isProduction` in [`config/site.ts`](config/site.ts) drives the robots meta tag in the root layout and the rules in [`app/robots.ts`](app/robots.ts). Vercel previews and local builds return `noindex` and `Disallow: /`.
- **The teaser is indexable.** Nothing needs removing at launch, and Google doesn't have to rediscover the page.
- **No site-wide canonical or `og:url`.** Every page would inherit it and point Google at `/`.

## Architecture

The layout follows [bulletproof-react](https://github.com/alan2207/bulletproof-react): code flows one way, **shared → features → app**.

- **Shared** (`components/`, `config/`, `lib/`, `types/`) can be used anywhere, and imports neither features nor `app/`.
- **Features** (`features/<name>/`) hold everything one part of the site needs, in `api/`, `components/`, `types.ts`, `utils/` or `data.ts`. A feature uses shared code and itself, **never another feature**.
- **App** (`app/`) is routes plus the site chrome that composes features: the footer uses profile.

When two features need the same thing, it moves into shared code, as the content loading in `lib/content/` did, or `app/` composes them. Files are imported directly; there are no `index.ts` barrels. File and folder names are kebab-case; components keep PascalCase names.

ESLint enforces all of it (`pnpm lint`):
- `import/no-restricted-paths` blocks cross-feature imports and imports that point the wrong way;
- `eslint-plugin-check-file` enforces kebab-case names, with Next's `(group)`, `[param]` and `_private` folders allowed in `app/`.

Adding a feature means adding its name to `features` in [`eslint.config.mjs`](eslint.config.mjs).

### Data fetching

Content (projects, posts, profile) is read by server components and prerendered; it never goes through the browser. Nothing is fetched in the browser today. When something is again (search, with Spotcraft's), it uses TanStack Query, set up as in bulletproof-react, with one file per request in `features/<name>/api/` (decision 4). The search that used it is in git history.

## Folders

```
app/                  Routes and site chrome (the app layer)
  layout.tsx          Root layout: html, body, fonts, metadata, analytics
  _components/        analytics-events, vercel-insights
  (site)/             The portfolio, with header and footer (group omitted from URLs)
    _components/      header, footer, nav-links, mobile-nav
    page.tsx          Home (/): composes profile, projects and blog
    projects/ blog/ Detail pages ([slug])
  teaser/             Pre-launch page, shown at / in production
  robots.ts sitemap.ts
features/
  profile/            Hero, services, experience, process, contact actions; their copy and getters
  projects/           Projects section and project cards
  blog/               Blog section and a post's table of contents
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
  analytics/          Tracking attributes for Vercel Analytics
types/                Shared types
proxy.ts              The teaser in production, the full site anywhere else
```

## License

Copyright (c) 2026-present Ivan Vinski. All rights reserved: the code and all of vin.ski's content. See [`LICENSE`](LICENSE) for the details and the exceptions (shadcn/ui's components in `components/ui` are MIT), and [License & Trademarks](../../README.md#license--trademarks) for the whole repository. Sending a change? See [CONTRIBUTING.md](../../CONTRIBUTING.md) first.
