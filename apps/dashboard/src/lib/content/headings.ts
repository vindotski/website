import GithubSlugger from "github-slugger";
import type { Heading, Nodes, Root } from "mdast";
import { toString as textOf } from "mdast-util-to-string";

// A body's headings and their ids, made the way GitHub and rehype-slug make them: every heading in
// document order, its text without image alt, duplicates numbered (`setup`, `setup-1`). The public
// API returns them (`headings`) and search links to them (`anchor`), so both come from here.
// Pure — also imported by scripts run with Node's type stripping.

export type DocumentHeading = { depth: number; text: string; anchor: string };

/** Every heading in the body with its anchor, keyed by its node. */
export function headingAnchors(body: Root | null): Map<Heading, DocumentHeading> {
	const slugger = new GithubSlugger();
	const anchors = new Map<Heading, DocumentHeading>();
	const walk = (node: Nodes) => {
		if (node.type === "heading") {
			const text = textOf(node, { includeImageAlt: false }).trim();
			anchors.set(node, { depth: node.depth, text, anchor: slugger.slug(text) });
			return;
		}
		if ("children" in node) for (const child of node.children) walk(child);
	};
	if (body) walk(body);
	return anchors;
}

/** The body's headings, in order: for a table of contents. */
export const headingsOf = (body: Root | null): DocumentHeading[] => [
	...headingAnchors(body).values(),
];
