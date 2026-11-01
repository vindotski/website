import { describe, expect, it } from "vitest";
import { markdownToTree } from "../content/body";
import type { Field } from "../content/fields";
import { anchorOf, documentChunks, planSync, splitText, toSnippet } from "./chunks";

const tree = (markdown: string) => {
	const parsed = markdownToTree(markdown);
	if (!parsed.ok) throw new Error("bad markdown");
	return parsed.tree;
};

const fields: Field[] = [
	{ key: "summary", label: "Summary", type: "text" },
	{ key: "year", label: "Year", type: "number" },
];

describe("documentChunks", () => {
	it("makes a summary chunk and one chunk per section, with GitHub's anchors", () => {
		const chunks = documentChunks({
			title: "Shipping small",
			tags: ["process"],
			attributes: { summary: "Why I ship tiny pull requests.", year: 2026 },
			body: tree(
				"Intro text.\n\n## The habit\n\nOne change.\n\n### Details\n\nMore.\n\n## The habit\n\nAgain.",
			),
			fields,
		});
		expect(chunks).toEqual([
			{
				key: "",
				heading: null,
				content: "Shipping small\n\nWhy I ship tiny pull requests.\n\nIntro text.\n\nTags: process",
			},
			{
				key: "the-habit",
				heading: "The habit",
				content: "Shipping small — The habit\n\nOne change.\n\nDetails\n\nMore.",
			},
			// The h3 took "details", so the repeated heading is -1, as on the page.
			{ key: "the-habit-1", heading: "The habit", content: "Shipping small — The habit\n\nAgain." },
		]);
	});

	it("keeps a document without body or fields findable by its title", () => {
		expect(
			documentChunks({ title: "Profile", tags: [], attributes: {}, body: null, fields }),
		).toEqual([{ key: "", heading: null, content: "Profile" }]);
	});

	it("puts list items and table rows on their own lines", () => {
		const [summary] = documentChunks({
			title: "T",
			tags: [],
			attributes: {},
			body: tree("- one\n- two\n\n| a | b |\n| - | - |\n| 1 | 2 |"),
			fields: [],
		});
		expect(summary.content).toBe("T\n\none\ntwo\n\na | b\n1 | 2");
	});

	it("splits a long section into numbered parts", () => {
		const paragraph = Array.from({ length: 200 }, () => "word").join(" ");
		const chunks = documentChunks({
			title: "T",
			tags: [],
			attributes: {},
			body: tree(`## Long\n\n${paragraph}\n\n${paragraph}`),
			fields: [],
		});
		expect(chunks.map((c) => c.key)).toEqual(["", "long", "long:2"]);
		expect(anchorOf("long:2")).toBe("long");
		expect(anchorOf("")).toBeNull();
	});
});

describe("splitText", () => {
	it("cuts a single paragraph that is too long at words", () => {
		const parts = splitText(Array.from({ length: 650 }, (_, i) => `w${i}`).join(" "));
		expect(parts.map((p) => p.split(" ").length)).toEqual([300, 300, 50]);
	});
});

describe("toSnippet", () => {
	it("drops the title line and cuts at a word", () => {
		expect(toSnippet("Title — Heading\n\nShort text.")).toBe("Short text.");
		const long = toSnippet(`Title\n\n${"lorem ipsum ".repeat(40)}`);
		expect(long.length).toBeLessThanOrEqual(201);
		expect(long.endsWith("…")).toBe(true);
	});
});

describe("planSync", () => {
	it("embeds only new or changed chunks and removes keys that are gone", () => {
		const chunks = [
			{ key: "", heading: null, content: "A" },
			{ key: "b", heading: "B", content: "B" },
		];
		const first = planSync([], chunks);
		expect(first.write.map((c) => c.key)).toEqual(["", "b"]);

		const stored = [
			{ key: "", contentHash: first.write[0].contentHash },
			{ key: "gone", contentHash: "x" },
		];
		const next = planSync(stored, chunks);
		expect(next.write.map((c) => c.key)).toEqual(["b"]);
		expect(next.remove).toEqual(["gone"]);
		// A new model re-embeds everything, and so does a first key after keyword-only chunks.
		expect(planSync(stored, chunks, "other-model").write).toHaveLength(2);
		const unembedded = planSync([], chunks, null).write.map((c) => ({
			key: c.key,
			contentHash: c.contentHash,
		}));
		expect(planSync(unembedded, chunks, null).write).toHaveLength(0);
		expect(planSync(unembedded, chunks).write).toHaveLength(2);
	});
});
