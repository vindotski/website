# Moving vin.ski onto Spotcraft

This guide moves vin.ski's content out of the repository and into Spotcraft, a self-hosted
headless CMS. The website keeps its design, routes and components; only where content comes from
changes.

**Today:**
- 10 MDX files in `apps/website/content/`: 3 posts and 7 projects.
- Cover and diagram SVGs in `public/images/`.
- Profile copy hard-coded in `features/profile/data.ts`.
- Search on a Supabase `documents` table, filled by `pnpm embed` through a gte-small Edge
  Function.

**After:**
- Spotcraft runs as `apps/dashboard`, next to `apps/website`, on its own Postgres.
- Content is edited in the Spotcraft dashboard.
- The website reads it with `@spotcraft/client`, rebuilds its cache when a webhook arrives, and
  searches with Spotcraft's `/api/search`.
- The MDX pipeline, the `documents` table, the Edge Function and the embed script are deleted.

Do the steps in order. Each one ends with the site still working, so you can stop between them.

---

## 0. Before you start

- **Spotcraft isn't on npm yet.** There is no `v0.1.0` tag, `@spotcraft/client` isn't published,
  and `pnpm create spotcraft` can't download anything. Until they are:
  - Install from the local checkout at `../spotcraft` (step 1).
  - Link `@spotcraft/client` from it (step 4).
  - **Publish both before deploying (step 8):** a `link:` dependency doesn't resolve on Vercel.
- **What you need:** Node 26, pnpm 12, and Docker (Spotcraft's local Postgres, Mailpit and S3).
- **Ports:** Spotcraft's dashboard uses **3000**, which is also `next dev`'s default. Move the
  website to **3001**: in `apps/website/package.json`, set `"dev": "next dev --port 3001"`.
- **YAML comments are dropped.** Spotcraft keeps no comments in front matter, so the `# TODO` notes
  in the project files won't survive the import. Copy them somewhere first (an issue, or the
  document body).

## 1. Add Spotcraft to the monorepo

From the Spotcraft checkout:

```bash
cd ../spotcraft
pnpm create:local ../vindotski/apps/dashboard --name dashboard --no-example
```

This copies the app into `apps/dashboard` and writes its `.env`:
- a new `BETTER_AUTH_SECRET`;
- `SPOTCRAFT_API_TOKEN`;
- the local `DATABASE_URL`.

It doesn't touch your other files. It prints what to add, mainly the builds pnpm must allow in the
root `pnpm-workspace.yaml`:

```yaml
packages:
  - apps/*

allowBuilds:
  esbuild: true
  lightningcss: true
  koffi: false
```

Then start it:

```bash
cd ../vindotski
pnpm install
pnpm --filter dashboard db:start      # Postgres (with pgvector), Mailpit and S3, in Docker
pnpm --filter dashboard db:migrate
pnpm --filter dashboard dev           # http://localhost:3000
```

Open `http://localhost:3000`. It sends you to `/onboard`: create your superadmin account (invite
emails go to Mailpit at `http://localhost:8025`). **Don't create the site in the dashboard.** The
import in step 3 creates it from `site.yaml`.

Root scripts worth adding to `vindotski/package.json`:

```json
"dashboard": "pnpm --filter dashboard dev",
"cms:import": "pnpm --filter dashboard content:import",
"cms:export": "pnpm --filter dashboard content:export"
```

## 2. The content model

Spotcraft content is folders of documents. Each folder's `_config.json` lists typed fields:
- `text` (optional `multiline`), `markdown`, `number`, `boolean`, `date`, `url`;
- `select`, `list` (of one item type), `object` (named sub-fields), and `image`.

A document's fields are every config on its path, from the root down.

**Built in, never declared as fields:** `id`, `title`, `status` (`published` or `draft`),
`published_at` and `tags`.

The mapping from today's zod schemas (`lib/content/schemas.ts`):

