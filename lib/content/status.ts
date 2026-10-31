import { CONTENT_TYPES, type ContentType } from "../../config/content-types";
import type { ContentPaths } from "./paths";

// The content item a URL points at, from the inlined CONTENT_PATHS. Free of
// node:fs, unlike paths.ts, so the browser can use it too. `date` is null for
// a draft and undefined when no file has that slug
export function contentAt(paths: ContentPaths, pathname: string) {
  for (const [type, { route }] of Object.entries(CONTENT_TYPES)) {
    if (!pathname.startsWith(`${route}/`)) continue;
    const slug = pathname.slice(route.length + 1);
    return {
      type: type as ContentType,
      slug,
      date: paths[type as ContentType]?.[slug],
    };
  }
  return null;
}
