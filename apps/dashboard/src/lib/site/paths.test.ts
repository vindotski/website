import { describe, expect, it } from "vitest";
import { siteSlugInPath, withoutSite } from "./paths";

describe("siteSlugInPath", () => {
	it("is the first segment when it's a site slug", () => {
		expect(siteSlugInPath("/docs")).toBe("docs");
		expect(siteSlugInPath("/docs/files/posts")).toBe("docs");
		expect(siteSlugInPath("/my-blog/api/site")).toBe("my-blog");
	});

	it("is null for Spotcraft's own paths and anything that isn't a slug", () => {
		for (const path of [
			"/",
			"",
			"/api/site",
			"/media/a.png",
			"/login",
			"/files",
			"/Docs",
			"/_serverFn/x",
		]) {
			expect(siteSlugInPath(path), path).toBeNull();
		}
	});
});

describe("withoutSite", () => {
	it("drops the site from the path", () => {
		expect(withoutSite("/docs/files/posts")).toBe("/files/posts");
		expect(withoutSite("/docs")).toBe("/");
	});

	it("leaves a path without a site alone", () => {
		expect(withoutSite("/account")).toBe("/account");
		expect(withoutSite("/files/posts")).toBe("/files/posts");
	});
});
