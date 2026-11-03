---
title: Building a site with an AI pair, one commit at a time
date: 2026-11-24
tags:
  - ai
  - claudecode
  - workflow
tldr: I built this site with Claude Code writing the code and me reviewing and committing every small step. Keeping the steps small kept me in control.
---
## The question

AI coding agents can write a lot of code quickly. The risk is ending up with a project you didn't really decide on, in a history you can't read.

So I set myself a question for this site: can I work with an AI agent and still own every decision and every line in the history?

## Setup

I used Claude Code in my editor, with a few ground rules from day one:

- **It never commits.** I review every change and make every commit myself.
- **One small unit at a time.** One section, one rename, one refactor. Then stop.
- **It suggests the commit message**, following Conventional Commits, and I decide.
- **Decisions come as options.** For anything open, it lays out two to four options with a recommendation, and I choose.

It also kept notes between sessions: who the site is for, the positioning, the decisions we'd made. That meant I didn't have to repeat the context every time.

## What I tried

A typical step went like this:

1. I describe what I want, sometimes loosely.
2. For anything with real choices, it plans first: options, a recommendation, the small units it would split the work into.
3. I pick, or push back.
4. It writes one unit, then runs the build and the linter.
5. It tells me what changed and suggests a commit message.
6. I review, commit, and say "done".

I didn't always take the recommendation. I picked a different headline. I put Samples in a different place, then later reordered the whole page. I kept a header link for Process when it suggested leaving it out. For sample pages, it suggested structuring them by my process steps, and I chose a plain technical write-up instead. The blog changed shape twice before it settled, both times because I changed my mind.

Things also went wrong, which was useful:

- **The build broke** on the copyright year in the footer. That turned into [its own post](/blog/new-date-broke-my-build).
- **A check came back empty** because a test server from an earlier step was still running in the background, serving an old build. It found the leftover process and stopped it.
- **A file rename was staged in git** without me asking. Harmless, but it's my history, so I said so.
- **A type check failed** after a route changed, because Next.js's generated types were out of date. Running the build first fixed it.

## Results

The site went from an empty folder to wireframes, typed content and real pages in under 60 small commits. Every one of them I reviewed and wrote myself.

Every structural decision is written down where it was made: in a plan, in the commit, or in the notes. When I came back to something, I could see why it was that way.

## Takeaways

Small steps are what make the review real. A change I can read in a minute is a change I actually read. A change that touches twenty files is one I skim.

The agent is good at the work between decisions: the plumbing, the checks, keeping things consistent. The decisions themselves were still mine, and I needed to know when to say "no, do it this way".

Next time I'd give it slightly bigger steps for purely mechanical work, and keep the small steps for anything that changes what the site says or how it's structured.
