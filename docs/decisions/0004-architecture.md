---
title: Code flows shared → features → app, enforced by ESLint; TanStack Query only for browser requests
number: 4
status: accepted
implementation: built
date: 2026-10-31
---

## Context

After a week of fast changes, files lived wherever they were first written, and features reached into each other. The site needed a structure that keeps each part replaceable, as the move to Spotcraft would test.

## Decision

- **[bulletproof-react](https://github.com/alan2207/bulletproof-react)'s layers:** shared code (`components/`, `config/`, `lib/`, `types/`), then features (`features/<name>/`), then `app/`. Code imports only from its own layer or the ones before it, and a feature never imports another feature.
- **ESLint enforces it** (`174c5eb`): `import/no-restricted-paths` for the layers, `eslint-plugin-check-file` for kebab-case names.
- **No barrels:** files are imported directly.
- **Data:** content is read by server components and prerendered. TanStack Query (`e2ed740`) is only for what the browser asks for after the page loads, one file per request in `features/<name>/api/`.

## Alternatives

- **Folders by file type** (`components/`, `hooks/`, `utils/` only): simple at first, but nothing keeps features apart.
- **SWR or plain `fetch` in effects** for browser requests: less to learn, but no cancellation or shared cache keys.

## Consequences

- Adding a feature means adding its name to `eslint.config.mjs`.
- What two features both need moves into shared code, or `app/` composes them.
