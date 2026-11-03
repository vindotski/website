# Suggestions for Spotcraft

What integrating vin.ski with Spotcraft (its `main` at `a814a62`, and https://api.vin.ski) turns up that Spotcraft could support better. This repository doesn't change Spotcraft. Each entry says what happened here and what could change there. Sokobanko keeps the same list for its integration; where an entry is the same, it says so.

## 1. Publish the SDK and the CLI
- **What happened:** neither `@spotcraft/sdk` nor `spotcraft` is on npm, so the site reads with `fetch`, and the `content:*` scripts need a `../spotcraft-main` worktree with `pnpm install` run in it. (Sokobanko's 1 and 2.)
- **Suggestion:** publish them, even as `0.x`, with a `bin` that runs without a build.

## 2. `spotcraft import` overwrites dashboard edits
- **What happened:** the content's source is git, and an import writes the folder as one commit on `main`, so an edit made in the dashboard since the last import is replaced. The rule here is to `pnpm content:export` and commit before importing. (Sokobanko's 3.)
- **Suggestion:** `import` refuses when `main` has commits it didn't make, unless `--force` is given.

## 3. Knowing when content is published
- **What happened:** with no publish webhook, the site re-reads Spotcraft every 5 minutes, so an edit can take that long to show. (Sokobanko's 5.)
- **Suggestion:** the publish webhook on Spotcraft's roadmap.

## 4. Unpublished content is public
- **What happened:** reads on api.vin.ski are open, so a scheduled post (a future `date`) and anything on a draft branch can be read by anyone who asks, before the site shows it. The site hides them; the API doesn't.
- **Suggestion:** publishable keys and `public_read` (Spotcraft's decision 13, stage 3), so a project can keep everything but its published `main` private.

More entries are added as the demo's steps turn them up.
