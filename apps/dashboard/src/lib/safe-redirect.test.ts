import { describe, expect, it } from "vitest";
import { DEFAULT_AFTER_LOGIN, safeRedirect } from "./safe-redirect";

describe("safeRedirect", () => {
	it("keeps same-origin paths", () => {
		expect(safeRedirect("/")).toBe("/");
		expect(safeRedirect("/settings?tab=team#members")).toBe("/settings?tab=team#members");
	});

	it.each([
		["protocol-relative", "//evil.com"],
		["backslash", "/\\evil.com"],
		["absolute", "https://evil.com"],
		["javascript", "javascript:alert(1)"],
		["relative", "dashboard"],
		["empty", ""],
	])("rejects %s targets", (_label, value) => {
		expect(safeRedirect(value)).toBe(DEFAULT_AFTER_LOGIN);
	});

	describe("with allowed origins", () => {
		const origins = ["https://www.vin.ski", "http://localhost:3001"];

		it("keeps URLs on an allowed origin", () => {
			expect(safeRedirect("https://www.vin.ski/projects/x?a=1#b", "/", origins)).toBe(
				"https://www.vin.ski/projects/x?a=1#b",
			);
			expect(safeRedirect("http://localhost:3001/", "/", origins)).toBe("http://localhost:3001/");
		});

		it.each([
			["another host", "https://evil.com/"],
			["a look-alike host", "https://www.vin.ski.evil.com/"],
			["credentials before the host", "https://www.vin.ski@evil.com/"],
			["another scheme", "http://www.vin.ski/"],
			["another port", "http://localhost:3002/"],
			["protocol-relative", "//www.vin.ski/"],
			["javascript", "javascript://www.vin.ski/%0aalert(1)"],
		])("rejects %s", (_label, value) => {
			expect(safeRedirect(value, "/", origins)).toBe("/");
		});
	});

	it("rejects non-strings", () => {
		expect(safeRedirect(undefined)).toBe(DEFAULT_AFTER_LOGIN);
		expect(safeRedirect(42)).toBe(DEFAULT_AFTER_LOGIN);
	});
});
