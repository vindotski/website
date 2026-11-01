import { NextResponse, type NextRequest } from "next/server";
import { CONTENT_TYPES, type ContentType } from "@/config/content-types";
import type { ContentStatus } from "@/features/admin/types";
import { getItem } from "@/lib/content/api";
import { createClient } from "@/lib/supabase/server";

// The content item behind a page, for the admin toolbar: its Spotcraft path
// and date (null for a draft), or null when the page is no project or post,
// or none that's shown.
//
//   GET /api/admin/content-status?pathname=/projects/huddleos
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: session } = await supabase.auth.getClaims();
  if (!session?.claims) {
    return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  }

  const pathname = request.nextUrl.searchParams.get("pathname") ?? "";
  let item: ContentStatus = null;
  for (const [type, { route }] of Object.entries(CONTENT_TYPES)) {
    if (!pathname.startsWith(`${route}/`)) continue;
    const found = await getItem(type as ContentType, pathname.slice(route.length + 1));
    if (found) item = { path: found.path, date: found.date ?? null };
  }
  return NextResponse.json({ item });
}
