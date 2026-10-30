import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { CONTENT_TYPES, type ContentType } from "../content-types";
import { isPublished, showDrafts, todayUtc } from "./publish";

// Lets the proxy answer a content URL that doesn't exist or isn't public yet
// with a real 404. A page that isn't prebuilt starts streaming before it can
// call notFound(), which fixes its status at 200. Kept free of Next.js imports
// and ESM-only packages, since next.config.ts loads it

// Every file's date by type and slug; null for a draft
export type ContentPaths = Partial<
  Record<ContentType, Record<string, string | null>>
>;

const frontmatterPattern = /^---\r?\n([\s\S]*?)\r?\n---/;

// Read once by next.config.ts and inlined as CONTENT_PATHS. Only reads the
// date; the page loader validates the rest of the front matter
export function readContentPaths(): ContentPaths {
  const paths: ContentPaths = {};
  for (const type of Object.keys(CONTENT_TYPES) as ContentType[]) {
    const dir = path.join(process.cwd(), "content", type);
    let files: string[];
    try {
      files = readdirSync(dir).filter((file) => file.endsWith(".mdx"));
    } catch {
      continue;
    }
    paths[type] = Object.fromEntries(
      files.map((file) => {
        const raw = readFileSync(path.join(dir, file), "utf8");
        const yaml = raw.match(frontmatterPattern)?.[1] ?? "";
        const { date } = (parseYaml(yaml) ?? {}) as { date?: unknown };
        const slug = file.replace(/\.mdx$/, "");
        return [slug, typeof date === "string" ? date : null];
      }),
    );
  }
  return paths;
}

// True for a content URL with no file behind it, or one that isn't published.
// Off in `next dev`, which shows drafts and would miss files added after it
// started; the page's own notFound() covers it there
export function isMissingContent(paths: ContentPaths, pathname: string) {
  if (showDrafts) return false;
  for (const [type, { route }] of Object.entries(CONTENT_TYPES)) {
    if (!pathname.startsWith(`${route}/`)) continue;
    const date = paths[type as ContentType]?.[pathname.slice(route.length + 1)];
    if (date === undefined) return true;
    return !isPublished(date ?? undefined, todayUtc());
  }
  return false;
}
