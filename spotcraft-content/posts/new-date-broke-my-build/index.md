---
id: 71a26222-b66c-5d39-ae2e-282b735e78ae
title: new Date() broke my build
status: published
published_at: "2026-11-10T00:00:00.000Z"
tags:
  - nextjs
  - caching
  - react
tldr: Next.js 16 refused to build a page because the footer showed the current year. Caching that one value for a day kept the page pre-built and the year correct.
---
## The question

Every site has one: a footer that says `© 2026`. Nobody wants to update it by hand every January, so it usually comes from the clock.

On this site, that one line stopped the build. The question became: how do you show a value that changes over time on a page that's built ahead of time?

## Setup

The site is Next.js 16.4, created with `create-next-app`. The generated config turns on Cache Components:

```ts
const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
};
```

The footer did the obvious thing:

```tsx
<p>© {new Date().getFullYear()} Ivan Vinski</p>
```

## What I tried

The build failed straight away:

```
Error: Route "/": Next.js encountered the unstable value `new Date()`
while prerendering. This value can change between renders, so it must
be either prerendered or computed later.
```

The error is helpful. It lists four ways out:

- **Dynamic.** Call `await connection()` first, so the value is worked out on every request. That makes the page dynamic and needs a `<Suspense>` boundary. Too much for a number that changes once a year.
- **Client.** Move it into a `"use client"` component. That ships JavaScript for a number, and the server-rendered HTML wouldn't contain it.
- **Measure.** Use `performance.now()`. That's for timing, not for showing anything.
- **Cache.** Mark the value with `"use cache"` so it's worked out once and reused until it expires.

Caching fits. The year is the same for everyone, and it only needs to change once a year. A small async component does it:

```tsx
import { cacheLife } from "next/cache";

// Cached so the page can still be prerendered; refreshed daily for the new year
async function CurrentYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}
```

And the footer uses it like any other component:

```tsx
<p>© <CurrentYear /> Ivan Vinski</p>
```

## Results

The build passed, and the home page stayed static. The build output now shows when it refreshes:

```
Route (app)      Revalidate  Expire
┌ ○ /                    1d      1w
```

The page is still built ahead of time. Next.js rebuilds it in the background at most once a day, so the year turns over on its own after New Year.

Two things I noticed later:

- When the footer moved into the shared layout, every page picked up the same one-day refresh. For a portfolio, that costs nothing. For a large site, it's worth knowing that one cached value in a layout sets the refresh for everything under it.
- Formatting a fixed date is fine. Blog dates use `new Date("2026-11-10")`, and the build doesn't complain. Only reading the current time is a problem.

## Takeaways

Cache Components makes you decide when every value is worked out, even something as small as a year. That felt like friction at first. It's actually the point: the build tells you exactly which line would have made the page dynamic.

For a copyright year, a cached component with `cacheLife("days")` is the right size. If I didn't want any refresh at all, I'd type the year by hand and change it once a year.
