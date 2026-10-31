import "server-only";
import { CONTENT_TYPES, isContentType, type ContentType } from "@/config/content-types";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SearchResult } from "../types";

// Semantic search over the content index: embeds the query with the embed
// Edge Function, matches it with match_documents, and turns rows into one
// result per page section

// Long enough for a question, short enough to keep embedding cheap
export const maxQueryLength = 200;
export const defaultLimit = 5;
export const maxLimit = 10;
// gte-small scores unrelated text around 0.75–0.80 and good matches
// 0.85–0.90, so anything below this is noise
const minSimilarity = 0.82;
const snippetLength = 200;

// The chunk without its "title — heading" line, flattened and cut at a word
function toSnippet(content: string) {
  const body = content.split(/\n{2,}/).slice(1).join(" ");
  const text = body.replace(/[`*_#>]/g, "").replace(/\s+/g, " ").trim();
  if (text.length <= snippetLength) return text;
  return `${text.slice(0, text.lastIndexOf(" ", snippetLength))}…`;
}

type SearchOptions = {
  query: string;
  // A result needs any one of the types and every tag; empty means all
  types: ContentType[];
  tags: string[];
  limit: number;
};

// Throws when the embed function or the database fails
export async function searchContent({
  query,
  types,
  tags,
  limit,
}: SearchOptions): Promise<SearchResult[]> {
  const admin = createAdminClient();
  const { data: embedded, error: embedError } = await admin.functions.invoke<{
    embeddings: number[][];
  }>("embed", { body: { input: [query] } });
  if (embedError || !embedded) {
    throw new Error("embed failed", { cause: embedError });
  }

  // Fetches extra rows: parts of one long section collapse into one result
  const { data: rows, error: matchError } = await admin.rpc("match_documents", {
    query_embedding: JSON.stringify(embedded.embeddings[0]),
    match_count: limit * 3,
    filter_types: types.length > 0 ? types : undefined,
    filter_tags: tags.length > 0 ? tags : undefined,
  });
  if (matchError) {
    throw new Error("match_documents failed", { cause: matchError });
  }

  const seen = new Set<string>();
  const results = rows.flatMap((row) => {
    // A type removed from the config, until the next sync deletes its rows
    if (row.similarity < minSimilarity || !isContentType(row.type)) return [];
    // "posts/slug#setup:2" → "#setup"; the summary chunk links to the page
    const anchor = row.id.split("#")[1]?.replace(/:\d+$/, "");
    const hash = anchor && anchor !== "tldr" ? `#${anchor}` : "";
    const url = `${CONTENT_TYPES[row.type].route}/${row.slug}${hash}`;
    if (seen.has(url)) return [];
    seen.add(url);
    return [
      {
        url,
        title: row.title,
        // Null for the summary chunk, though the generated type says string
        heading: (row.heading as string | null) ?? null,
        type: CONTENT_TYPES[row.type].label,
        snippet: toSnippet(row.content),
        similarity: Number(row.similarity.toFixed(3)),
      },
    ];
  });

  return results.slice(0, limit);
}
