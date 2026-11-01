import "server-only";
import { CONTENT_TYPES, isContentType, type ContentType } from "@/config/content-types";
import { cms } from "@/lib/cms";
import { getItems } from "@/lib/content/api";
import type { SearchResult } from "../types";

// Search over the content, by Spotcraft: by words, and by meaning too when
// Spotcraft has an OpenAI key. Turns its results into one per page section

// Long enough for a question
export const maxQueryLength = 200;
export const defaultLimit = 5;
// Spotcraft's own maximum
export const maxLimit = 10;

type SearchOptions = {
  query: string;
  // One type, or all of them
  type?: ContentType;
  limit: number;
};

// Throws when Spotcraft fails
export async function searchContent({
  query,
  type,
  limit,
}: SearchOptions): Promise<SearchResult[]> {
  // Spotcraft returns a document and its matching sections separately, and
  // they can share a URL, so ask for more than needed
  const { results } = await cms.search({
    q: query,
    folder: type,
    limit: maxLimit,
  });

  // Spotcraft has no scheduling, so it finds future-dated items too. Only
  // what the site shows is a result; its links would 404 otherwise
  const types = type ? [type] : (Object.keys(CONTENT_TYPES) as ContentType[]);
  const shown = new Set<string>();
  for (const t of types) {
    for (const item of await getItems(t)) shown.add(item.path);
  }

  const seen = new Set<string>();
  const found = results.flatMap((result) => {
    if (!isContentType(result.folder) || !shown.has(result.path)) return [];
    const slug = result.path.split("/").at(-1);
    // A section links to its heading; the document itself to the page
    const hash = result.anchor ? `#${result.anchor}` : "";
    const url = `${CONTENT_TYPES[result.folder].route}/${slug}${hash}`;
    if (seen.has(url)) return [];
    seen.add(url);
    return [
      {
        url,
        title: result.title,
        heading: result.heading ?? null,
        type: CONTENT_TYPES[result.folder].label,
        snippet: result.snippet,
        score: Number(result.score.toFixed(3)),
      },
    ];
  });

  return found.slice(0, limit);
}