| vin.ski | Spotcraft |
|---|---|
| `title` | `title` (built in) |
| `date` (absent = draft) | `status` + `published_at`: `published` with `published_at: "<date>T00:00:00.000Z"`, or `draft` |
| `tags` | `tags` (built in) |
| `tldr`, `order`, `repoUrl`, `demoUrl` | fields on `posts/` and `projects/` |
| `category: work \| play` | **the folder**: `projects/work/<slug>` or `projects/play/<slug>` |
| `years: { start, end? }` | an `object` field with two `number` sub-fields |
| `stack: string[]` | a `list` of `text` |
| `image: { src, alt }` | an `image` field; the SVG moves next to the document |
| `kind`, `status` (play) | `select` fields. **`status` is reserved**, so the play `status` becomes `stage` |

**Why two project folders:** `work/` and `play/` each get their own config, so each keeps its own
required fields, as the zod union does today. `cms.list({ folder: "projects", deep: true })`
returns both. Slugs stay unique across the two, so `/projects/:slug` keeps working.

**Note:** Spotcraft has no scheduling. A document with `status: published` and a future
`published_at` is public in the API. Keep vin.ski's rule (`publishedAt <= now`) in the website,
which already hides future dates (see step 4).

### The configs

`posts/_config.json`:

```json
{
  "fields": [
    { "key": "tldr", "label": "TL;DR", "type": "text", "multiline": true, "required": true },
    { "key": "repo_url", "label": "Repository", "type": "url" },
    { "key": "demo_url", "label": "Demo", "type": "url" }
  ]
}
```

`projects/_config.json` (shared by work and play):

```json
{
  "fields": [
    { "key": "tldr", "label": "TL;DR", "type": "text", "multiline": true, "required": true },
    { "key": "summary", "label": "Summary", "type": "text", "multiline": true, "required": true },
    { "key": "order", "label": "Order", "type": "number" },
    {
      "key": "kind",
      "label": "Kind",
      "type": "select",
      "options": ["Frontend", "Fullstack", "Product"],
      "required": true
    },
    { "key": "stack", "label": "Stack", "type": "list", "of": { "type": "text" }, "required": true },
    { "key": "image", "label": "Cover", "type": "image", "required": true },
    { "key": "repo_url", "label": "Repository", "type": "url" }
  ]
}
```

`projects/work/_config.json`:

```json
{
  "fields": [
    { "key": "company", "label": "Company", "type": "text", "required": true },
    { "key": "role", "label": "Role", "type": "text", "required": true },
    {
      "key": "years",
      "label": "Years",
      "type": "object",
      "required": true,
      "fields": [
        { "key": "start", "label": "Start", "type": "number", "required": true },
        { "key": "end", "label": "End", "type": "number" }
      ]
    },
    { "key": "impact", "label": "Impact", "type": "text", "multiline": true, "required": true },
    { "key": "product_url", "label": "Product", "type": "url" },
    { "key": "demo_url", "label": "Demo", "type": "url" }
  ]
}
```

`projects/play/_config.json`:

```json
{
  "fields": [
    { "key": "year", "label": "Year", "type": "number", "required": true },
    {
      "key": "stage",
      "label": "Status",
      "type": "select",
      "options": ["Live", "In progress", "Archived"],
      "required": true
    },
    { "key": "demo_url", "label": "Demo", "type": "url", "required": true }
  ]
}
```

**Field keys:**
- **Format:** they must be lowercase letters, digits and `_`, so `repoUrl` becomes `repo_url`.
- **Mapping:** the website maps them back to camelCase in one place (step 4), so components don't
  change.
- **`project.order`:** `posts/` doesn't define `order`, since posts sort by date.
- **Before importing:** compare these configs with `lib/content/schemas.ts` once more. The table
  above was read from it, but if a field moved since, the schema wins.

## 3. Convert the MDX files and import them

An import reads a **Spotcraft export directory**:

```
spotcraft-content/
  spotcraft.yaml                 format: 2
  site.yaml                      name: Ivan Vinski / site_url: https://www.vin.ski
  posts/_config.json
  posts/new-date-broke-my-build/index.md
  projects/_config.json
  projects/work/_config.json
  projects/work/huddleos/index.md
  projects/work/huddleos/huddleos.svg
  projects/play/_config.json
  projects/play/vinui/index.md
  projects/play/vinui/vinui.svg
  projects/play/vinui/vinui-diagram.svg
```

Each `index.md` is front matter plus a Markdown body:

