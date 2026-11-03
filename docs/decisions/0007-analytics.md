---
title: Analytics are Vercel Web Analytics and Speed Insights, cookieless, with a small event vocabulary
number: 7
status: accepted
implementation: built
date: 2026-10-31
---

## Context

The site has one job: get the right people to get in touch. Analytics should show whether it does, without a consent banner standing between a visitor and the page.

## Decision

- **Vercel Web Analytics and Speed Insights** (`608270c`), which count visitors without cookies, so there's no consent banner.
- **A small event vocabulary,** `noun_verb` in snake_case, with properties from fixed lists and never free text or personal data. The events and the monthly review are in [`apps/website/README.md`](../../apps/website/README.md#analytics).
- **The number that matters is the contact rate:** visitors with a `contact_click`, over all visitors, per month.

## Alternatives

- **Google Analytics with consent mode** (`d0114c6`): tried and replaced the same day. It needs a consent banner and cookies for full data.
- **Plausible or Fathom:** cookieless too, but another service and bill, while Vercel's is part of the host (9).

## Consequences

- Reports only come from Vercel deployments, with Web Analytics turned on for the project.
- A new event updates the README's event table in the same commit.
