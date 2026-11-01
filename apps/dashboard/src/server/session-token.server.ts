import { deleteCookie, getRequest, setCookie } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { getDb } from "#/lib/db/client.server";
import { siteMembers, sites } from "#/lib/db/schema";
import { getAuth, TOKEN_LIFETIME_SECONDS } from "./better-auth.server";
import { serverEnv } from "./env.server";

// The token a frontend's server checks to know who's visiting, without asking Spotcraft: a
// short-lived JWT in a cookie (on AUTH_COOKIE_DOMAIN when set), signed with the jwt plugin's keys
// (served at /api/auth/jwks). It names the user and the sites they work on. Set on sign-in,
// refreshed at /api/session while the session lives, cleared on sign-out. @spotcraft/client
// verifies it (verifySession). Docs: Signing in to your frontend.

/** Stable: frontends read it (@spotcraft/client exports the same name). */
export const TOKEN_COOKIE = "spotcraft_token";

export type TokenUser = { id: string; email: string; role?: unknown };

/** Spotcraft's origin: the token's issuer and audience. */
function origin() {
	return new URL(serverEnv().BETTER_AUTH_URL ?? getRequest().url).origin;
}

function cookieOptions() {
	return {
		httpOnly: true,
		secure: origin().startsWith("https:"),
		sameSite: "lax" as const,
		path: "/",
		domain: serverEnv().AUTH_COOKIE_DOMAIN,
	};
}

/** The slugs of the sites a user is a member of. */
async function sitesOf(userId: string): Promise<string[]> {
	const rows = await getDb()
		.select({ slug: sites.slug })
		.from(siteMembers)
		.innerJoin(sites, eq(sites.id, siteMembers.siteId))
		.where(eq(siteMembers.userId, userId))
		.orderBy(sites.slug);
	return rows.map((r) => r.slug);
}

async function mintToken(user: TokenUser): Promise<string> {
	const iss = origin();
	const { token } = await getAuth().api.signJWT({
		body: {
			payload: {
				sub: user.id,
				email: user.email,
				role: user.role === "superadmin" ? "superadmin" : null,
				sites: await sitesOf(user.id),
				iss,
				aud: iss,
				iat: Math.floor(Date.now() / 1000),
			},
		},
	});
	return token;
}

/** Set a fresh token on this response; returns it. */
export async function setTokenCookie(user: TokenUser): Promise<string> {
	const token = await mintToken(user);
	setCookie(TOKEN_COOKIE, token, { ...cookieOptions(), maxAge: TOKEN_LIFETIME_SECONDS });
	return token;
}

export function clearTokenCookie() {
	deleteCookie(TOKEN_COOKIE, cookieOptions());
}
