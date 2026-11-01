# Moving vin.ski's sign-in from Supabase Auth to Spotcraft

vin.ski's content already lives in Spotcraft. This guide moves its **sign-in** there too, so
Supabase can go. It answers `SPOTCRAFT_CLIENT_AUTH_REQUIREMENTS.md`: Spotcraft now has everything
that file asked for (on its `dev` branch, 2026-11-01).

**After this guide:**
- You sign in once, on the Spotcraft dashboard. Locally that's `localhost:3000`; in production,
  `cms.vin.ski`.
- vin.ski's proxy knows who you are on every request. It checks a signed token itself, with no
  request to Spotcraft per page.
- The gate, the admin toolbar, the signed-in-only API routes and the analytics opt-out all work as
  before.
- `lib/supabase/`, the login form, Turnstile on vin.ski, the `supabase/` folder and the hosted
  Supabase project are gone.

Do the steps in order. The site is broken between steps 3 and 6 (the gate and the login change
together), so do those in one sitting.

---

## The answers to the open questions

| Question | Answer |
| --- | --- |
| **Which frontend:** does a token name one site, or list them? | It **lists** them. The token's `sites` claim holds the slugs of every site you're a member of, and `role` is `"superadmin"` or `null`. vin.ski accepts only members of `vinski`, and superadmins. `@spotcraft/client` reads the slug from `SPOTCRAFT_URL` (`…/vinski`). The audience is Spotcraft's origin, not a site. |
| **Redirect allowlist:** `site_url` or an env var? | **`site_url`.** Login and logout may send you to any URL whose exact origin is one of the sites' `site_url` origins. For vin.ski that's `https://www.vin.ski`, and nothing else (not `https://vin.ski`). Locally, set the site URL to `http://localhost:3001` (step 2). Other URLs land on the dashboard instead. |
| **Mail links:** can reset and invite emails return to the frontend? | **No,** they stay on the dashboard. After a reset you're signed in there; open vin.ski and you're signed in too. |

## What Spotcraft now provides

- **The token:** `spotcraft_token` is an httpOnly cookie holding an ES256 JWT that lasts 10
  minutes. Its claims are `sub`, `email`, `role` and `sites`, plus `iss` and `aud`, which are both
  Spotcraft's origin.
  - It's set at sign-in, and renewed at `GET /api/session` while the dashboard session lives.
  - The public keys are at `/api/auth/jwks`.
- **A shared domain:** `AUTH_COOKIE_DOMAIN=vin.ski` puts Spotcraft's cookies on the whole domain,
  so `www.vin.ski`'s server receives them.
  - Leave it unset locally: cookies ignore the port, so `localhost:3000` and `localhost:3001`
    already share them.
  - When it's unset, cookies stay host-only, as before.
- **Login with a way back:** `cms.vin.ski/login?redirect=https://www.vin.ski/…` signs you in and
  sends you to that page. If you're already signed in, it sends you back at once, with a fresh
  token.
- **Logout from the frontend:** `cms.vin.ski/logout?redirect=https://www.vin.ski/` ends the
  dashboard session, clears the token and sends you back. It's a plain GET link.
- **Bot protection and limits:** Turnstile is optional (`TURNSTILE_SITE_KEY` and
  `TURNSTILE_SECRET_KEY`), on sign-in and forgot-password.
  - Sign-in allows 5 attempts per email and 10 per IP every 15 minutes.
  - Better Auth's own HTTP sign-in endpoints are off, so nothing gets around those checks.
- **New in `@spotcraft/client`:**
  - `getSession(cookieHeader, { url })` returns `{ user, setCookie }`. It checks the token locally
    and renews it once when it has run out. `setCookie` holds the renewed cookies; pass them on.
  - `verifySession(cookieHeader, { url })` only checks the token, and never makes a request.
  - `loginUrl(redirect, { url })` and `logoutUrl(redirect, { url })` build the two links.
  - `TOKEN_COOKIE` and `SESSION_COOKIES` are the stable cookie names. Both cookies are httpOnly.
  - `user` is `{ id, email, role, sites }`, or null if you aren't signed in or don't work on
    `vinski`.
