---
title: Styling is Tailwind CSS v4 and shadcn/ui, with semantic tokens and no CSS Modules
number: 3
status: accepted
implementation: built
date: 2026-10-30
---

## Context

The wireframes were built with CSS Modules and hand-made tokens. Turning them into a designed site needed a component set and a token system that wouldn't fight later design changes.

## Decision

- **Tailwind CSS v4,** configured in CSS (`app/globals.css`), with layout tokens (`--content-width`, `--gutter`, `--header-height`) exposed as utilities.
- **shadcn/ui, `base-nova` preset** (Base UI primitives), copied into `components/ui/` and owned from then on.
- **Semantic tokens** (`bg-background`, `text-muted-foreground`), so a dark section or a dark theme is a class, not new colors.
- CSS Modules and the old tokens were removed (2026-10-30).

## Alternatives

- **Keeping CSS Modules:** fine for wireframes, but every component would have been designed from scratch.
- **Radix-based shadcn:** the older primitives; Base UI is shadcn's newer base.

## Consequences

- shadcn's components are MIT licensed and keep their notice (`components/ui/LICENSE`, `THIRD_PARTY_NOTICES.md`).
- `Button` always sets `role="button"`, so links styled as buttons use `buttonVariants()` on the link.
