import { and, eq } from "drizzle-orm";
import { getDb } from "#/lib/db/client.server";
import { user as authors, sites } from "#/lib/db/schema";
import { type SiteErrors, type SiteSettings, validateSite } from "#/lib/site/settings";
import { isoMs } from "./content.server";
import { currentSiteId } from "./site.server";
import { emitWebhook } from "./webhooks.server";

// Site settings: the current site's name and address (its row in `sites`). Admins write them
// here; frontends read them at /api/site.

export type SiteSettingsRecord = SiteSettings & { updatedAt: string; updatedBy: string | null };

export async function getSiteSettings(): Promise<SiteSettingsRecord> {
	const [row] = await getDb()
		.select({
			siteName: sites.name,
			siteUrl: sites.siteUrl,
			updatedAt: isoMs(sites.updatedAt),
			updatedBy: authors.email,
		})
		.from(sites)
		.leftJoin(authors, eq(authors.id, sites.updatedBy))
		.where(eq(sites.id, await currentSiteId()));
	if (!row) throw new Error("The site's row is missing; run the migrations");
	return row;
}

export type SaveSiteResult =
	| { ok: true; settings: SiteSettingsRecord }
	| {
			ok: false;
			fieldErrors?: SiteErrors;
			conflict?: { updatedAt: string; updatedBy: string | null };
	  };

export async function saveSiteSettings(input: {
	values: Partial<Record<keyof SiteSettings, unknown>>;
	expectedUpdatedAt: string;
	userId: string;
}): Promise<SaveSiteResult> {
	const checked = validateSite(input.values);
	if (!checked.ok) return { ok: false, fieldErrors: checked.errors };
	const updated = await getDb()
		.update(sites)
		.set({ name: checked.value.siteName, siteUrl: checked.value.siteUrl, updatedBy: input.userId })
		.where(
			and(eq(sites.id, await currentSiteId()), eq(isoMs(sites.updatedAt), input.expectedUpdatedAt)),
		)
		.returning({ id: sites.id });
	if (!updated.length) {
		const latest = await getSiteSettings();
		return { ok: false, conflict: { updatedAt: latest.updatedAt, updatedBy: latest.updatedBy } };
	}
	emitWebhook({ event: "site.updated", id: updated[0].id, path: "" });
	return { ok: true, settings: await getSiteSettings() };
}

/** Name and address for the dashboard's top bar (any dashboard role). */
export async function getSiteIdentity() {
	const [row] = await getDb()
		.select({ siteName: sites.name, siteUrl: sites.siteUrl })
		.from(sites)
		.where(eq(sites.id, await currentSiteId()));
	return row ?? { siteName: "Spotcraft", siteUrl: null };
}