- **Docs:** "Signing in to your frontend", in Spotcraft's docs (`docs/building/signing-in`).

---

## 1. Update Spotcraft in the monorepo

`apps/dashboard` is an unmodified copy of Spotcraft. These are the only files that differ from the
checkout: the new auth code, one migration and `.env.example`. Bring them over from `../spotcraft`:

```bash
cd ../vindotski
rsync -a ../spotcraft/apps/dashboard/src/ apps/dashboard/src/
rsync -a ../spotcraft/apps/dashboard/drizzle/ apps/dashboard/drizzle/
cp ../spotcraft/apps/dashboard/.env.example apps/dashboard/.env.example
pnpm --filter dashboard db:migrate      # 0010_jwks: the token's signing keys
```

Then check it: `git diff --stat apps/dashboard` should show only the files named above. Nothing in
`apps/dashboard/.env` needs to change locally.

`@spotcraft/client` comes from the checkout (`file:../../../spotcraft/packages/client`). Build
it, then reinstall so vin.ski picks up the new version and its new dependency, `jose`:

```bash
pnpm --dir ../spotcraft --filter @spotcraft/client build
pnpm install
```

## 2. Local settings

- **The site's address:** set it to `http://localhost:3001`. Open
  `http://localhost:3000/vinski/settings/site`, then set **Site URL**. This is what lets login send
  you back to the local site.
  - **Warning:** `pnpm cms:export` writes the address into `spotcraft-content/site.yaml`. Don't
    commit `site_url: http://localhost:3001`; production uses `https://www.vin.ski`.
- **Your account:** you need to be a superadmin, or a member of `vinski`. The account from
  onboarding is a superadmin.
- **Turnstile (optional locally):** to see the widget, set Cloudflare's test keys in
  `apps/dashboard/.env`, then restart the dashboard:

  ```bash
  TURNSTILE_SITE_KEY=1x00000000000000000000AA
  TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
  ```

## 3. The gate: `features/auth/utils/session.ts`

Replace the Supabase client with `getSession`. The proxy also:
- passes the user to pages and route handlers in a request header. It always replaces that
  header, so a browser can't fake it;
- sets a readable `signed-in=1` marker for the before-paint script and analytics. The token itself
  is httpOnly.

```ts
import { getSession } from "@spotcraft/client";
import { NextResponse, type NextRequest } from "next/server";

// For proxy.ts. Who's signed in, from Spotcraft's token (checked here, no
// request to Spotcraft unless it has run out), and the teaser for anyone else.
// Log in at /auth/login, which goes to Spotcraft's sign-in and back

/** The signed-in user, for route handlers (current-user.ts). Set by the proxy only */
export const USER_HEADER = "x-vinski-user";
/** Readable by scripts: "probably signed in", for the toolbar's room and analytics */
export const SIGNED_IN_COOKIE = "signed-in";

const spotcraft = { url: process.env.SPOTCRAFT_URL! };

export async function updateSession(request: NextRequest) {
  const { user, setCookie } = await getSession(request.headers.get("cookie"), spotcraft);

  // Never trust the header from the browser: replace it every time
  const headers = new Headers(request.headers);
  headers.delete(USER_HEADER);
  if (user) headers.set(USER_HEADER, JSON.stringify({ id: user.id, email: user.email }));

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
  // A renewed token (or a cleared one, once the session has ended)
  for (const cookie of setCookie) response.headers.append("set-cookie", cookie);

  // The same URL serves different pages with and without a session, so no
  // CDN or cache may keep one visitor's version for another, or for a crawler
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
```

`proxy.ts` stays as it is. Its matcher already covers every page and `/api/*` route except
`/api/spotcraft`.

## 4. Signed-in-only routes

Add `features/auth/utils/current-user.ts`:

```ts
import "server-only";
import { headers } from "next/headers";
import { USER_HEADER } from "./session";

export type CurrentUser = { id: string; email: string };

// The signed-in user, as the proxy checked it for this request. Null for a
// guest. Only for routes the proxy's matcher covers
export async function currentUser(): Promise<CurrentUser | null> {
  const value = (await headers()).get(USER_HEADER);
  return value ? (JSON.parse(value) as CurrentUser) : null;
}
```

