import { z } from "zod";
import { isStorable } from "../content/fields.ts";

// Site settings: the site's name and its frontend's address (the site's row in `sites`), edited by
// admins and served to frontends at /api/site. Pure — also used by the content:export/import
// scripts (keep relative imports with extensions).

export type SiteSettings = {
	siteName: string;
	siteUrl: string | null;
};

/** Settings keys and their column names (also the keys of site.yaml), in file order. */
export const SITE_COLUMNS = [
	["siteName", "name"],
	["siteUrl", "site_url"],
] as const satisfies readonly (readonly [keyof SiteSettings, string])[];

const text = (max: number) =>
	z.string().max(max).refine(isStorable, "Contains characters that can't be stored");

/** What's stored: every key present, trimmed, empty → null, no trailing slash on the address. */
export function canonicalSite(input: Partial<Record<keyof SiteSettings, unknown>>): SiteSettings {
	const str = (v: unknown) => (typeof v === "string" ? v.trim() : v);
	const siteUrl = str(input.siteUrl);
	return {
		siteName: str(input.siteName),
		siteUrl:
			siteUrl === "" || siteUrl === undefined || siteUrl === null
				? null
				: typeof siteUrl === "string"
					? siteUrl.replace(/\/+$/, "")
					: siteUrl,
	} as SiteSettings;
}

export const siteSettingsSchema: z.ZodType<SiteSettings> = z.strictObject({
	siteName: text(100).min(1, "Required"),
	siteUrl: text(2000)
		.refine((v) => {
			try {
				const url = new URL(v);
				return ["http:", "https:"].includes(url.protocol) && url.origin === v;
			} catch {
				return false;
			}
		}, "Just the address, like https://example.com (no path)")
		.nullable(),
});

export type SiteErrors = Partial<Record<keyof SiteSettings, string[]>>;

/** Canonical, validated settings — or errors keyed like the settings. */
export function validateSite(input: Partial<Record<keyof SiteSettings, unknown>>) {
	const canonical = canonicalSite(input);
	const parsed = siteSettingsSchema.safeParse(canonical);
	if (parsed.success) return { ok: true as const, value: parsed.data };
	const errors: SiteErrors = {};
	for (const issue of parsed.error.issues) {
		const key = String(issue.path[0] ?? "siteName") as keyof SiteSettings;
		errors[key] = [...(errors[key] ?? []), issue.message];
	}
	return { ok: false as const, errors };
}
