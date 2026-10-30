import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// For proxy.ts. Refreshes the auth session on every request and shows anyone
// without one the teaser page. Log in at /auth/login to see the site
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          // Server Components read the refreshed token from the request,
          // the browser from the response
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          // Keeps CDNs from serving one user's session to another
          Object.entries(headers).forEach(([key, value]) =>
            response.headers.set(key, value),
          );
        },
      },
    },
  );

  // Verifies the token and refreshes it if expired. Unlike getSession(),
  // safe to trust on the server
  const { data } = await supabase.auth.getClaims();

  const { pathname } = request.nextUrl;
  const isAuthRoute = pathname === "/auth" || pathname.startsWith("/auth/");

  // The same URL serves different pages with and without a session, so no
  // CDN or cache may keep one visitor's version for another, or for a crawler
  const guarded = (next: NextResponse) => {
    // Carries over cookies cleared or refreshed by getClaims()
    if (next !== response) {
      response.cookies.getAll().forEach((cookie) => next.cookies.set(cookie));
    }
    next.headers.set("Cache-Control", "private, no-store");
    return next;
  };

  if (!data?.claims && !isAuthRoute) {
    // Until launch the public site is the homepage alone. Rewrites, not
    // redirects, so every URL keeps an honest status: 200 for the teaser
    // page at /, 404 for everything else, /teaser itself included
    const target = pathname === "/" ? "/teaser" : "/_not-public";
    return guarded(NextResponse.rewrite(new URL(target, request.url)));
  }

  return guarded(response);
}