In `app/api/search/route.ts` and `app/api/admin/content-status/route.ts`, replace
`createClient()` and `getClaims()` with:

```ts
import { currentUser } from "@/features/auth/utils/current-user";

if (!(await currentUser())) {
  return NextResponse.json({ error: "Sign in to search" }, { status: 401 });
}
```

Keep each route's own error message.

## 5. Log in and log out

**Login:** `/auth/login` becomes a redirect to Spotcraft's sign-in, coming back to the homepage.
The teaser's link to it stays.

1. Delete `app/auth/login/page.tsx`, `app/auth/layout.tsx`,
   `features/auth/components/login-form.tsx` and `features/auth/api/login.ts`.
2. Add `app/auth/login/route.ts`:

```ts
import { loginUrl } from "@spotcraft/client";
import { NextResponse, type NextRequest } from "next/server";

// Signing in happens on Spotcraft (with Turnstile), which sends you back here
export function GET(request: NextRequest) {
  const home = new URL("/", request.url).href;
  return NextResponse.redirect(loginUrl(home, { url: process.env.SPOTCRAFT_URL! }));
}
```

`request.url`'s origin must be the site's address: `https://www.vin.ski` in production, and
`http://localhost:3001` locally. Otherwise Spotcraft ignores it and you land on the dashboard.

**Logout:**

1. Delete `features/auth/api/logout.ts`.
2. In `features/auth/components/logout-button.tsx`, make the button a full page load of
   Spotcraft's logout. It ends the dashboard session too, then comes back to `/`:

```tsx
"use client";

import { logoutUrl } from "@spotcraft/client";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

// Spotcraft signs out everywhere (the dashboard too) and sends a full load of
// /, where a guest gets the teaser. SPOTCRAFT_URL is inlined by next.config.ts
export default function LogoutButton(
  props: Omit<React.ComponentProps<typeof Button>, "onClick">,
) {
  return (
    <Button
      {...props}
      onClick={() =>
        window.location.assign(
          logoutUrl(new URL("/", window.location.href).href, {
            url: process.env.SPOTCRAFT_URL!,
          }),
        )
      }
    >
      <LogOut data-icon="inline-start" />
      Log out
    </Button>
  );
}
```

`loginUrl` and `logoutUrl` don't use `jose`. The client has `sideEffects: false`, so a Client
Component that imports them doesn't ship the token code.

## 6. The admin toolbar

**The email:** the browser can't read the token, so it asks a small route. Add `app/api/me/route.ts`:

```ts
import { NextResponse } from "next/server";
import { currentUser } from "@/features/auth/utils/current-user";

// The admin toolbar's account email. Guests never get here (the proxy 404s it)
export async function GET() {
  const user = await currentUser();
  return NextResponse.json(
    { email: user?.email ?? null },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
```

In `features/auth/api/get-user.ts`, keep `useUser` and replace `getUser`:

```ts
// The signed-in user's email, as the proxy checked it. Null without a session
export async function getUser() {
  const response = await fetch("/api/me");
  if (!response.ok) return null;
  const { email } = (await response.json()) as { email: string | null };
  return email ? { email } : null;
}
```

**Dashboard links:** in `app/_components/admin-bar.tsx`, drop the "Supabase" entry from
`dashboards`, and `supabaseDashboardUrl` from its import. Delete `supabaseDashboardUrl` from
`config/site.ts`.

## 7. Before the first paint, and analytics

The readable marker replaces `sb-*-auth-token`.

1. Move `lib/supabase/session-cookie.ts` to `lib/signed-in-cookie.ts`, with the same exports:

```ts
// The proxy's "signed in" marker (features/auth/utils/session.ts): readable in
// the browser, unlike Spotcraft's token. Sign-in is for the team only, so it
// means it's me
export const sessionCookie = /(?:^|;\s*)signed-in=1(?:;|$)/;

export const hasSessionCookie = () => sessionCookie.test(document.cookie);
```

