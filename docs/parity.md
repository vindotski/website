---
title: Parity
description: How vin.ski's content (what it publishes, and what a case study holds) compares with product designers' and product engineers' portfolios.
---

# Parity

This page compares what vin.ski's content can hold with what strong portfolios publish, and lists the gaps worth closing. It comes before the demo's step 1 ([roadmap.md](roadmap.md)), which writes vin.ski's `_schema.yaml` files: whatever is accepted here becomes a field or a folder in them from the start, instead of a migration later.

**The difference in kind:** the others write each case study as a free-form page, so what one page says and another leaves out is up to the day it was written. vin.ski's content is typed Markdown in Spotcraft: every field is declared in a schema and checked on every import, and the same fields feed the cards, the detail pages and the services' proof links. So parity has two halves. The first is to tell the story at least as well as the best case studies: the constraint, the decisions, the results. The second is what typed content makes possible: every project carries the same details, nothing required can go missing, and one source feeds every place a project appears.

**Compared** (checked 2026-11-03):
- **Product designers**
  - [Jessica Goldman](https://www.jessicagoldmandesign.com/), freelance product designer, selling design packages to companies. Her [Wildflower case study](https://www.jessicagoldmandesign.com/wildflower) is the case study compared below (Goldman).
  - [Femke van Schoonhoven](https://femke.design/), design lead at Gusto, selling courses and coaching to designers (Femke). Her site shows no case studies.
- **Design and product engineers**
  - [Emil Kowalski](https://emilkowal.ski/), design engineer (Kowalski).
  - [Rauno Freiberg](https://rauno.me/), interaction designer (Freiberg).
  - [Brian Lovin](https://brianlovin.com/), software designer (Lovin).
  - [Lee Robinson](https://leerob.com/), product engineer (Robinson).
- **Case study guides**
  - [How to write a UX case study that passes the hiring manager's cold read](https://mentorcruise.com/blog/how-to-write-a-ux-case-study-that-passes-the-hiring-managers-cold-read/), MentorCruise (Cold read): Problem, Process, Decisions, Outcomes, in about 1,200 words.
  - The common outline, from the [UX Design Institute](https://www.uxdesigninstitute.com/blog/?p=7642) and [Adobe XD](https://xd.adobe.com/ideas/perspectives/leadership-insights/ux-case-study-template) guides (Guides): introduction, problem, users, process, research, iterations, then results and next steps.

Other product designers' case studies couldn't be read: [Simon Pan](https://simonpan.com)'s needs a login, [Aleksi Tappura](https://www.aleksitappura.com/)'s portfolio is "available on request", and the [uxfol.io](https://blog.uxfol.io/product-designer-case-studies/) examples render only in the browser. Senior designers gating their case studies is common, and a choice vin.ski doesn't make.

**Others:** ✅ yes · ◐ partly · ✖ no · ? not visible on the page checked

**vin.ski:** ✅ in content (Spotcraft) · 💻 in code (`features/profile/data.ts`), not content · ◐ partly · ➕ accepted, comes in step 1 · 💡 candidate, see [what this means for step 1](#what-this-means-for-step-1) · ✖ not planned

## Content types

What each site publishes. The designers sell (packages, courses), so they add proof: testimonials, logos, results. The engineers let the work and the writing speak, with one line per project.

| Content type | vin.ski | Goldman | Femke | Kowalski | Freiberg | Lovin | Robinson |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Case studies (long project pages) | ✅ work projects | ✅ seven | ✖ | ✖ | ? visual, no write-ups visible | ✖ | ✖ |
| Side projects | ✅ play projects | ✖ | ✖ | ✅ libraries and courses | ✅ | ✅ fourteen | ✖ |
| Writing | ✅ posts | ✅ on Medium | ◐ newsletter | ✅ | ◐ field notes | ✅ | ✅ |
| Notes, TIL | ✖ | ✖ | ✖ | ✖ | ✅ field notes | ✅ TIL | ✅ topic notes |
| Talks, webinars | ✖ | ✅ two webinars | ✅ YouTube, live events | ✖ | ✖ | ◐ speaking, under About | ✖ |
| Experiments, craft | ✖ | ✖ | ✖ | ✖ | ✅ Craft | ✖ | ✖ |
| Courses, products for sale | ✖ | ◐ a free guide | ✅ | ✅ two courses | ✖ | ✖ | ✖ |
| Testimonials | 💡 | ✅ three | ✅ four | ✖ | ✖ | ✖ | ✖ |
| Client or employer logos | ✖ | ✅ twelve | ✅ "Designed at these companies" | ✖ | ✖ | ✖ | ✖ |
| Services | 💻 💡 | ✅ packages | ✅ coaching | ✖ | ✖ | ✖ | ✖ |
| Rates | ✖ on purpose | ✅ | ✅ | ✖ | ✖ | ✖ | ✖ |
| About, bio | 💻 | ✅ | ✅ | ✅ "Today" | ✅ one line | ✅ | ✅ |
| Work history | 💻 💡 experience | ◐ in the bio | ◐ company list | ◐ in the bio | ✖ | ✅ under About | ◐ in the bio |
| Availability | 💻 in the hero | ◐ the booking button | ✖ | ✅ "on a break" | ✖ | ✖ | ✖ |
| Contact, booking | 💻 email and a booking link | ✅ discovery call | ✅ coaching | ◐ social links | ✅ email | ◐ social links | ✅ email |
| Free resources, newsletter | ✖ | ✅ a guide | ✅ newsletter | ✖ | ✖ | ◐ a news digest | ✖ |
| Stack, uses | ✖ | ✖ | ✖ | ✖ | ✖ | ✅ | ✖ |

**On purpose:**
- **No rates or packages:** vin.ski pitches full-time roles and product work, not fixed packages (see its services).
- **No notes, talks, craft or a newsletter for now:** each is a new folder in Spotcraft when there's something to put in it. Nothing here needs them for the demo.

## Case study details

What a project page states up front: the details that front matter holds. Only the designers and the guides have case studies; the engineers' projects are a name and one line, so they aren't compared here.

| Detail | vin.ski work | vin.ski play | Goldman | Cold read | Guides |
| --- | --- | --- | --- | --- | --- |
| Title | ✅ | ✅ | ✅ | ✅ | ✅ |
| A result as the headline | ◐ `impact`, not the headline | ✖ | ✅ "The result:" | ✖ starts with the constraint | ✅ lead with impact |
| Summary, TL;DR | ✅ `summary`, `tldr` | ✅ `summary`, `tldr` | ✅ | ✅ | ✅ |
| Client or company | ✅ `company` | ✖ his own | ✅ in the text | ? | ◐ |
| Role | ✅ `role` | ✖ always his | ✅ "Fractional Product Designer" | ? | ✅ |
| Timeframe | ✅ `years` | ✅ `year` | ✅ "~6 weeks" | ? | ◐ |
| Team | ➕ `team` | ✖ | ✅ three roles | ? | ◐ |
| Reach or scale | ➕ `reach` | ✖ | ✅ "~50k users" | ? | ◐ |
| Industry, platform | ◐ `kind` and `tags` | ◐ `kind` and `tags` | ✅ as tags | ? | ◐ |
| Tags | ✅ | ✅ | ✅ | ? | ? |
| Stack | ✅ `stack` | ✅ `stack` | ✖ | ✖ | ✖ |
| Cover image | ✅ `image` | ✅ `image` | ✅ | ? | ✅ |
| Links (product, demo, code) | ✅ `productUrl`, `demoUrl`, `repoUrl` | ✅ `demoUrl` (required), `repoUrl` | ✖ | ✖ | ✖ |
| Status (live, in progress) | ✖ | ✅ `status` | ✖ | ✖ | ✖ |

## Case study sections

What the body tells, in order. vin.ski's sections are conventions in the Markdown today (`##` headings), not checked: a schema types front matter, not the body.

| Section | vin.ski work | vin.ski play | Goldman | Cold read | Guides |
| --- | --- | --- | --- | --- | --- |
| The problem, as a constraint | ◐ "Context" | ◐ "Why I built it" | ◐ "The starting point" | ✅ "Problem", the constraint first | ✅ |
| Your role | ✅ "My role" | ✖ | ✅ in the details block | ◐ | ✅ |
| Process, briefly | ✖ | ◐ "Architecture" | ✅ audit, workshops, personas | ✅ under 200 words | ✅ research and iterations |
| Decisions, with the options rejected | ➕ a "Decisions" section | ◐ "Key decisions", without alternatives | ◐ decisions as headings, without alternatives | ✅ the part that earns callbacks | ◐ |
| Results, and how they were measured | ◐ the `impact` line, ➕ `results` with `measured` | ✖ | ◐ "Projected Results", not measured | ✅ what changed, and how it was measured | ✅ |
| Visuals | ◐ a cover, images in the body | ✅ a diagram | ✅ screens, audit, style guide | ? | ✅ iterations |
| Testimonial | 💡 | ✖ | ✖ on the case study, ✅ on the home page | ✖ | ✖ |
| Reflection, what's next | ✖ | ✅ "What I'd do next" | ◐ "What I'd bring to your team" | ✖ | ✅ next steps |
| Next case study | ✅ "Next" | ✅ "Next" | ✅ "Keep reading", two | ? | ? |
| A call to action | ◐ the footer | ◐ the footer | ✅ "Book a free discovery call", twice | ? | ? |
| Length | ? to measure | ? to measure | long | ✅ about 1,200 words | ◐ |

## Listing

What a project card shows on the home page.

| Card shows | vin.ski | Goldman | Kowalski | Lovin |
| --- | --- | --- | --- | --- |
| Image | ✅ | ✅ | ✖ | ✖ |
| Title | ✅ | ✅ as a result | ✅ | ✅ |
| One line | ✅ `summary` | ✅ an outcome | ✅ | ✅ |
| Company, year | ✅ work: `company`, `years`; play: `year` | ✖ | ✖ | ✖ |
| Kind, stack | ✅ `kind`, `stack` | ✖ | ✖ | ✖ |
| A result | ✅ `impact` | ✅ in the title | ✖ | ✖ |

## Pages and trust

- **Home page order.** Goldman alternates proof and work: a testimonial, then the case study it's about, three times, then before-and-afters. vin.ski runs hero, projects, services, experience, process, blog and contact. The engineers keep to a bio and two lists.
- **Work index and filters:** none of them filter. vin.ski's projects all fit on the home page.
- **Trust signals:** Goldman and Femke use testimonials and logos; Goldman also puts results on cards. vin.ski has results (`impact`) on cards and nothing else yet.

## What this means for step 1

Each candidate above, with a recommendation. Accepted ones (➕) go into step 1's schemas; rejected ones stay here, marked ✖ with the reason.

1. **Decisions with the options rejected:** accepted (2026-11-03). Make "Decisions" a section every work project has, like play's "Key decisions", and write each one with what was rejected and why (the cold read's strongest point). It's a writing convention in the body, so it needs no schema field; the content to-do list tracks it.
2. **`team` and `reach` on work projects:** accepted (2026-11-03), both optional. `team` as a short line ("PM, two engineers, a designer"), `reach` as a scale line ("~50k users"). They place the role in context the way Goldman's details block does.
3. **Results with how they were measured:** accepted (2026-11-03), as an optional `results` list on work projects: each item a `label`, a `value` and `measured` (true, or false for projected or estimated). It replaces nothing: `impact` stays the one-line result on the card. Goldman labels hers "projected", and the cold read asks how they were measured, so the flag keeps that honest.
4. **Testimonials:** recommended later, not in the demo. A `testimonials/` folder (quote, name, title, company, and the project it's about) once there are quotes to put in it.
5. **Services and experience as content:** not in the demo. They're in `features/profile/data.ts` today, and moving them is a new folder and schema each. Revisit once the demo is done.

Not candidates: a result as the headline (vin.ski's titles are product names, and `impact` already carries the result), and rates.
