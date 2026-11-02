# Security policy

## Reporting a vulnerability

**Please don't report security issues in public issues, discussions or pull requests.**

Report them privately through GitHub: **[Security → Report a vulnerability](https://github.com/vindotski/portfolio/security/advisories/new)**, or by email to ivan@vin.ski.

Include what you found, how to reproduce it, and the impact you expect. You'll get an acknowledgement as soon as possible, and you'll be credited in the fix unless you prefer otherwise.

## Supported versions

Only what runs at [www.vin.ski](https://www.vin.ski), built from the `main` branch.

## Scope

Especially relevant, given what the site does:

- the sign-in gate in `apps/website/proxy.ts`: reaching pages a guest shouldn't see before launch, or faking the signed-in user (the `x-vinski-user` header)
- drafts or scheduled content visible to guests
- the signed-in routes: `/api/me` and `/api/admin/content-status`
- Spotcraft's webhook at `/api/spotcraft`: anything that gets past its signature check
- secrets reaching the browser

**Spotcraft itself** (`apps/dashboard` and `packages/spotcraft-client`, at `cms.vin.ski`) is reported through [Spotcraft's security policy](https://github.com/vindotski/spotcraft/security/advisories/new). Issues in Next.js, Vercel or other dependencies themselves should be reported to those projects.
