import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequest, getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { clientIp } from "#/lib/client-ip";
import { createRateLimit } from "#/lib/rate-limit";
import { isAbsolute } from "#/lib/safe-redirect";
import { getCurrentUser, getSession } from "./auth.server";
import { getAuth } from "./better-auth.server";
import { resolveRedirect } from "./redirect.server";
import { clearTokenCookie, setTokenCookie } from "./session-token.server";
import { turnstileSiteKey, verifyTurnstile } from "./turnstile.server";

export const fetchUser = createServerFn({ method: "GET" }).handler(() => getCurrentUser());

/** What the sign-in and forgot-password pages need: Turnstile's site key when it's on. */
export const authPageOptions = createServerFn({ method: "GET" }).handler(() => ({
	turnstileSiteKey: turnstileSiteKey(),
}));

/**
 * Where /login sends someone who's already signed in, or null. A frontend sends people here when
 * its token has run out, so they get a fresh one on the way back.
 */
export const signedInRedirect = createServerFn({ method: "GET" })
	.validator(z.object({ redirect: z.string().max(2048).optional() }))
	.handler(async ({ data }) => {
		const session = await getSession();
		if (!session) return null;
		await setTokenCookie(session.user);
		return resolveRedirect(data.redirect);
	});

// Per instance (src/lib/rate-limit.ts). Every attempt counts, per address and per account.
const FIFTEEN_MINUTES = 15 * 60_000;
const attemptsFromIp = createRateLimit({ limit: 10, windowMs: FIFTEEN_MINUTES });
const attemptsForEmail = createRateLimit({ limit: 5, windowMs: FIFTEEN_MINUTES });

// Bounds only: a malformed email is a normal failed sign-in ("Invalid email or password"), not a
// validation exception (those get logged as server errors and surface as "Something went wrong").
const signInSchema = z.object({
	email: z.string().trim().max(320),
	password: z.string().max(200),
	redirect: z.string().max(2048).optional(),
	/** The Turnstile widget's token, when Turnstile is on. */
	turnstile: z.string().max(4096).optional(),
});

/**
 * Sign in. A target on this app is a redirect; one on a frontend comes back as `redirectTo` (the
 * page leaves for it with a full page load).
 */
export const signIn = createServerFn({ method: "POST" })
	.validator(signInSchema)
	.handler(async ({ data }) => {
		const ip = clientIp(getRequest());
		// Both are counted, so hitting one doesn't hide attempts from the other.
		const ipAllowed = attemptsFromIp(ip);
		const emailAllowed = attemptsForEmail(data.email.toLowerCase());
		if (!ipAllowed || !emailAllowed) {
			return { error: "Too many attempts. Try again in a few minutes." };
		}
		if (!(await verifyTurnstile(data.turnstile, ip))) {
			return { error: "Couldn't confirm you're not a bot. Try again." };
		}
		// Sets the session cookie (tanstackStartCookies).
		const signedIn = await getAuth()
			.api.signInEmail({
				body: { email: data.email, password: data.password },
				headers: getRequestHeaders(),
			})
			.catch(() => null);
		// Expected outcome, not an exception: return it (thrown errors are logged and masked).
		// One generic message so the response doesn't reveal which emails have accounts.
		if (!signedIn) return { error: "Invalid email or password" };
		await setTokenCookie(signedIn.user);
		const target = await resolveRedirect(data.redirect);
		if (isAbsolute(target)) return { redirectTo: target };
		throw redirect({ href: target });
	});

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
	await getAuth()
		.api.signOut({ headers: getRequestHeaders() })
		.catch(() => undefined);
	clearTokenCookie();
	throw redirect({ to: "/login" });
});
