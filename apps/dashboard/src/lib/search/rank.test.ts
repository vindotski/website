import { describe, expect, it } from "vitest";
import { fuse } from "./rank";

const id = (s: string) => s;

describe("fuse", () => {
	it("ranks what both lists agree on first, scored 0–1", () => {
		const ranked = fuse(["a", "b", "c"], ["b", "d"], id);
		expect(ranked.map((r) => r.item)).toEqual(["b", "a", "d", "c"]);
		// b: 2nd in keyword, 1st in semantic.
		expect(ranked[0].score).toBeCloseTo((1 / 62 + 1 / 61) / (2 / 61), 6);
		expect(ranked.every((r) => r.score > 0 && r.score <= 1)).toBe(true);
	});

	it("gives a chunk first in both lists a score of 1", () => {
		expect(fuse(["a"], ["a"], id)).toEqual([{ item: "a", score: 1 }]);
	});

	it("works with one list empty", () => {
		expect(fuse([], ["x", "y"], id).map((r) => r.item)).toEqual(["x", "y"]);
		expect(fuse(["x"], [], id)[0].score).toBeCloseTo(0.5, 6);
	});
});