```md
---
title: HuddleOS
status: published
published_at: "2024-06-01T00:00:00.000Z"
tags:
  - nextjs
tldr: …
summary: …
order: 1
kind: Frontend
stack:
  - Next.js
  - TypeScript
image:
  src: huddleos.svg
  alt: HuddleOS dashboard
company: …
role: …
years:
  start: 2020
  end: 2024
impact: …
---
## Context

…
```

**`id` is optional.** The import gives each new document one, and a later export writes it out.

Write a one-off script, `scripts/to-spotcraft.mts`. It's about 80 lines, using `yaml` (already a
dependency through `lib/content/sections.ts`) and `node:fs`. For each `content/<type>/<slug>.mdx`:

1. **Split the front matter from the body,** and parse the front matter with the existing zod
   schemas, so bad data fails here and not in Spotcraft.
2. **Pick the folder:**
   - `posts/<slug>`;
   - `projects/work/<slug>` or `projects/play/<slug>`, from `category`.
3. **Map the keys** with the table in step 2:
   - `date` → `status` / `published_at`;
   - camelCase → snake_case;
   - play `status` → `stage`;
   - drop `category`.
4. **Images:** copy `public<image.src>` (for example `public/images/work/huddleos.svg`) next to
   the new `index.md`, and set `image.src` to the bare file name.
   - Do the same for each `![alt](/images/samples/<name>.svg)` in the body, and rewrite it to
     `![alt](<name>.svg)`.
   - Names must be lowercase letters, digits and hyphens plus the extension; the current names
     already are.
5. **The body is copied as is.** Spotcraft refuses raw HTML in bodies, and vin.ski's bodies have
   none: the JSX in `new-date-broke-my-build` and `wireframing-in-code` is inside fenced code blocks,
   which is plain text.
6. **Write `spotcraft.yaml`, `site.yaml` and the four `_config.json` files** from step 2.

Then a dry run, which lists every change and every problem and writes nothing:

```bash
node apps/website/scripts/to-spotcraft.mts            # writes ./spotcraft-content
pnpm --filter dashboard content:import ../../spotcraft-content --site vinski --create-site
```

**Reading the dry run:**
- **Extras:** any key no field matches is listed as "kept in extras" (stored as text, not as a
  field). Each one is a mapping you missed, so fix the script.
- **Problems:** missing required fields or bad URLs are listed per file, and fail the import as a
  whole.

When it's clean:

```bash
pnpm --filter dashboard content:import ../../spotcraft-content --site vinski --create-site --apply
pnpm --filter dashboard search:sync
```

**Check the result:**
- `vinski` is the first site, so it's the **default**: `http://localhost:3000/api/…` serves it.
- Open the dashboard: Files shows `posts/` and `projects/`, the documents open, and the
  covers appear in each document's Images.
- `curl "http://localhost:3000/api/content?folder=projects&deep=true"` lists the published projects,
  with absolute image URLs and sizes.

**Afterwards:**
- **Keep the converted files as a backup:** run `pnpm --filter dashboard content:export
  ../../spotcraft-content` once to get the canonical form (with ids), and commit it if you want
  content in git.
- **Spotcraft is now the source.** The next import updates documents by `id` and never deletes,
  so don't edit `content/*.mdx` any more.

## 4. Point the website at Spotcraft

### Connect

`apps/website/package.json`, until the client is on npm:

```json
"@spotcraft/client": "link:../../../spotcraft/packages/client"
```

Build it once in the Spotcraft repo with `pnpm client:build`; its `pnpm dev` keeps it rebuilt.

`apps/website/.env.local` (and `.env.example` without the values):

```bash
SPOTCRAFT_URL=http://localhost:3000          # the default site (vinski); also http://localhost:3000/vinski
SPOTCRAFT_API_TOKEN=…                        # SPOTCRAFT_API_TOKEN from apps/dashboard/.env (server only)
SPOTCRAFT_WEBHOOK_SECRET=…                   # WEBHOOK_SECRET from apps/dashboard/.env
```

`apps/dashboard/.env`:

```bash
WEBHOOK_URL=http://localhost:3001/api/spotcraft
WEBHOOK_SECRET=…                             # a random string, the same as above
```

