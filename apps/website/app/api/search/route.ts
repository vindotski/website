import { NextResponse, type NextRequest } from "next/server";
import { CONTENT_TYPES, isContentType } from "@/config/content-types";
import {
  defaultLimit,
  maxLimit,
  maxQueryLength,
  searchContent,
} from "@/features/search/api/search";
import { createClient } from "@/lib/supabase/server";

// Search over the content, by Spotcraft.
//
//   GET /api/search?q=caching&type=posts&limit=5
//
// `type` is optional: one content type, or all. Returns { results: [{ url,
// title, heading, type, snippet, score }] }, best match first, one per page
// section. The search itself is in features/search; this checks access and
// parameters

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
  const type = params.get("type") ?? undefined;
  if (type !== undefined && !isContentType(type)) {
    return badRequest(`type must be one of ${Object.keys(CONTENT_TYPES).join(", ")}`);
  }
  const limit = Number(params.get("limit") ?? defaultLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > maxLimit) {
    return badRequest(`limit must be 1–${maxLimit}`);
  }

  try {
    const results = await searchContent({ query, type, limit });
    return NextResponse.json({ results });
  } catch (error) {
    console.error("search:", error);
    return NextResponse.json({ error: "Search is unavailable" }, { status: 502 });
  }
}
