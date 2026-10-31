import type { NextRequest } from "next/server";
import { updateSession } from "@/features/auth/utils/session";
import { isMissingContent, type ContentPaths } from "@/lib/content/paths";

// Every content file's slug and date, inlined by next.config.ts
const contentPaths: ContentPaths = JSON.parse(
  process.env.CONTENT_PATHS ?? "{}",
);

// The auth gate (teaser for guests), plus a real 404 for content that doesn't
// exist or isn't published yet
export async function proxy(request: NextRequest) {
  return updateSession(request, {
    notFound: (pathname) => isMissingContent(contentPaths, pathname),
  });
}

export const config = {
  // Everything except Next.js internals, static files in public/, and the
  // files crawlers and link previews fetch: robots, sitemap, manifest and
  // the generated icons and share images
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|icon|apple-icon|opengraph-image|twitter-image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
