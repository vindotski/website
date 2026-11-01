import { describe, expect, it } from "vitest";
import { slugify } from "../content/slugify";
import { validateNewSite } from "./new-site";

describe("validateNewSite", () => {
	it("accepts a name and a kebab-case slug, trimmed", () => {
		const result = validateNewSite({ name: " Alex Studio ", slug: " alex-studio " });
		expect(result.ok && result.value).toEqual({ name: "Alex Studio", slug: "alex-studio" });
	});

	it("rejects slugs the database would refuse", () => {
		for (const slug of [
			"",
			"Alex",
			"alex studio",
			"-alex",
			"alex-",
			"alex--studio",
			"a".repeat(64),
		]) {
			const result = validateNewSite({ name: "Alex", slug });
			expect(result.ok, JSON.stringify(slug)).toBe(false);
			expect(result.ok ? null : Object.keys(result.fieldErrors)).toEqual(["slug"]);
		}
	});

	it("rejects slugs Spotcraft's own paths use", () => {
		for (const slug of ["api", "media", "login", "files", "settings", "new-site"]) {
			const result = validateNewSite({ name: "Alex", slug });
			expect(result.ok ? null : result.fieldErrors.slug, slug).toEqual([
				"Spotcraft uses this name itself: pick another",
			]);
		}
	});

	it("requires a name", () => {
		const result = validateNewSite({ name: "   ", slug: "alex" });
		expect(result.ok ? null : result.fieldErrors.name).toEqual(["Required"]);
	});

	it("gets a valid slug from slugify for typical names", () => {
		for (const name of [
			"Alex Studio",
			"Café Müller",
			"Don't Panic!",
			"  Spaced   Out  ",
			"2026 Portfolio",
		]) {
			const result = validateNewSite({ name, slug: slugify(name, 63) });
			expect(result.ok, name).toBe(true);
		}
	});
});
