import type { QueryClient } from "@tanstack/react-query";
import { siteSlugInPath } from "./paths";

// The dashboard's site in the browser: set by the dashboard's guard from the page being opened
// (before its loaders run), sent with every server function call (src/start.ts). The server never
// uses this: a request there names its own site (src/server/site.server.ts).

let active: string | null = null;

/** Remembers `slug` as the open site, and as your last one: where / takes you next time. */
function remember(slug: string) {
	active = slug;
	// biome-ignore lint/suspicious/noDocumentCookie: one preference cookie; the Cookie Store API isn't in every browser yet.
	document.cookie = `spotcraft_site=${slug}; path=/; max-age=31536000; samesite=lax`;
}

export function activeSite() {
	// A page rendered by the server doesn't run the guard again in the browser: until the first
	// navigation, its site is the one in the URL (else refetches would go to your last site).
	if (active === null && typeof window !== "undefined") {
		const slug = siteSlugInPath(window.location.pathname);
		if (slug) remember(slug);
	}
	return active;
}

/**
 * Opens `slug` (null: none named, e.g. /account keeps the last). Switching sites drops every
 * cached query, so one site's data never shows on another.
 */
export function setActiveSite(slug: string | null, queryClient: QueryClient) {
	if (typeof window === "undefined" || !slug || slug === activeSite()) return;
	if (active !== null) queryClient.clear();
	remember(slug);
}
