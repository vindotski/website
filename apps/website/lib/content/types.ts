import type { z } from "zod";
import type { CONTENT_TYPES, ContentType } from "@/config/content-types";
import type { projectKind } from "./schemas";

// The three kinds of work, shared by work items, play items and services
export type ProjectType = z.infer<typeof projectKind>;

// A ## heading, for the table of contents. `id` is the heading's id on the page
export type Section = { id: string; title: string };

// A document from Spotcraft, as the schemas describe it, plus its slug, path
// and ## headings
export type Item<T extends ContentType = ContentType> = z.infer<
  (typeof CONTENT_TYPES)[T]["schema"]
> & {
  slug: string;
  // In Spotcraft, e.g. projects/work/huddleos
  path: string;
  sections: Section[];
};

// An item as the site lists it: fields, slug, path and ## sections.
// `published` is false only for the drafts and scheduled items `next dev` shows
export type Entry<T extends ContentType = ContentType> = Item<T> & {
  published: boolean;
};

// Work and play share one type; `category` tells them apart
export type Project = Entry<"projects">;
export type WorkProject = Extract<Project, { category: "work" }>;
export type PlayProject = Extract<Project, { category: "play" }>;

export type Post = Entry<"posts">;
