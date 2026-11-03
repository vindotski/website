---
title: Agent skills are chosen for the stack and the roadmap, installed with the skills CLI into .claude/skills
number: 15
status: accepted
implementation: built
date: 2026-11-03
notes: Four more are planned for later roadmap moments (docs/roadmap.md, Later). The vinski-content skill, written in the demo's step 1, is in .claude/skills/vinski-content.
---

## Context

Agent skills give an AI assistant working in this repository the conventions of the tools it uses. The repository had three. Before the demo, they were checked against the stack (2, 3, 8), the roadmap, and what's available: antfu/skills, vercel-labs/agent-skills, the Next.js repository's skills, anthropics/skills, mattpocock/skills, and what Spotcraft and Sokobanko install.

## Decision

- **Installed with the `skills` CLI** (`pnpm dlx skills add <repo> --skill <name> -a claude-code --copy -y`), as copies in `.claude/skills/`, recorded in `skills-lock.json`.
- **Kept:** `shadcn`, `vercel-react-best-practices` and `web-design-guidelines`, for the stack and UI review.
- **Added:**
  - `pnpm`, for the workspace and its scripts;
  - `writing-guidelines`, for the docs, records and posts;
  - `frontend-design`, for the visual design pass before launch;
  - `next-cache-components-optimizer` and `next-dev-loop`, for the demo's caching change and checking changes in the running app;
  - `vercel-composition-patterns`, for component APIs.
- **The rule:** a skill is added when the stack or a roadmap step needs it, and skipped when it repeats something the assistant already has.
- **Licenses:** each skill keeps its own, with its notice in its folder and a line in `THIRD_PARTY_NOTICES.md` (10).

## Alternatives

- **antfu/skills' other skills:** mostly Vue, Nuxt, Pinia, Vite, VitePress and UnoCSS, which this site doesn't use. `antfu-simplify`, `antfu-query` and Matt Pocock's `grill-me` repeat the assistant's own simplify and question rounds; `antfu-create-pr` and issue triage assume pull requests, and changes here are committed directly.
- **`next-best-practices`:** retired by Vercel. Next.js 16.3+ ships that knowledge as its bundled docs and the `AGENTS.md` that `next dev` writes, which `apps/website` already has.
- **Symlinks into `.agents/skills/`,** the CLI's default: one copy shared by several assistants, but only Claude Code is used here, and copies keep the repository's files plain.

## Consequences

- `skills update` ignores `--copy`: it moves updated skills into `.agents/skills/` and symlinks them. After an update, turn the links back into copies, remove `.agents/`, and check that the license files are still there.
- `next-dev-loop` needs `agent-browser` and a running `next dev`; `next-cache-components-optimizer` writes `@next/playwright` tests. Neither is a dependency until a skill is used.
