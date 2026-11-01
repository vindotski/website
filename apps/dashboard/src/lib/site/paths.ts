import { SLUG } from "../content/fields.ts";
import { RESERVED_SLUGS } from "./new-site.ts";

// A site lives at its own path, `/<slug>/…` (dashboard, API, images). Pure: client and server.

/** The site slug at the start of `pathname` (`/docs/files` → docs), unless it's Spotcraft's own. */
export function siteSlugInPath(pathname: string): string | null {
	const first = pathname.split("/")[1] ?? "";
	return SLUG.test(first) && !RESERVED_SLUGS.has(first) ? first : null;
}

/** `pathname` without its site: `/docs/files/posts` → `/files/posts`, `/docs` → `/`. */
export function withoutSite(pathname: string): string {
	return siteSlugInPath(pathname) ? pathname.replace(/^\/[^/]+/, "") || "/" : pathname;
}
