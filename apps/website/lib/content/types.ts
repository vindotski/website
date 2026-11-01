import type { z } from "zod";
import type { ContentType } from "@/config/content-types";
import type { Item } from "./load";
import type { projectKind } from "./schemas";

// The three kinds of work, shared by work items, play items and services
export type ProjectType = z.infer<typeof projectKind>;

// An item as the site lists it: front matter, slug and ## sections.
// `published` is false only for the drafts and scheduled items `next dev` shows
export type Entry<T extends ContentType = ContentType> = Item<T> & {
  published: boolean;
};

// Work and play share one type; `category` tells them apart
export type Project = Entry<"projects">;
export type WorkProject = Extract<Project, { category: "work" }>;
export type PlayProject = Extract<Project, { category: "play" }>;

export type Post = Entry<"posts">;
