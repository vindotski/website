---
title: Sokobanko
date: 2026-10-30
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
  src: /images/projects/sokobanko.svg
  alt: Sokobanko level in play
repoUrl: https://github.com/example/sokoban
year: 2026
status: Live
demoUrl: https://example.com/sokoban
---
## Why I built it

To build a complete game end to end: rendering, game logic, and a backend for players and progress.

## Architecture

A Nuxt app renders the game with Pixi. Game logic is plain TypeScript, separate from rendering. Supabase stores players and their progress.

![Sokobanko architecture](/images/projects/sokobanko-diagram.svg)

## Key decisions

### Game logic separate from rendering

The rules run without Pixi, so they're easy to test and reason about.

### Supabase for the backend

Auth and storage out of the box, so the time went into the game.

## What I'd do next

A level editor, and sharing levels with other players.
