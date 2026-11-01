import { serverEnv } from "./env.server";

// Cloudflare Turnstile on sign-in and forgot-password: on when both TURNSTILE_SITE_KEY and
// TURNSTILE_SECRET_KEY are set. The server functions check the widget's token before anything
// else (Better Auth's own endpoints for these are off, so there's no way around it).

/** The site key for the widget, or null when Turnstile is off. */
export function turnstileSiteKey(): string | null {
	const { TURNSTILE_SITE_KEY, TURNSTILE_SECRET_KEY } = serverEnv();
	return TURNSTILE_SITE_KEY && TURNSTILE_SECRET_KEY ? TURNSTILE_SITE_KEY : null;
}

/** Whether the widget's token is good (always, when Turnstile is off). */
export async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> {
	const secret = serverEnv().TURNSTILE_SECRET_KEY;
	if (!turnstileSiteKey() || !secret) return true;
	if (!token) return false;
	const body = new URLSearchParams({ secret, response: token });
	if (ip !== "unknown") body.set("remoteip", ip);
	try {
		const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
			method: "POST",
			body,
			signal: AbortSignal.timeout(10_000),
		});
		const result = (await response.json()) as { success?: boolean };
		return result.success === true;
	} catch (error) {
		console.error("[turnstile] unavailable", JSON.stringify({ message: String(error) }));
		return false;
	}
}
