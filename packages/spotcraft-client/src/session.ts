import { createRemoteJWKSet, type JWTPayload, jwtVerify } from "jose";

// Who's visiting your frontend: people sign in on Spotcraft, which sets a short-lived token (a JWT
// in the `spotcraft_token` cookie, on the domain you share with it). Your server checks it against
// Spotcraft's public keys, cached, with no request per page; when it has run out, one request to
// Spotcraft gets a fresh one while the sign-in lasts. Web Crypto (jose), so it runs in Node, edge
// runtimes and workers. Docs: Signing in to your frontend.

/** The token's cookie (httpOnly; set by Spotcraft). Stable. */
export const TOKEN_COOKIE = "spotcraft_token";

/** Spotcraft's sign-in cookies (httpOnly): someone signed in, whose token may have run out. Stable. */
export const SESSION_COOKIES = [
	"better-auth.session_token",
	"__Secure-better-auth.session_token",
] as const;

/** Someone signed in to Spotcraft who works on your site. */
export type SessionUser = {
	id: string;
	email: string;
	/** "superadmin": every site. */
	role: "superadmin" | null;
	/** The slugs of the sites they're a member of. */
	sites: string[];
};

export type SessionOptions = {
	/** Your site's base URL, as for createClient: `https://cms.example.com/blog`. */
	url: string;
	/** Your site's slug, if `url` doesn't name it (Spotcraft's default site). */
	site?: string;
	/** A fetch to use instead of the global one (for the refresh). */
	fetch?: typeof fetch;
};

/** Spotcraft's origin, and the site's slug (from `url`, or `site`). */
function target(options: { url: string; site?: string }) {
	const url = new URL(options.url);
	const path = url.pathname.replace(/\/+$/, "").replace(/\/api$/, "");
	return { origin: url.origin, site: options.site ?? (path.split("/").pop() || undefined) };
}

/** A cookie's value from a Cookie header. */
function cookie(header: string | null | undefined, name: string): string | null {
	for (const part of (header ?? "").split(";")) {
		const index = part.indexOf("=");
		if (index > 0 && part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
	}
	return null;
}

// Spotcraft's public keys, per origin: fetched when first needed, then cached (jose refetches when
// it meets a key it doesn't know, at most every 30 seconds).
const keySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
function keysOf(origin: string) {
	let keys = keySets.get(origin);
	if (!keys) {
		keys = createRemoteJWKSet(new URL("/api/auth/jwks", origin));
		keySets.set(origin, keys);
	}
	return keys;
}

type Claims = JWTPayload & { email?: unknown; role?: unknown; sites?: unknown };

/** A token's claims, if it's genuine, current and from this Spotcraft. */
async function claimsOf(token: string | null, origin: string): Promise<Claims | null> {
	if (!token) return null;
	try {
		const { payload } = await jwtVerify<Claims>(token, keysOf(origin), {
			issuer: origin,
			audience: origin,
			algorithms: ["ES256"],
		});
		return payload;
	} catch {
		return null;
	}
}

/** The user the claims name, if they work on `site`. */
function userOf(claims: Claims | null, site: string): SessionUser | null {
	if (!claims?.sub || typeof claims.email !== "string") return null;
	const sites = Array.isArray(claims.sites)
		? claims.sites.filter((s): s is string => typeof s === "string")
		: [];
	const role = claims.role === "superadmin" ? "superadmin" : null;
	if (role !== "superadmin" && !sites.includes(site)) return null;
	return { id: claims.sub, email: claims.email, role, sites };
}

function resolve(options: SessionOptions) {
	const { origin, site } = target(options);
	if (!site) throw new Error("Name your site: a url with its slug, or the `site` option.");
	return { origin, site };
}

/**
 * The visitor, from their token, checked on your server without asking Spotcraft; null if they
 * aren't signed in, their token has run out, or they don't work on your site. `cookieHeader`: the
 * request's Cookie header.
 */
export async function verifySession(
	cookieHeader: string | null | undefined,
	options: SessionOptions,
): Promise<SessionUser | null> {
	const { origin, site } = resolve(options);
	return userOf(await claimsOf(cookie(cookieHeader, TOKEN_COOKIE), origin), site);
}

/**
 * The visitor, like verifySession; if their token has run out while they're still signed in,
 * one request to Spotcraft gets a fresh one. Pass `setCookie` on in your response (each is a
 * Set-Cookie header), so the next requests have it.
 */
export async function getSession(
	cookieHeader: string | null | undefined,
	options: SessionOptions,
): Promise<{ user: SessionUser | null; setCookie: string[] }> {
	const { origin, site } = resolve(options);
	const claims = await claimsOf(cookie(cookieHeader, TOKEN_COOKIE), origin);
	const signedIn = SESSION_COOKIES.some((name) => cookie(cookieHeader, name));
	// A current token (even for someone who doesn't work on this site), or nobody signed in.
	if (claims || !signedIn) return { user: userOf(claims, site), setCookie: [] };

	const doFetch = options.fetch ?? globalThis.fetch;
	try {
		const response = await doFetch(new URL("/api/session", origin), {
			headers: { cookie: cookieHeader ?? "", accept: "application/json" },
		});
		const setCookie = response.headers.getSetCookie();
		const body = (await response.json().catch(() => null)) as { token?: unknown } | null;
		const token = response.ok && typeof body?.token === "string" ? body.token : null;
		return { user: userOf(await claimsOf(token, origin), site), setCookie };
	} catch {
		// Spotcraft unreachable: signed out, for now.
		return { user: null, setCookie: [] };
	}
}

/** Spotcraft's sign-in page, coming back to `redirect` (a URL on your site's address) after. */
export function loginUrl(redirect: string, options: { url: string }): string {
	const url = new URL("/login", target(options).origin);
	url.searchParams.set("redirect", redirect);
	return url.href;
}

/** Signs out of Spotcraft (every frontend too), then goes to `redirect` (on your site's address). */
export function logoutUrl(redirect: string, options: { url: string }): string {
	const url = new URL("/logout", target(options).origin);
	url.searchParams.set("redirect", redirect);
	return url.href;
}
