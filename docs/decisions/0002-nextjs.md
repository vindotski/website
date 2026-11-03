---
title: The site is Next.js 16 with the App Router and Cache Components, prerendered
number: 2
status: accepted
implementation: built
date: 2026-10-27
---

## Context

A personal site with a handful of pages, read far more than it changes, that should be fast everywhere and cheap to host, and built with the stack the work it shows is built with.

## Decision

- **Next.js 16** with the App Router, React 19 and TypeScript.
- **Cache Components** (`cacheComponents`): data is read in cached functions (`"use cache"`, `cacheLife`), so pages are prerendered and refreshed in the background rather than rendered per request.
- **`proxy.ts`** (Next 16's middleware) for anything decided per request, such as the pre-launch teaser (6).

## Alternatives

- **Astro:** a natural fit for content, but less of the React and server-component work the portfolio is about.
- **TanStack Start:** what Spotcraft's website uses; younger, and with less of the hosting support Vercel gives Next.

## Consequences

- Next 16 differs from earlier versions; `apps/website/AGENTS.md` points at the docs shipped in `node_modules/next/dist/docs/`.
- An empty list in `generateStaticParams` fails the build under Cache Components, so a type with nothing published returns a placeholder slug that 404s.
