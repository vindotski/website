export const DEFAULT_AFTER_LOGIN = "/";

/**
 * Only allow same-origin paths as post-login redirect targets (prevents open redirects).
 * Rejects absolute URLs, protocol-relative `//host`, and `/\host` (browsers treat `\` as `/`).
 */
export function safeRedirect(value: unknown, fallback = DEFAULT_AFTER_LOGIN): string {
	if (typeof value !== "string") return fallback;
	if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
	return value;
}
