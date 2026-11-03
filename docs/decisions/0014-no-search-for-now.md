---
title: No search until Spotcraft has search
number: 14
status: accepted
implementation: built
date: 2026-11-03
notes: Built in the demo's step 4, which removed search and the TanStack Query setup only it used.
---

## Context

Search ran on Supabase, then on the old Spotcraft (1). The new Spotcraft plans search for its stage 4 (Spotcraft's decision 17). There are ten documents, all reachable from the home page.

## Decision

- **Search is removed:** the dialog and its ⌘K shortcut, the header's button, `/api/search`, and the `search` and `search_select` events.
- **It comes back on Spotcraft's search,** when that exists.

## Alternatives

- **Searching the site's own content** on its server: it works without Spotcraft, but it's code to throw away.

## Consequences

- A visitor finds a project or post from the home page, and later a sitemap.
- The analytics event table loses two rows.
