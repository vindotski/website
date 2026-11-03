# Security policy

## Reporting a vulnerability

**Please don't report security issues in public issues, discussions or pull requests.**

Report them privately through GitHub: **[Security → Report a vulnerability](https://github.com/vindotski/portfolio/security/advisories/new)**, or by email to ivan@vin.ski.

Include what you found, how to reproduce it, and the impact you expect. You'll get an acknowledgement as soon as possible, and you'll be credited in the fix unless you prefer otherwise.

## Supported versions

Only what runs at [www.vin.ski](https://www.vin.ski), built from the `main` branch.

## Scope

Especially relevant, given what the site does:

- the teaser gate in `apps/website/proxy.ts`: reaching any page but the teaser on www.vin.ski before launch
- drafts or scheduled content shown on www.vin.ski
- secrets reaching the browser or the repository

**Spotcraft** (the API at api.vin.ski) is reported the same way, by email to ivan@vin.ski. Issues in Next.js, Vercel or other dependencies themselves should be reported to those projects.