`lib/cms.ts`:

```ts
import "server-only";
import { createClient } from "@spotcraft/client";

export const cms = createClient({
  url: process.env.SPOTCRAFT_URL!,
  token: process.env.SPOTCRAFT_API_TOKEN, // drafts and no search limit; never in the browser
});
```

### Keep `lib/content/api.ts`'s signatures

The pages call `lib/content/api.ts`, so only its insides change. Replace `load.ts`'s file reads
with the API, and map each `SpotcraftDocument` back into today's item shape. The existing zod
schemas then guard the data exactly as before:

```ts
async function fetchAll(type: "posts" | "projects") {
  "use cache";
  cacheTag("spotcraft");
  cacheLife("hours"); // the webhook clears it on publish; hours keeps future-dated posts appearing on time
  const docs = await cms.list({
    folder: type,
    deep: type === "projects",
    limit: 100,
    drafts: process.env.NODE_ENV === "development", // `next dev` shows drafts, as today
  });
  return docs.map((d) => toItem(type, d)); // camelCase, category from the path, date from publishedAt
}
```

- **`toItem`:**
  - `date` = `publishedAt?.slice(0, 10)` (absent for a draft);
  - `category` = `d.path.split("/")[1]` for projects;
  - `image` = `{ src: attributes.image.src, alt: attributes.image.alt }`. `src` is now an absolute
    URL like `http://localhost:3000/media/projects/work/huddleos/huddleos.svg?v=…`, and
    `width`/`height` are included.
- **The publish rule stays** (`lib/content/publish.ts`): future dates are hidden in production,
  and `next dev` shows drafts and scheduled posts.
- **Sorting and next-item lookup** stay as they are; `order` still sorts projects.

### Revalidate on publish

`app/api/spotcraft/route.ts`:

```ts
import { readWebhook } from "@spotcraft/client";
import { revalidateTag } from "next/cache";

export async function POST(request: Request) {
  const hook = await readWebhook(request, process.env.SPOTCRAFT_WEBHOOK_SECRET!);
  if (!hook) return new Response("Bad signature", { status: 401 });
  revalidateTag("spotcraft", { expire: 0 });
  return new Response(null, { status: 204 });
}
```

**`proxy.ts`:** let `/api/spotcraft` through the auth gate. Spotcraft calls it without a session;
the signature is the check.

### Render bodies from the API

Bodies come back as a Markdown syntax tree (`body`), not MDX. Replace the dynamic
`import(\`@/content/${type}/${slug}.mdx\`)` with a `<Body>` component:

```tsx
import { headingAnchors } from "@spotcraft/client";
import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import { toHast } from "mdast-util-to-hast";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { DetailImage } from "@/components/detail/detail-image";

export function Body({ body }: { body: Root }) {
  const tree = structuredClone(body);
  for (const [heading, id] of headingAnchors(tree)) {
    heading.data = { ...heading.data, hProperties: { id } }; // the ids rehype-slug gave them
  }
  return toJsxRuntime(toHast(tree), {
    Fragment, jsx, jsxs,
    components: { img: (props) => <DetailImage {...props} /> },
  });
}
```

- **Dependencies:** add `mdast-util-to-hast` and `hast-util-to-jsx-runtime`.
- **Image sizes:** body images arrive with `width`/`height` in `data.hProperties`, so `DetailImage`
  gets real sizes.
- **`rehype-unwrap-images`:** it unwrapped image-only paragraphs. Do the same in a small transform
  (a paragraph whose only child is an image becomes the image), or let `DetailImage` render a
  `<span>` frame.
- **Table of contents:** `lib/content/sections.ts` built `## sections` from the MDX source. Use the
  API's `headings` (depth 2: `{ text, anchor }`) for the TOC. Search no longer needs sections (step 5).
- **`next.config.ts`:**
  - allow Spotcraft's images with `images: { remotePatterns: [new URL(\`${process.env.SPOTCRAFT_URL}/media/**\`)] }`;
  - `dangerouslyAllowLocalIP: true` in development only.

### `CONTENT_PATHS`

