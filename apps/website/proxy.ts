import { NextResponse, type NextRequest } from "next/server";

// Until launch, production is the teaser alone. Rewrites, not redirects, so
// every URL keeps an honest status: 200 for the teaser page at /, 404 for
// everything else, /teaser itself included. Local development and Vercel
// previews (behind Vercel's Deployment Protection) show the full site.
// Content that doesn't exist or isn't published yet is the [slug] pages'
// notFound()
const teaserOnly = process.env.VERCEL_ENV === "production";

export function proxy(request: NextRequest) {
  if (!teaserOnly) return NextResponse.next();
  const { pathname } = request.nextUrl;
  return NextResponse.rewrite(
    new URL(pathname === "/" ? "/teaser" : "/_not-public", request.url),
  );
}

export const config = {
  // Everything except Next.js internals, static files in public/, the files
  // crawlers and link previews fetch (robots, sitemap, manifest and the
  // generated icons and share images), and Spotcraft's webhook, which checks
  // its own signature
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|icon|apple-icon|opengraph-image|twitter-image|api/spotcraft$|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
