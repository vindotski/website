export const DEFAULT_AFTER_LOGIN = "/";

/**
 * Only allow safe post-login (and post-logout) targets, to prevent open redirects: same-origin
 * paths, and absolute http(s) URLs on one of `allowedOrigins` (exact origins: your sites'
 * frontends). Rejects other absolute URLs, protocol-relative `//host`, and `/\host` (browsers
 * treat `\` as `/`).
 */
export function safeRedirect(
	value: unknown,
	fallback = DEFAULT_AFTER_LOGIN,
	allowedOrigins: readonly string[] = [],
): string {
	if (typeof value !== "string") return fallback;
	if (value.startsWith("/")) {
		return value.startsWith("//") || value.startsWith("/\\") ? fallback : value;
	}
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		return fallback;
	}
	const web = url.protocol === "https:" || url.protocol === "http:";
	return web && allowedOrigins.includes(url.origin) ? url.href : fallback;
}

/** Whether a (safe) target leaves this app: a frontend's URL rather than a path. */
export const isAbsolute = (target: string) => !target.startsWith("/");
