---
name: vinski-content
description: vin.ski's content in content/, typed Markdown that Spotcraft's CLI checks and imports into the `vindotski` project on api.vin.ski. Use when adding or editing a post or project, changing a field or a content _schema.yaml, adding a project image, or running content:check, content:import or content:export.
metadata:
  author: Ivan Vinski
---

# vin.ski content

The posts and projects on vin.ski are Markdown files in `content/`, one per document, named by its slug. Each folder's `_schema.yaml` types the front matter. Git is the source: `content/` is imported into the `vindotski` project on https://api.vin.ski, and the site reads it from there (decision 12, `docs/decisions/0012-content-from-spotcraft.md`).

## Folders and fields

A document's fields are every `_schema.yaml` from `content/` down to its folder. Read the schema files for the exact rules; this is the map.

| Folder | Adds | Required |
| --- | --- | --- |
| `content/` (every document) | `title`, `date`, `tags`, `tldr`, `order`, `repoUrl`, `demoUrl` | `title`, `tags`, `tldr` |
| `posts/` | nothing | |
| `projects/` | `summary`, `kind`, `stack`, `image` (`src`, `alt`) | all four |
| `projects/work/` | `company`, `role`, `years` (`start`, `end`), `impact`, `productUrl`, `team`, `reach`, `results` (`label`, `value`, `measured`) | `company`, `role`, `years`, `impact` |
| `projects/play/` | `year`, `status` (`Live`, `In progress`, `Archived`) | `year`, `status`, `demoUrl` |

- **Keys are camelCase,** the same as the site's Zod schemas in `apps/website/lib/content/schemas.ts`. A field added to a `_schema.yaml` goes there too, and the other way round.
- **`date`** is `YYYY-MM-DD`, unquoted. No date means a draft; a future date means scheduled. Production shows neither, and `next dev` shows both. The repository is public, so a draft or scheduled post can still be read on GitHub.
- **`order`** sorts projects, lowest first. Posts sort by date, newest first.
- **`results`:** set `measured: false` for a projected or estimated result. `impact` stays the one-line result on the card.

## Body

The body is Markdown, and its `##` headings become the page's sections and table of contents. The schemas don't check the body, so keep to these:

- **Work:** Context, My role, Decisions. Each decision names the options rejected and why.
- **Play:** Why I built it, Architecture (with its diagram), Key decisions, What I'd do next.
- **Posts:** free-form `##` sections.

## Images

Images live in the site, not in Spotcraft: `apps/website/public/images/projects/`, referred to by their site path. Examples: `image.src: /images/projects/huddleos.svg`, and `![Sokobanko architecture](/images/projects/sokobanko-diagram.svg)` in a body. A project's cover is `<slug>.svg`, and its diagram is `<slug>-diagram.svg`.

## Spotcraft's rules

These come from Spotcraft's decision 8 and are enforced by `content:check`:

- **Unknown keys are errors.** Every front matter key must be declared by some `_schema.yaml` from the root down.
- **A property is declared once.** A folder can't redeclare what a folder above declares. To make a parent's field required in one folder, list it in that folder's `required` without redeclaring it, as `projects/play/` does with `demoUrl`.
- **`required` names only properties declared at or above that folder.**
- **Each schema** is `type: object` with only `properties`, `required` and annotations at its top, and no `$ref`. A nested object uses `additionalProperties: false`.
- **The importer reads only `.md` and `_schema.yaml` files,** so don't put a README or notes in `content/`.

## Scripts

They run Spotcraft's CLI from a `../spotcraft-main` worktree on Spotcraft's `main` (the README's "Content" section). Never use the `../spotcraft` checkout itself, which is on `dev`.

- `pnpm content:check`: run after every content or schema change. It names each problem's file, line and field.
- `pnpm content:export`: writes the project's `main` into `content/`, deleting files that aren't on it.
- `pnpm content:import`: makes the project's `main` match `content/`, as one commit. It checks first, and sends nothing if there's a problem.

Import and export need `SPOTCRAFT_API_URL=https://api.vin.ski` and `SPOTCRAFT_ADMIN_SECRET`. Leave running them to Ivan, and never print or commit the secret.

**Export first.** An edit made in Spotcraft's dashboard is lost on the next import. So the order is always `pnpm content:export`, review and commit the diff, edit, `pnpm content:check`, commit, `pnpm content:import`.

Reads are open, so a published document can be checked without the secret: `curl https://api.vin.ski/v1/projects/vindotski/content/projects/work/` lists a folder, and `…/content/projects/work/huddleos` gets one document with its `data`, `body` and `headings`.