`next.config.ts` builds a slug → date map from the MDX front matter at build time, for `proxy.ts`
(real 404s) and the admin bar. Two options:
- **Simplest:** drop it. `dynamicParams = false` plus `notFound()` in the `[slug]` pages already
  404 unknown or unpublished slugs. Read publish state in the admin bar from `lib/content/api.ts`.
- **Keep the proxy check:** make `next.config.ts` an async function that fetches
  `cms.list({ deep: true, limit: 100 })` and builds the same map. The catch: the map only refreshes
  on deploy, while content now changes without one.

### Also switch

- **`generateStaticParams`:** it keeps calling `getStaticSlugs(type)`, which now reads the API (the
  `__none__` placeholder stays).
- **`app/sitemap.ts`:** build it from the API too when the site launches.

**Check:**
- `pnpm dev`: the home, every `/projects/:slug` and `/blog/:slug` look as before.
- Publishing an edit in the dashboard shows on reload (the webhook clears the cache).
- `pnpm build` passes with Spotcraft running.

## 5. Search

Spotcraft has search built in: `GET /api/search`, through `cms.search`.
- **Without an OpenAI key:** keyword search (Postgres full text, English stemming).
- **With `OPENAI_API_KEY` in `apps/dashboard/.env`:** hybrid, by words and meaning (pgvector,
  `text-embedding-3-small`).
- **Indexing:** saving a document re-indexes it; `pnpm --filter dashboard search:sync` rebuilds
  the whole index.

Swap the inside of `features/search/api/search.ts`, keeping the route and the response shape the
dialog expects:

```ts
const { results } = await cms.search({ q, limit, folder: type, tag });
return results.map((r) => ({
  url: `${r.folder === "posts" ? "/blog" : "/projects"}/${r.path.split("/").at(-1)}${r.anchor ? `#${r.anchor}` : ""}`,
  title: r.title,
  heading: r.heading,
  type: LABELS[r.folder],
  snippet: r.snippet,
  similarity: r.score,
}));
```

- **Filters:** `folder` is one folder (`posts` or `projects`), and `tag` is one tag. For several
  types or tags, make one call per value and merge, or drop the multi-value filters if nothing
  sends more than one.
- **Threshold:** drop the 0.82 similarity cut-off. `score` is 0–1 but comparable only within one
  search, and Spotcraft already filters out weak semantic matches.
- **Results per URL:** keep the "one result per URL" step. Spotcraft returns a document and its
  matching sections separately.
- **Section ids:** `anchor` is the heading's id, the same one `<Body>` gives it, so links land on
  the section.

Then delete:
- `supabase/migrations/20261030121450_create_documents_table.sql` and the grant migration. Use a
  new migration that drops `documents` and `match_documents`, rather than editing applied ones.
- `supabase/functions/embed/`;
- `apps/website/scripts/embed.mts` and the root `embed` script.

Supabase then holds only the admin login (Auth with Turnstile); see "Later" for dropping it too.

## 6. Clean up

Once the site runs from Spotcraft:
- **MDX:** remove `apps/website/content/`, `mdx-components.tsx`, `@next/mdx`, `remark-frontmatter`,
  `remark-mdx-frontmatter` and `rehype-unwrap-images` (keep `rehype-slug` only if something else
  uses it). Also remove the MDX entries in `next.config.ts` (`pageExtensions`, `withMDX`).
- **Old loaders:** remove `lib/content/load.ts` and the parts of `sections.ts` the TOC and search
  no longer use.
- **Images:** remove `public/images/work/` and `public/images/samples/`, which are in Spotcraft
  now. Keep the portraits; they're site chrome.
- **Env:** add the three `SPOTCRAFT_*` variables to `.env.example`.

## 7. Profile copy (optional, later)

`features/profile/data.ts` can stay in code; it changes rarely. To edit it in the dashboard too,
add a single-document folder `profile/` (a folder with its own `index.md`) whose config describes
the blocks:

