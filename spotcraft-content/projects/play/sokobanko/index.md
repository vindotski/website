---
id: 2af36d45-3e46-53f8-bc47-7ea60a0ad84e
title: Sokobanko
status: published
published_at: "2026-10-30T00:00:00.000Z"
tags:
  - typescript
  - vue
  - nuxt
  - pixi
  - supabase
tldr: "A classic Sokoban puzzle game rebuilt end to end: Nuxt and Pixi for rendering, game rules in plain TypeScript, and Supabase for players and progress."
summary: A classic puzzle game, rebuilt from scratch.
order: 7
kind: Fullstack
stack:
  - TypeScript
  - Vue
  - Nuxt
  - Pixi
  - Supabase
image:
  src: sokobanko.svg
  alt: Sokobanko level in play
repo_url: https://github.com/example/sokoban
year: 2026
stage: Live
demo_url: https://example.com/sokoban
---
## Why I built it

To build a complete game end to end: rendering, game logic, and a backend for players and progress.

## Architecture

A Nuxt app renders the game with Pixi. Game logic is plain TypeScript, separate from rendering. Supabase stores players and their progress.

![Sokobanko architecture](sokobanko-diagram.svg)

## Key decisions

### Game logic separate from rendering

The rules run without Pixi, so they're easy to test and reason about.

### Supabase for the backend

Auth and storage out of the box, so the time went into the game.

## What I'd do next

A level editor, and sharing levels with other players.
