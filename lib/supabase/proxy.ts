import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// For proxy.ts. Refreshes the auth session on every request and shows anyone
// without one the coming-soon page. Log in at /auth/login to see the site
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

  if (!data?.claims && !isAuthRoute) {
    // A rewrite, so visitors keep the URL they asked for
    const comingSoon = NextResponse.rewrite(
      new URL("/coming-soon", request.url),
    );
    // Carries over cookies cleared or refreshed by getClaims()
    response.cookies
      .getAll()
      .forEach((cookie) => comingSoon.cookies.set(cookie));
    response.headers.forEach((value, key) => {
      if (["cache-control", "expires", "pragma"].includes(key)) {
        comingSoon.headers.set(key, value);
      }
    });
    return comingSoon;
  }

  return response;
}
