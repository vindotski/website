import { getSession } from "@spotcraft/client";
import { NextResponse, type NextRequest } from "next/server";
import { SIGNED_IN_COOKIE } from "@/lib/signed-in-cookie";

// For proxy.ts. Who's signed in, from Spotcraft's token (checked here, with no
// request to Spotcraft unless it has run out), and the teaser for anyone else.
// Log in at /auth/login, which goes to Spotcraft's sign-in and back

// The signed-in user, for route handlers (current-user.ts). Set by the proxy only
export const USER_HEADER = "x-vinski-user";

const spotcraft = { url: process.env.SPOTCRAFT_URL! };

export async function updateSession(request: NextRequest) {
  const { user, setCookie } = await getSession(
    request.headers.get("cookie"),
    spotcraft,
  );

  // Never trust the header from the browser: replace it every time
  const headers = new Headers(request.headers);
  headers.delete(USER_HEADER);
  if (user) {
    headers.set(USER_HEADER, JSON.stringify({ id: user.id, email: user.email }));
  }

  const { pathname } = request.nextUrl;
  const isAuthRoute = pathname === "/auth" || pathname.startsWith("/auth/");

  // Until launch the public site is the homepage alone. Rewrites, not
  // redirects, so every URL keeps an honest status: 200 for the teaser
  // page at /, 404 for everything else, /teaser itself included
  const response =
    !user && !isAuthRoute
      ? NextResponse.rewrite(
          new URL(pathname === "/" ? "/teaser" : "/_not-public", request.url),
          { request: { headers } },
        )
      : NextResponse.next({ request: { headers } });

  // The marker first: response.cookies rewrites Set-Cookie, which would drop
  // the renewed token appended below
  if (user) {
    response.cookies.set(SIGNED_IN_COOKIE, "1", { path: "/", sameSite: "lax" });
  } else if (request.cookies.has(SIGNED_IN_COOKIE)) {
    response.cookies.delete(SIGNED_IN_COOKIE);
  }
  // A renewed token, or a cleared one once the session has ended
  for (const cookie of setCookie) response.headers.append("set-cookie", cookie);

  // The same URL serves different pages with and without a session, so no
  // CDN or cache may keep one visitor's version for another, or for a crawler
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
