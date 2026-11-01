import { NextResponse, type NextRequest } from "next/server";
import { CONTENT_TYPES, isContentType } from "@/config/content-types";
import {
  defaultLimit,
  maxLimit,
  maxQueryLength,
  searchContent,
} from "@/features/search/api/search";
import { createClient } from "@/lib/supabase/server";

// Semantic search over the content index.
//
//   GET /api/search?q=caching&type=posts&tag=nextjs&limit=5
//
// `type` and `tag` may repeat. A result needs every tag given, and any one of
// the types. Returns { results: [{ url, title, heading, type, snippet,
// similarity }] }, best match first, one per page section. The search itself
// is in features/search; this checks access and parameters

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
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

  try {
    const results = await searchContent({ query, types, tags, limit });
    return NextResponse.json({ results });
  } catch (error) {
    console.error("search:", error);
    return NextResponse.json({ error: "Search is unavailable" }, { status: 502 });
  }
}
