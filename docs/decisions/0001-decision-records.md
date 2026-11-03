---
title: Decisions are recorded in docs/decisions, in Spotcraft's format
number: 1
status: accepted
date: 2026-11-03
notes: Records 2–11 were written on 2026-11-03 for decisions made earlier, each dated from the commit that made it.
---

## Context

vin.ski made its decisions in commits, READMEs and conversations for its first week. Spotcraft keeps Architecture Decision Records, and Sokobanko plans to. With the demo about to move vin.ski's content to the new Spotcraft, its choices need one place where they're written down with their reasons.

## Decision

- **Records live in `docs/decisions/`,** one `NNNN-slug.md` per decision, with Context, Decision, Alternatives and Consequences, in Spotcraft's format: the same front matter, typed by [`_schema.yaml`](_schema.yaml).
- **A changed decision gets a new record.** It lists the old one in `supersedes`; the old one gets `superseded_by`, and its body isn't rewritten.
- **The decisions that still stand were written up afterwards** (2–11), dated from git. Decisions already replaced get no record; they're summarized below.
- **Checked from the demo's step 1,** by `docs:check`, as Spotcraft checks its own.

**Replaced before records began:**
- **Supabase** for sign-in (`f464ac6`, 2026-10-30) and semantic search over the content (`05ef4ec`, 2026-10-30), removed on 2026-11-01 (`825de3a`).
- **MDX files in the repository** for projects and posts (`d702b50`, 2026-10-30), moved into the old Spotcraft on 2026-11-01 (`5e17730`).
- **The old Spotcraft** (its dashboard copied into `apps/dashboard`) for content, search and sign-in (`5e17730`, `bdb33a7`, 2026-11-01), with its client copied into `packages/spotcraft-client` (`cd0dbb7`), hosted on Vercel with Neon, R2 and Resend (`0c88dfc`, 2026-11-02). Spotcraft's `main` has since replaced that architecture; the demo moves vin.ski off it (12).

## Alternatives

- **Starting fresh,** with only the demo's decisions: simpler, but the reasons behind what's still built would stay scattered.
- **Recording everything,** replaced decisions included: complete, but half of it would describe code that no longer exists.

## Consequences

- A new decision is written down when it's made, and the [roadmap](../roadmap.md) cites records by number.
- Git history and the commits cited above remain the source for what came before.
