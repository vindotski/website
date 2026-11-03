---
id: 042c0c86-26a2-51dc-b2f7-177ce65ef8e0
title: VinUI
status: published
published_at: "2026-10-30T00:00:00.000Z"
tags:
  - react
  - vue
  - react-native
tldr: One component API that runs in React, Vue and React Native, with a thin layer per framework, so a component is written once instead of kept in step across three libraries.
summary: One component API, cross-framework and cross-platform.
order: 4
kind: Product
stack:
  - React
  - Vue
  - React Native
image:
  src: vinui.svg
  alt: One button rendered in React, Vue and React Native
year: 2026
stage: Live
demo_url: https://vinui.dev
---
## Why I built it

To write a component once and use it in React, Vue and React Native, instead of keeping three libraries in step.

## Architecture

One component API, with a thin layer per framework that maps it onto React, Vue and React Native.

![VinUI architecture](vinui-diagram.svg)

## Key decisions

### One API for every framework

The same props and names everywhere, so moving between React, Vue and Native costs nothing.

## What I'd do next

More components, and docs for each framework.
