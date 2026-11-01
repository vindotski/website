import { describe, expect, it } from "vitest";
import { canonicalSite, validateSite } from "./settings";

const valid = { siteName: "Alex Example", siteUrl: "https://alex.example" };

describe("site settings", () => {
	it("accepts valid settings and keeps them as they are", () => {
		expect(validateSite(valid)).toEqual({ ok: true, value: valid });
	});

	it("canonicalizes: trims, empty → null, trailing slash", () => {
		expect(validateSite({ siteName: "  Alex Example ", siteUrl: "https://alex.example/" })).toEqual(
			{
				ok: true,
				value: valid,
			},
		);
		expect(validateSite({ siteName: "Alex", siteUrl: "  " })).toEqual({
			ok: true,
			value: { siteName: "Alex", siteUrl: null },
		});
		expect(canonicalSite(canonicalSite(valid))).toEqual(canonicalSite(valid));
	});

	it("reports bad values by key", () => {
		const result = validateSite({ siteName: "", siteUrl: "https://alex.example/blog" });
		expect(result.ok ? [] : Object.keys(result.errors).sort()).toEqual(["siteName", "siteUrl"]);
		const ftp = validateSite({ siteName: "A", siteUrl: "ftp://alex.example" });
		expect(ftp.ok ? [] : Object.keys(ftp.errors)).toEqual(["siteUrl"]);
	});

	it("only takes the keys it knows (site.yaml reports unknown ones itself)", () => {
		const result = validateSite({ ...valid, colour: "red" } as never);
		expect(result.ok && Object.keys(result.value)).toEqual(["siteName", "siteUrl"]);
	});
});
