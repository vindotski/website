import { isNotNull } from "drizzle-orm";
import { getDb } from "#/lib/db/client.server";
import { sites } from "#/lib/db/schema";
import { DEFAULT_AFTER_LOGIN, safeRedirect } from "#/lib/safe-redirect";

/** The origins of every site's address (site_url): where sign-in and sign-out may send you. */
async function frontendOrigins(): Promise<string[]> {
	const rows = await getDb()
		.select({ url: sites.siteUrl })
		.from(sites)
		.where(isNotNull(sites.siteUrl));
	return rows.flatMap((r) => {
		try {
			return r.url ? [new URL(r.url).origin] : [];
		} catch {
			return [];
		}
	});
}

/** A safe target for `redirect`: a path here, or a URL on one of your sites' frontends. */
export async function resolveRedirect(value: unknown, fallback = DEFAULT_AFTER_LOGIN) {
	return safeRedirect(value, fallback, await frontendOrigins());
}