```json
{
  "fields": [
    { "key": "availability", "label": "Availability", "type": "text" },
    { "key": "headline", "label": "Headline", "type": "text", "multiline": true },
    { "key": "about", "label": "About", "type": "markdown" },
    {
      "key": "experience",
      "label": "Experience",
      "type": "list",
      "of": {
        "type": "object",
        "fields": [
          { "key": "title", "label": "Title", "type": "text", "required": true },
          { "key": "company", "label": "Company", "type": "text", "required": true },
          { "key": "start", "label": "Start", "type": "number", "required": true },
          { "key": "end", "label": "End", "type": "number" }
        ]
      }
    },
    { "key": "email", "label": "Email", "type": "text" },
    { "key": "call_url", "label": "Book a call", "type": "url" }
  ]
}
```

- **Reading it:** `features/profile/api/profile.ts` keeps its getters and reads
  `cms.get("profile")` instead of `data.ts`.
- **Services and process steps:** they work the same way (a list of objects). `proof`'s
  `{ type, slug }` stays a plain list; the getter already drops slugs that don't resolve.

## 8. Deploy

Two apps, deployed separately:

| | Website (`apps/website`) | Spotcraft (`apps/dashboard`) |
|---|---|---|
| Host | Vercel, as today | Vercel (root directory `apps/dashboard`), or Docker (`docker-compose.prod.yml`) |
| Domain | `www.vin.ski` | e.g. `cms.vin.ski` |
| Database | none | Postgres 15+ with pgvector, pooled (transaction mode) URL on Vercel |
| Storage | — | an S3-compatible bucket for images (any provider; path-style URLs) |
| Env | `SPOTCRAFT_URL=https://cms.vin.ski`, `SPOTCRAFT_API_TOKEN`, `SPOTCRAFT_WEBHOOK_SECRET` | `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL=https://cms.vin.ski`, `SMTP_URL`, `MAIL_FROM`, `S3_*`, `SPOTCRAFT_API_TOKEN`, `WEBHOOK_URL=https://www.vin.ski/api/spotcraft`, `WEBHOOK_SECRET`, optionally `OPENAI_API_KEY` |

Spotcraft's docs cover the details: Self-hosting (database, SMTP, images, Vercel) and Environment
(every variable).

**Order:**
1. Publish `@spotcraft/client` (and tag Spotcraft `v0.1.0`), then switch the website's dependency
   from `link:` to the version.
2. Create the production database, migrate it, deploy Spotcraft, and finish `/onboard` right away.
   Until onboarding is done, anyone who reaches the URL can claim it.
3. Import into production:
   - run the same `content:import … --site vinski --create-site --apply` with `DATABASE_URL`
     pointing at production (it asks for `--yes` when the database isn't local) and the production
     `S3_*` set;
   - then `search:sync`.
4. Deploy the website with the `SPOTCRAFT_*` variables. `next build` reads Spotcraft, so Spotcraft
   must be up first.
5. Publish a small edit and check that the webhook updates the live site.

**Reusing the existing Supabase project:** its Postgres has pgvector, so it can host Spotcraft's
tables (use the pooled URL on Vercel). Spotcraft doesn't use Supabase's APIs or Auth, only the
database.

## Later

- **Drop Supabase Auth:** Spotcraft already has accounts. The admin bar could check a Spotcraft
  session instead, but that needs a small "who am I" endpoint Spotcraft doesn't expose yet, so
  leave the current login in place for now.
- **Scheduling:** if vin.ski needs real scheduled publishing (public at a future time without a
  rebuild), it belongs in Spotcraft's API (filter `published_at <= now`). Today the website's
  `cacheLife("hours")` does the job.
- **Analytics** (`trackViewAttributes`, Vercel Analytics) is unaffected.

## Checklist

- [ ] Spotcraft runs in `apps/dashboard`; website moved to port 3001
- [ ] Configs written; dry run clean (no extras, no problems); imported; `search:sync`
- [ ] `lib/content/api.ts` reads `cms`; zod still validates; drafts in dev; future dates hidden
- [ ] `<Body>` renders posts and projects; images sized; TOC from `headings`
- [ ] Webhook route through the auth gate; publishing updates the site
- [ ] Search on `cms.search`; Supabase `documents`, Edge Function and embed script removed
- [ ] MDX, `content/`, moved images and `CONTENT_PATHS` removed
- [ ] Client published; both apps deployed; production import done; onboarding finished
