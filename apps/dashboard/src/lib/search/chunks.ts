import { createHash } from "node:crypto";
import type { Nodes, Root, RootContent } from "mdast";
import { toString as textOf } from "mdast-util-to-string";
import type { Field } from "../content/fields.ts";
import { headingAnchors } from "../content/headings.ts";
import { EMBEDDING_MODEL } from "./model.ts";

// What search embeds for one published document: a summary chunk (title, its text fields, the body
// before the first section, tags) and one chunk per `#`/`##` section (`###` and below stay in
// theirs). Long ones are split by paragraph. Pure — also imported by scripts run with Node's type
// stripping (relative imports with extensions). Docs: Reading content from your site.

const MAX_WORDS = 300;
const MAX_CHARS = 3000;
const SNIPPET_LENGTH = 200;

export type SearchChunk = {
	/** "" for the summary, the heading's anchor for a section; later parts add `:2`, `:3`, … */
	key: string;
	heading: string | null;
	content: string;
};

export type ChunkSource = {
	title: string;
	tags: string[];
	attributes: Record<string, unknown>;
	body: Root | null;
	/** The document's fields: their text and Markdown values go in the summary. */
	fields: Field[];
};

/** A block's text, one line per list item or table row. */
function blockText(node: Nodes): string {
	switch (node.type) {
		case "list":
		case "blockquote":
		case "table":
			return node.children.map(blockText).filter(Boolean).join("\n");
		case "listItem":
			return node.children.map(blockText).filter(Boolean).join(" ");
		case "tableRow":
			return node.children.map((cell) => textOf(cell)).join(" | ");
		case "code":
		case "html":
			return node.value;
		case "thematicBreak":
			return "";
		default:
			return textOf(node).replace(/\s+/g, " ").trim();
	}
}

const fits = (text: string) => text.length <= MAX_CHARS && text.split(/\s+/).length <= MAX_WORDS;

/** Paragraphs packed into parts of at most 300 words / 3000 characters, no overlap. */
export function splitText(text: string): string[] {
	const parts: string[] = [];
	let current = "";
	for (const paragraph of text.split(/\n{2,}/)) {
		const joined = current ? `${current}\n\n${paragraph}` : paragraph;
		if (fits(joined)) {
			current = joined;
			continue;
		}
		if (current) parts.push(current);
		current = paragraph;
		while (!fits(current)) {
			let cut = "";
			for (const word of current.split(/(\s+)/)) {
				if (!fits(cut + word)) break;
				cut += word;
			}
			parts.push(cut.trim());
			current = current.slice(cut.length).trim();
		}
	}
	if (current) parts.push(current);
	return parts;
}

const partKey = (key: string, index: number) => (index ? `${key}:${index + 1}` : key);

/** The chunks of one document, in reading order. */
export function documentChunks(doc: ChunkSource): SearchChunk[] {
	const anchors = headingAnchors(doc.body);
	const intro: string[] = [];
	const sections: { anchor: string; heading: string; blocks: string[] }[] = [];

	for (const node of doc.body?.children ?? ([] as RootContent[])) {
		if (node.type === "heading") {
			const heading = textOf(node).trim();
			// The same ids as the API's `headings` (src/lib/content/headings.ts) and the page.
			const anchor = anchors.get(node)?.anchor || `section-${sections.length + 1}`;
			if (node.depth <= 2) {
				sections.push({ anchor, heading, blocks: [] });
				continue;
			}
		}
		const text = blockText(node);
		if (text) (sections.at(-1)?.blocks ?? intro).push(text);
	}

	const fieldText = doc.fields
		.filter((f) => f.type === "text" || f.type === "markdown")
		.map((f) => doc.attributes[f.key])
		.filter((v): v is string => typeof v === "string" && v.trim() !== "")
		.map((v) => v.trim());
	const tags = doc.tags.length ? [`Tags: ${doc.tags.join(", ")}`] : [];

	const chunks: SearchChunk[] = [];
	const summary = [...fieldText, ...intro, ...tags].join("\n\n");
	(summary ? splitText(summary) : [""]).forEach((part, i) => {
		const content = part ? `${doc.title}\n\n${part}` : doc.title;
		chunks.push({ key: partKey("", i), heading: null, content });
	});
	for (const section of sections) {
		splitText(section.blocks.join("\n\n")).forEach((part, i) => {
			chunks.push({
				key: partKey(section.anchor, i),
				heading: section.heading,
				content: `${doc.title} — ${section.heading}\n\n${part}`,
			});
		});
	}
	return chunks;
}

/**
 * Changes whenever the text, or how it's embedded, changes. `model` null: not embedded (keyword
 * search only), so adding a key later re-writes every chunk, with its embedding.
 */
export function chunkHash(chunk: SearchChunk, model: string | null = EMBEDDING_MODEL): string {
	return createHash("sha256")
		.update(JSON.stringify([model ?? "none", chunk.key, chunk.heading, chunk.content]))
		.digest("hex");
}

/** A chunk's key as a link target: null for the summary, else the heading's anchor. */
export const anchorOf = (key: string) => key.replace(/:\d+$/, "") || null;

/** The chunk without its "Title — Heading" line, flattened and cut at a word. */
export function toSnippet(content: string): string {
	const text = content
		.split(/\n{2,}/)
		.slice(1)
		.join(" ")
		.replace(/\s+/g, " ")
		.trim();
	if (text.length <= SNIPPET_LENGTH) return text;
	const cut = text.lastIndexOf(" ", SNIPPET_LENGTH);
	return `${text.slice(0, cut > 0 ? cut : SNIPPET_LENGTH)}…`;
}

/**
 * What a sync must do for one document: write new or changed chunks (embedded with `model`, or not
 * with null), delete keys that are gone.
 */
export function planSync(
	stored: { key: string; contentHash: string }[],
	chunks: SearchChunk[],
	model: string | null = EMBEDDING_MODEL,
): { write: (SearchChunk & { contentHash: string })[]; remove: string[] } {
	const have = new Map(stored.map((s) => [s.key, s.contentHash]));
	const keys = new Set(chunks.map((c) => c.key));
	return {
		write: chunks
			.map((c) => ({ ...c, contentHash: chunkHash(c, model) }))
			.filter((c) => have.get(c.key) !== c.contentHash),
		remove: stored.map((s) => s.key).filter((key) => !keys.has(key)),
	};
}
