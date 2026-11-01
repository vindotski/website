import { z } from "zod";
import { isStorable, SLUG } from "#/lib/content/fields";

/**
 * Slugs Spotcraft's own paths use: a site's slug is the first part of its URLs (`/<slug>/files`,
 * `/<slug>/api`), so it can't be one of these. Pure (also used by src/server/site.server.ts).
 */
export const RESERVED_SLUGS = new Set([
	"api",
	"media",
	"login",
	"logout",
	"onboard",
	"new-site",
	"account",
	"forgot-password",
	"reset-password",
	"accept-invite",
	"assets",
	"files",
	"settings",
	"sites",
]);

/** Creating a site (/new-site): its name, and the slug its URLs start with. */
export const newSiteSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, "Required")
		.max(100)
		.refine(isStorable, "Contains characters that can't be stored"),
	slug: z
		.string()
		.trim()
		.min(1, "Required")
		.max(63, "Use at most 63 characters")
		.regex(SLUG, "Lowercase letters, numbers and single dashes")
		.refine((slug) => !RESERVED_SLUGS.has(slug), "Spotcraft uses this name itself: pick another"),
});

export type NewSiteInput = z.input<typeof newSiteSchema>;
export type NewSiteFieldErrors = Partial<Record<keyof NewSiteInput, string[]>>;

/** Same rules on client and server. */
export function validateNewSite(input: NewSiteInput) {
	const result = newSiteSchema.safeParse(input);
	return result.success
		? { ok: true as const, value: result.data }
		: {
				ok: false as const,
				fieldErrors: z.flattenError(result.error).fieldErrors as NewSiteFieldErrors,
			};
}
