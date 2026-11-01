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

	it("rejects non-strings", () => {
		expect(safeRedirect(undefined)).toBe(DEFAULT_AFTER_LOGIN);
		expect(safeRedirect(42)).toBe(DEFAULT_AFTER_LOGIN);
	});
});
