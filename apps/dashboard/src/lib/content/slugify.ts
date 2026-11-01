/** URL-friendly slug matching ENTRY_SLUG: lowercase ASCII, digits and single hyphens. */
export function slugify(value: string, maxLength = 80): string {
	return value
		.normalize("NFKD")
		.replace(/[̀-ͯ]/g, "") // strip accents (é → e)
		.toLowerCase()
		.replace(/['’]/g, "") // don't → dont
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, maxLength)
		.replace(/-+$/g, "");
}
