import { describe, expect, it } from "vitest";
import { markdownToTree } from "./body";
import { headingsOf } from "./headings";

const tree = (markdown: string) => {
	const parsed = markdownToTree(markdown);
	if (!parsed.ok) throw new Error("bad markdown");
	return parsed.tree;
};

describe("headingsOf", () => {
	it("gives every heading GitHub's id, numbering repeats, without image alt", () => {
		expect(
			headingsOf(
				tree("# Intro\n\n## Set up\n\n### Set up\n\n> ## In a quote\n\n## Logo ![alt text](a.png)"),
			),
		).toEqual([
			{ depth: 1, text: "Intro", anchor: "intro" },
			{ depth: 2, text: "Set up", anchor: "set-up" },
			{ depth: 3, text: "Set up", anchor: "set-up-1" },
			{ depth: 2, text: "In a quote", anchor: "in-a-quote" },
			{ depth: 2, text: "Logo", anchor: "logo" },
		]);
	});

	it("has none without a body", () => {
		expect(headingsOf(null)).toEqual([]);
	});
});
