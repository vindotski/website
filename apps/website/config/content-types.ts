import { postSchema, projectSchema } from "../lib/content/schemas";

// Every kind of content. The key is the folder in Spotcraft; nothing else
// should list the types. `sortBy` sets the display order, which "Next"
// follows: by the `order` field, lowest first, or by date, newest first
export const CONTENT_TYPES = {
  projects: {
    label: "Projects",
    route: "/projects",
    schema: projectSchema,
    sortBy: "order",
  },
  posts: { label: "Blog", route: "/blog", schema: postSchema, sortBy: "date" },
} as const;

export type ContentType = keyof typeof CONTENT_TYPES;

export function isContentType(value: string): value is ContentType {
  return Object.hasOwn(CONTENT_TYPES, value);
}
