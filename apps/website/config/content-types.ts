import { postSchema, projectSchema } from "../lib/content/schemas";

// Every kind of content; nothing else should list the types. `folders` are
// where its documents are in Spotcraft (content/ in this repository).
// `sortBy` sets the display order, which "Next" follows: by the `order`
// field, lowest first, or by date, newest first
export const CONTENT_TYPES = {
  projects: {
    label: "Projects",
    route: "/projects",
    folders: ["projects/work", "projects/play"],
    schema: projectSchema,
    sortBy: "order",
  },
  posts: {
    label: "Blog",
    route: "/blog",
    folders: ["posts"],
    schema: postSchema,
    sortBy: "date",
  },
} as const;

export type ContentType = keyof typeof CONTENT_TYPES;

export function isContentType(value: string): value is ContentType {
  return Object.hasOwn(CONTENT_TYPES, value);
}
