# Contributing to vin.ski

vin.ski is Ivan Vinski's personal site. Its source is public so people can read it and learn from it, and fixes are welcome. It isn't open source: the site and its content are all rights reserved (see [License & Trademarks](README.md#license--trademarks)), and the terms below keep it that way.

- **Bugs and suggestions:** open an [issue](https://github.com/vindotski/portfolio/issues/new/choose).
- **Security problems:** never in a public issue. See [SECURITY.md](SECURITY.md).
- Please follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## What to contribute, and where

- **Welcome in `apps/website`:** bug fixes, accessibility, performance, typos and broken links. Send a pull request.
- **Open an issue first** for anything about design, copy, structure or content. Those are decisions about Ivan's site, and he makes them; an issue saves you work on something that won't be merged.

## Setup

See [Getting started](README.md#getting-started): Node 26 and pnpm 12, then `pnpm dev`. The site reads its content from api.vin.ski, so nothing else needs to run. How the site is organized is in [`apps/website/README.md`](apps/website/README.md).

## Before opening a pull request

```bash
pnpm lint
pnpm build
```

For visual changes, add before and after screenshots, on a phone and a wide screen.

CI runs the same checks on every pull request (the `website` job), and they must pass. On pull requests from forks it skips `content:check` and `docs:check`, which need access to Spotcraft's private repository; they run once the change is merged.

## Guidelines

- **Small, focused pull requests.** One fix or change each.
- **Commits** follow [Conventional Commits](https://www.conventionalcommits.org/): `fix(search): …`, `feat(blog): …`, `docs: …`, `chore: …`.
- **Architecture.** Code flows one way, shared → features → app, and a feature never imports another feature. ESLint enforces it; see [Architecture](apps/website/README.md#architecture).
- **No personal data in analytics.** Events never carry names, email addresses or anything a visitor typed. See [Analytics](apps/website/README.md#analytics).
- **Ask before adding a dependency.**

## Your contribution and ownership

**vin.ski is Ivan Vinski's work.** Contributing doesn't make you an author, co-owner or licensee of the site or its content, and contributors aren't credited on the site. Your commits stay in the git history.

By submitting a contribution (code, text, images or anything else) through a pull request, an issue or any other way:

1. **You grant Ivan Vinski a license to it:** perpetual, worldwide, non-exclusive, royalty-free and irrevocable, to use, copy, modify, publish, distribute, sublicense and relicense it, as part of vin.ski or otherwise, with no obligation to you.
2. **You confirm** that it's your own work, or that you have the right to grant that license, and that it brings in no third-party code or assets under terms that conflict with it.
3. **You get no other rights** to the site or its content beyond what its [`LICENSE`](apps/website/LICENSE) allows everyone.

Whether and how a contribution is merged is up to Ivan.
