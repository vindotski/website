---
id: a821b77c-016d-55fc-89c3-d8bf19f9efd1
title: Strongfives
status: published
published_at: "2026-10-30T00:00:00.000Z"
tags:
  - react-native
tldr: A StrongLifts-style 5×5 strength tracker in React Native, with the workout logic kept apart from the screens and progress saved after every set.
summary: Five by five strength training.
order: 5
kind: Fullstack
stack:
  - React Native
image:
  src: strongfives.svg
  alt: Strongfives workout screen
year: 2026
stage: In progress
demo_url: https://example.com/strongfives
---
## Why I built it

A StrongLifts-style 5×5 tracker of my own: a simple workout plan, logged set by set, with the weights going up over time.

## Architecture

A React Native app. Workout logic, the sets, reps and next weights, sits apart from the screens, and progress is saved after every set.

![Strongfives architecture](strongfives-diagram.svg)

## Key decisions

### Logic apart from the screens

The rules for sets and weight increases run without the UI, so they're easy to test.

## What I'd do next

Charts for progress over time, and more programs than 5×5.