2. Update the imports in `app/layout.tsx`, `app/_components/admin-bar-loader.tsx` and
   `app/_components/vercel-insights.tsx`. Nothing else in them changes.

The marker is set by the response that renders the page. So right after signing in, the very first
paint at `/` has no toolbar room yet; the loader adds it after hydration, as it already does after
navigations. Every later page load has it from the start.

## 8. Remove Supabase

- **Files:** delete `apps/website/lib/supabase/` (client, server, types, and the old cookie
  file) and the repository's `supabase/` folder.
- **Dependencies:** run `pnpm --filter website remove @supabase/ssr @supabase/supabase-js @marsidev/react-turnstile`.
- **Root `package.json`:** remove the `db:types` script.
- **`apps/website/.env.example` and `.env.local`:** remove `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_AUTH_CAPTCHA_SECRET` and
  `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
- **Docs:** `README.md` mentions Supabase. Update it.
- **Check:** `rg -i "supabase|turnstile" apps/website --glob '!node_modules'` should only find
  unrelated text.
- **Stop the local stack:** `supabase stop` (Spotcraft's own Docker services are separate).

## 9. Production

**Spotcraft, on `cms.vin.ski`:**

```bash
BETTER_AUTH_URL=https://cms.vin.ski
AUTH_COOKIE_DOMAIN=vin.ski
TURNSTILE_SITE_KEY=0x…        # vin.ski's widget (below)
TURNSTILE_SECRET_KEY=0x…      # the secret Supabase had as its captcha secret
```

- **Migrations:** run them before the new code (`DATABASE_URL=… pnpm --filter dashboard db:migrate`).
  With Docker, the production compose file runs them first.
- **The site's address:** it must be `https://www.vin.ski`, as in `site.yaml`.
- **Turnstile:** in Cloudflare, add `cms.vin.ski` to the widget's hostnames. The widget now runs on
  Spotcraft's login page, not on vin.ski.

**The website on Vercel:**
- `SPOTCRAFT_URL=https://cms.vin.ski/vinski`, unchanged.
- Remove the Supabase and Turnstile variables from the project.
- `@spotcraft/client` must come from npm by now: a `file:` dependency on `../spotcraft` doesn't
  resolve on Vercel. Publish it, then depend on the version that has `getSession`.

**After the deploy:**
1. **Everyone is signed out once** (only you): the cookie changed. Sign in again through
   `www.vin.ski/auth/login`.
2. **Delete the hosted Supabase project.**
3. **Remove the `api.vin.ski` DNS record** that pointed at it.

## 10. Check

Locally, with the dashboard on 3000, vin.ski on 3001 and no cookie domain:

- [ ] Signed out, `/` is the teaser and `/projects/…` is a 404.
- [ ] **Sign-in round trip:** the teaser's link to `/auth/login` goes to
      `localhost:3000/login?redirect=http://localhost:3001/`. After signing in you're back on vin.ski
      with the toolbar, showing your email.
- [ ] **No request per page:** while the token is current, page loads don't call Spotcraft (watch
      the dashboard's terminal). Delete `spotcraft_token` in devtools and reload: one call to
      `/api/session`, and you stay signed in.
- [ ] **Another site's user:** an account that's only a member of another site in the same
      Spotcraft (create a second site, and invite one there) sees the teaser on vin.ski.
- [ ] **Logout everywhere:** "Log out" in the toolbar lands on the teaser, and
      `localhost:3000` asks you to sign in again.
- [ ] **Password reset:** after a reset, another browser's vin.ski session ends within 10 minutes.
- [ ] **Limits:** the 6th wrong password for one email says "Too many attempts". With the test keys,
      the Turnstile widget shows.
- [ ] **Search and the toolbar:** `/api/search` and `/api/admin/content-status` are a 404 for a
      guest (the proxy hides them; the routes' own 401 is the fallback), and work signed in.
- [ ] **Analytics:** with the marker cookie present, your visits are skipped.

In production, the same checks on `www.vin.ski` and `cms.vin.ski`.
