import type { NextRequest } from "next/server";
import { updateSession } from "@/features/auth/utils/session";

// The auth gate: the teaser for guests. Content that doesn't exist or isn't
// published yet is the [slug] pages' notFound()
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Everything except Next.js internals, static files in public/, the files
  // crawlers and link previews fetch (robots, sitemap, manifest and the
  // generated icons and share images), and Spotcraft's webhook, which has no
  // session and checks its own signature
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|icon|apple-icon|opengraph-image|twitter-image|api/spotcraft$|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
