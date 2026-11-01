import type { Nodes, Root } from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmFromMarkdown, gfmToMarkdown } from "mdast-util-gfm";
import { type Options, toMarkdown } from "mdast-util-to-markdown";
import { gfm } from "micromark-extension-gfm";

// A document's body is stored as its Markdown syntax tree (mdast, CommonMark + GFM, no source
// positions), never as Markdown text. Text is parsed into a tree on the way in and written back
// with one fixed style on the way out, so the same tree always gives the same file. Every tree
// that's stored must survive that trip unchanged; see docs: Files.

export type BodyProblem = { line: number; message: string };
export type BodyResult = { ok: true; tree: Root | null } | { ok: false; problem: BodyProblem };

// The one style a body is written in.
const WRITE: Options = {
	bullet: "-",
	bulletOther: "*",
	emphasis: "_",
	strong: "*",
	fence: "`",
	fences: true,
	rule: "-",
	ruleRepetition: 3,
	ruleSpaces: false,
	listItemIndent: "one",
	incrementListMarker: true,
	setext: false,
	closeAtx: false,
	resourceLink: false,
	quote: '"',
	extensions: [gfmToMarkdown()],
};

const parse = (text: string) =>
	fromMarkdown(text, { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] });

/** The tree as stored: plain JSON, no positions. */
function stripped(node: unknown): unknown {
	if (Array.isArray(node)) return node.map(stripped);
	if (typeof node !== "object" || node === null) return node;
	const out: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(node)) {
		if (key !== "position" && value !== undefined) out[key] = stripped(value);
	}
	return out;
}

/** Equal as JSON, whatever the key order (jsonb doesn't keep it). */
export function sameTree(a: unknown, b: unknown): boolean {
	if (a === b) return true;
	if (Array.isArray(a) || Array.isArray(b)) {
		return (
			Array.isArray(a) &&
			Array.isArray(b) &&
			a.length === b.length &&
			a.every((item, i) => sameTree(item, b[i]))
		);
	}
	if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
	const ka = Object.keys(a);
	const rb = b as Record<string, unknown>;
	return (
		ka.length === Object.keys(rb).length &&
		ka.every((key) => key in rb && sameTree((a as Record<string, unknown>)[key], rb[key]))
	);
}

function firstHtml(node: Nodes): Nodes | null {
	if (node.type === "html") return node;
	if ("children" in node) {
		for (const child of node.children) {
			const found = firstHtml(child);
			if (found) return found;
		}
	}
	return null;
}

/** The body's Markdown in the one stored style. An empty body is "". */
export function treeToMarkdown(tree: Root | null): string {
	if (!tree || !tree.children.length) return "";
	return toMarkdown(tree, WRITE);
}

/**
 * Parses a body. Refuses raw HTML (bodies stay plain Markdown, safe to render without a
 * sanitizer) and Markdown that wouldn't come back the same after being written out.
 */
export function markdownToTree(text: string): BodyResult {
	if (!text.trim()) return { ok: true, tree: null };
	let parsed: Root;
	try {
		parsed = parse(text);
	} catch (error) {
		return { ok: false, problem: { line: 1, message: (error as Error).message } };
	}
	const html = firstHtml(parsed);
	if (html) {
		return {
			ok: false,
			problem: {
				line: html.position?.start.line ?? 1,
				message: "HTML isn't allowed in a body. Use Markdown, or write < as \\<.",
			},
		};
	}
	const tree = stripped(parsed) as Root;
	const again = stripped(parse(toMarkdown(tree, WRITE))) as Root;
	if (!sameTree(tree, again)) {
		const at = tree.children.findIndex((child, i) => !sameTree(child, again.children[i]));
		return {
			ok: false,
			problem: {
				line: parsed.children[Math.max(at, 0)]?.position?.start.line ?? 1,
				message: "This Markdown can't be stored exactly as written. Simplify it here.",
			},
		};
	}
	return { ok: true, tree };
}

/** Checks a tree read back from storage or built in code: it must write and parse to itself. */
export function isStableTree(tree: Root): boolean {
	return sameTree(stripped(parse(toMarkdown(tree, WRITE))), tree);
}

/** One-line error for a form: "Line 3: …". */
export const describeBodyProblem = (problem: BodyProblem) =>
	`Line ${problem.line}: ${problem.message}`;
