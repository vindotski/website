import { NextResponse, type NextRequest } from "next/server";
import { CONTENT_TYPES, isContentType } from "@/config/content-types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Semantic search over the content index.
//
//   GET /api/search?q=caching&type=posts&tag=nextjs&limit=5
//
// `type` and `tag` may repeat. A result needs every tag given, and any one of
// the types. Returns { results: [{ url, title, heading, type, snippet,
// similarity }] }, best match first, one per page section

// Long enough for a question, short enough to keep embedding cheap
const maxQueryLength = 200;
const defaultLimit = 5;
const maxLimit = 10;
// gte-small scores unrelated text around 0.75–0.80 and good matches
// 0.85–0.90, so anything below this is noise
const minSimilarity = 0.82;
const snippetLength = 200;

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

// The chunk without its "title — heading" line, flattened and cut at a word
function toSnippet(content: string) {
  const body = content.split(/\n{2,}/).slice(1).join(" ");
  const text = body.replace(/[`*_#>]/g, "").replace(/\s+/g, " ").trim();
  if (text.length <= snippetLength) return text;
  return `${text.slice(0, text.lastIndexOf(" ", snippetLength))}…`;
}

export async function GET(request: NextRequest) {
  // Until launch, search is for signed-in users only, like every page but /.
  // The proxy already hides it; this keeps it closed if the proxy changes
  const supabase = await createClient();
  const { data: session } = await supabase.auth.getClaims();
  if (!session?.claims) {
    return NextResponse.json({ error: "Sign in to search" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const query = params.get("q")?.trim() ?? "";
  if (query.length < 2 || query.length > maxQueryLength) {
    return badRequest(`q must be 2–${maxQueryLength} characters`);
  }
  const types = params.getAll("type");
  if (!types.every(isContentType)) {
    return badRequest(`type must be one of ${Object.keys(CONTENT_TYPES).join(", ")}`);
  }
  const tags = params.getAll("tag");
  const limit = Number(params.get("limit") ?? defaultLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > maxLimit) {
    return badRequest(`limit must be 1–${maxLimit}`);
  }

  const admin = createAdminClient();
  const { data: embedded, error: embedError } = await admin.functions.invoke<{
    embeddings: number[][];
  }>("embed", { body: { input: [query] } });
  if (embedError || !embedded) {
    console.error("search: embed failed", embedError);
    return NextResponse.json({ error: "Search is unavailable" }, { status: 502 });
  }

  // Fetches extra rows: parts of one long section collapse into one result
  const { data: rows, error: matchError } = await admin.rpc("match_documents", {
    query_embedding: JSON.stringify(embedded.embeddings[0]),
    match_count: limit * 3,
    filter_types: types.length > 0 ? types : undefined,
    filter_tags: tags.length > 0 ? tags : undefined,
  });
  if (matchError) {
    console.error("search: match_documents failed", matchError);
    return NextResponse.json({ error: "Search is unavailable" }, { status: 502 });
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

  return NextResponse.json({ results: results.slice(0, limit) });
}
