# @spotcraft/client

A typed client for [Spotcraft](https://github.com/vindotski/spotcraft)'s public API: read your
site's documents, search them, check webhooks, and tell who of your team is visiting, from any
frontend (Next.js, Astro, SvelteKit, plain Node). Plain `fetch` and Web Crypto; its only runtime
dependencies are `github-slugger` and `jose`. MIT licensed.

```bash
pnpm add @spotcraft/client
```

## Reading content

```ts
import { createClient } from "@spotcraft/client";

const cms = createClient({
  url: "https://cms.example.com/blog", // your site's base URL: Spotcraft's address + the site's slug
  token: process.env.SPOTCRAFT_API_TOKEN, // optional, server only: drafts and no search limit
});

const site = await cms.site(); // { siteName, siteUrl }
const posts = await cms.list({ folder: "posts", limit: 10 }); // newest first
const projects = await cms.list({ folder: "projects", deep: true }); // the whole subtree
const post = await cms.get("posts/shipping-small"); // or null
const { mode, results } = await cms.search({ q: "small pull requests" }); // best first
```

Every document has its `title`, `publishedAt`, `tags`, field values in `attributes`, its `body`
as a Markdown syntax tree ([mdast](https://github.com/syntax-tree/mdast)), its `headings`, and its
`images`. Image fields and Markdown images come with absolute URLs and their size.

Errors are thrown as `SpotcraftError` (with `status` and `code`); `get` returns `null` for a
document that doesn't exist or isn't published.

Pass `drafts: true` (with the token) to include drafts, for previews and development:

```ts
const post = await cms.get("posts/shipping-small", { drafts: process.env.NODE_ENV === "development" });
```

Keep the token on the server: never use it in browser code.

## Next.js

Every method takes fetch options as its last argument, including Next's `next`:

```ts
const posts = await cms.list({ folder: "posts" }, { next: { tags: ["spotcraft"] } });

export async function generateStaticParams() {
  const posts = await cms.list({ folder: "posts", limit: 100 });
  return posts.map((post) => ({ slug: post.slug }));
}
```

Revalidate when content changes, from a webhook (set `WEBHOOK_URL` and `WEBHOOK_SECRET` in
Spotcraft):

```ts
// app/api/spotcraft/route.ts
import { readWebhook } from "@spotcraft/client";
import { revalidateTag } from "next/cache";

export async function POST(request: Request) {
  const hook = await readWebhook(request, process.env.SPOTCRAFT_WEBHOOK_SECRET!);
  if (!hook) return new Response("Bad signature", { status: 401 });
  revalidateTag("spotcraft", { expire: 0 }); // hook.site, hook.event, hook.path, hook.previousPath
  return new Response(null, { status: 204 });
}
```

Allow Spotcraft's images for `next/image`:

```ts
// next.config.ts
export default { images: { remotePatterns: [new URL("https://cms.example.com/blog/media/**")] } };
```

## Rendering a body

Render `body` with [`mdast-util-to-hast`](https://github.com/syntax-tree/mdast-util-to-hast) and
any hast renderer. Give headings the ids Spotcraft uses, so links from search (`anchor`) land on
them:

```ts
import { headingAnchors, sections } from "@spotcraft/client";

const ids = headingAnchors(post.body); // Map: heading node → "the-habit"
const toc = sections(post.body).filter((s) => s.heading); // [{ heading, anchor, depth, children }]
```

`post.headings` has the same anchors, already worked out, for a table of contents.

## Who's visiting

People who work on your site sign in on Spotcraft, which sets a short-lived signed token for your
frontend's server (Spotcraft and the frontend share a domain: `AUTH_COOKIE_DOMAIN`). Check it on
your server, with no request to Spotcraft per page:

```ts
import { getSession, loginUrl, logoutUrl } from "@spotcraft/client";

const spotcraft = { url: "https://cms.example.com/blog" };
const { user, setCookie } = await getSession(request.headers.get("cookie"), spotcraft);
// user: { id, email, role, sites }, or null if they aren't signed in or don't work on this site.
// setCookie: a renewed token's cookies (when it had run out): pass them on in your response.

loginUrl("https://www.example.com/drafts", spotcraft); // sign in, then back there
logoutUrl("https://www.example.com/", spotcraft); // sign out everywhere, then back
```

`verifySession` only checks the token, never asking Spotcraft. `TOKEN_COOKIE` and
`SESSION_COOKIES` are the cookies' stable names.

## Types

`SpotcraftDocument`, `SearchResult`, `Site`, `DocumentImage`, `DocumentHeading` and `paths` (the
whole API, generated from its OpenAPI spec) are exported. Your fields' values are in
`attributes` as `Record<string, unknown>`: check them with your own schema (Zod, Valibot, …).

## Documentation

[Reading content from your site](https://vindotski.github.io/spotcraft/building/reading-content/) ·
[Images](https://vindotski.github.io/spotcraft/guide/images/) ·
[Webhooks](https://vindotski.github.io/spotcraft/building/reading-content/#webhooks) ·
[Signing in to your frontend](https://vindotski.github.io/spotcraft/building/signing-in/)

Spotcraft itself is AGPL-3.0-or-later; this client is MIT, so your frontend can use it under any
license.
