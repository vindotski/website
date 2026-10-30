import { z } from "zod";

// Front matter of the MDX files in content/<type>/. The folder decides which
// schema applies, so there is no `type` field. Prose lives in the body, as ##
// sections. Kept free of Next.js imports so scripts can use it too

const image = z.object({ src: z.string(), alt: z.string() });

// The three kinds of work, shared by work items, play items and services
export const projectKind = z.enum(["Frontend", "Fullstack", "Product"]);

const core = z.object({
  title: z.string(),
  // ISO date, e.g. "2026-11-03". None = draft, in the future = scheduled
  date: z.iso.date().optional(),
  // Without "#"
  tags: z.array(z.string()),
  // One or two sentences: the meta description and the search summary
  tldr: z.string(),
  // Display order where items aren't sorted by date; lowest first
  order: z.number().int().optional(),
  repoUrl: z.url().optional(),
  demoUrl: z.url().optional(),
});

export const workSchema = core.extend({
  summary: z.string(),
  company: z.string(),
  // Job title, shown on the work page; `kind` is the kind of work, on the card
  role: z.string(),
  kind: projectKind,
  years: z.object({
    start: z.number().int(),
    // Omitted while ongoing ("2021–present")
    end: z.number().int().optional(),
  }),
  stack: z.array(z.string()),
  productUrl: z.url().optional(),
  image,
  impact: z.string(),
});

export const playSchema = core.extend({
  summary: z.string(),
  kind: projectKind,
  stack: z.array(z.string()),
  year: z.number().int(),
  status: z.enum(["Live", "In progress", "Archived"]),
  demoUrl: z.url(),
  image,
});

export const postSchema = core;
