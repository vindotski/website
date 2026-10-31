import { playSchema, postSchema, workSchema } from "../lib/content/schemas";

// Every kind of MDX content. The key is the folder under content/ and the
// value of `type` in the search index; nothing else should list the types.
// `sortBy` sets the display order, which "Next" follows: by `order` front
// matter, lowest first, or by date, newest first
export const CONTENT_TYPES = {
  work: { label: "Work", route: "/work", schema: workSchema, sortBy: "order" },
  play: { label: "Play", route: "/play", schema: playSchema, sortBy: "order" },
  posts: { label: "Blog", route: "/blog", schema: postSchema, sortBy: "date" },
} as const;

export type ContentType = keyof typeof CONTENT_TYPES;

export function isContentType(value: string): value is ContentType {
  return Object.hasOwn(CONTENT_TYPES, value);
}
