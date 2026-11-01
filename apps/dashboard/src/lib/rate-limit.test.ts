import { describe, expect, it } from "vitest";
import { createRateLimit } from "./rate-limit";

describe("createRateLimit", () => {
	it("allows `limit` calls per window and key, then refuses until the window ends", () => {
		const allow = createRateLimit({ limit: 2, windowMs: 1000 });
		expect([allow("a", 0), allow("a", 10), allow("a", 20)]).toEqual([true, true, false]);
		expect(allow("b", 20)).toBe(true);
		expect(allow("a", 1000)).toBe(true);
	});
});
