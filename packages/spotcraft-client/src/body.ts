import GithubSlugger from "github-slugger";
import type { Heading, Nodes, Root, RootContent } from "mdast";

// Helpers for rendering a document's body (mdast): heading ids that match what Spotcraft gives out
// (`headings`, search's `anchor`), and the body split into its sections.

/** A node's text, without image alt (as rehype-slug and GitHub read a heading). */
function textOf(node: Nodes): string {
	if ("value" in node && typeof node.value === "string") return node.value;
	if ("children" in node) return node.children.map((child) => textOf(child as Nodes)).join("");
	return "";
}

/**
 * Every heading's id, in document order, as GitHub and rehype-slug make them (repeats get `-1`,
 * `-2`): set them as the rendered headings' `id`s, and links from search land on them.
 */
export function headingAnchors(body: Root | null): Map<Heading, string> {
	const slugger = new GithubSlugger();
	const anchors = new Map<Heading, string>();
	const walk = (node: Nodes) => {
		if (node.type === "heading") {
			anchors.set(node, slugger.slug(textOf(node).trim()));
			return;
		}
		if ("children" in node) for (const child of node.children) walk(child as Nodes);
	};
	if (body) walk(body);
	return anchors;
}

export type Section = {
	/** null for what comes before the first heading. */
	heading: string | null;
	anchor: string | null;
	depth: number | null;
	/** The section's nodes, after its heading (`###` and below stay in it). */
	children: RootContent[];
};

/** The body cut at its `#` and `##` headings: for a table of contents, or a page per section. */
export function sections(body: Root | null): Section[] {
	const anchors = headingAnchors(body);
	const result: Section[] = [];
	for (const node of body?.children ?? []) {
		if (node.type === "heading" && node.depth <= 2) {
			result.push({
				heading: textOf(node).trim(),
				anchor: anchors.get(node) ?? null,
				depth: node.depth,
				children: [],
			});
			continue;
		}
		if (!result.length) result.push({ heading: null, anchor: null, depth: null, children: [] });
		result[result.length - 1].children.push(node);
	}
	return result;
}
