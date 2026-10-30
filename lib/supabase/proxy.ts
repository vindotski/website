import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// For proxy.ts. Refreshes the auth session on every request and sends anyone
// without one to the login page
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
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.search = "";
    // Sends them back to where they were headed once they log in
    if (pathname !== "/") {
      url.searchParams.set("redirectTo", pathname + request.nextUrl.search);
    }
    const redirect = NextResponse.redirect(url);
    // Carries over cookies cleared or refreshed by getClaims()
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    response.headers.forEach((value, key) => {
      if (["cache-control", "expires", "pragma"].includes(key)) {
        redirect.headers.set(key, value);
      }
    });
    return redirect;
  }

  return response;
}
