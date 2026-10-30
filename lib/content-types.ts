import { playSchema, postSchema, workSchema } from "./content/schemas";

// Every kind of MDX content. The key is the folder under content/ and the
// value of `type` in the search index; nothing else should list the types
export const CONTENT_TYPES = {
  work: { label: "Work", route: "/work", schema: workSchema },
  play: { label: "Play", route: "/play", schema: playSchema },
  posts: { label: "Blog", route: "/blog", schema: postSchema },
} as const;

export type ContentType = keyof typeof CONTENT_TYPES;

export function isContentType(value: string): value is ContentType {
  return Object.hasOwn(CONTENT_TYPES, value);
}
