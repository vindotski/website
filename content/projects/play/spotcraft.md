---
title: Spotcraft
date: 2026-10-30
tags:
  - react
  - tanstack
tldr: A data-heavy dashboard built to see how far TanStack Router, Query and Table go together, with server state cached in one place and headless tables.
summary: A data dashboard that stays fast.
order: 6
kind: Fullstack
stack:
  - React
  - TanStack
image:
  src: /images/projects/spotcraft.svg
  alt: Spotcraft overview
repoUrl: https://github.com/example/spotcraft
year: 2026
status: Live
demoUrl: https://example.com/spotcraft
---
## Why I built it

To see how far TanStack's query, table and router libraries go together on a data-heavy screen.

## Architecture

A React app with TanStack Router for routing, TanStack Query for server state and TanStack Table for the data grids.

![Spotcraft architecture](/images/projects/spotcraft-diagram.svg)

## Key decisions

### Server state in TanStack Query

Caching and refetching handled in one place, instead of a global store.

### Headless tables

TanStack Table for behaviour, my own markup for the look.

## What I'd do next

Virtualised rows for very large tables, and saved views.
