import type { Root } from "mdast";
import type { Field, FieldType } from "./fields.ts";

// The one stored form of a config and a document. Every write path canonicalizes before
// validating, so equal content is always stored (and exported) identically: no `required: false`
// next to an absent `required`, no `""` next to `null`, fixed key order. See docs: Files.

const isObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const FLAGS = ["required", "multiline"];

// Field properties in file order; unknown ones go last (and fail validation).
const FIELD_ORDER = [
	"key",
	"label",
	"type",
	"required",
	"help",
	"multiline",
	"options",
	"of",
	"fields",
];

function ordered(source: Record<string, unknown>, order: string[]) {
	const out: Record<string, unknown> = {};
	for (const key of [...order, ...Object.keys(source)]) {
		if (!(key in out) && source[key] !== undefined) out[key] = source[key];
	}
	return out;
}

const trimmed = (value: unknown) => (typeof value === "string" ? value.trim() : value);

function canonicalField(value: unknown): unknown {
	if (!isObject(value)) return value;
	const field: Record<string, unknown> = { ...value };
	for (const key of ["key", "label", "help"]) field[key] = trimmed(field[key]);
	if (field.help === "" || field.help === null) delete field.help;
	for (const flag of FLAGS) if (field[flag] === false) delete field[flag];
	if (Array.isArray(field.options)) field.options = field.options.map(trimmed);
	if (field.of !== undefined) field.of = canonicalField(field.of);
	if (Array.isArray(field.fields)) field.fields = field.fields.map(canonicalField);
	return ordered(field, FIELD_ORDER);
}

/** A config in its one stored form (validate it afterwards). */
export function canonicalConfig<T>(config: T): T {
	if (!isObject(config)) return config;
	const out: Record<string, unknown> = { ...config };
	if (Array.isArray(out.fields)) out.fields = out.fields.map(canonicalField);
	return ordered(out, ["fields"]) as T;
}

/** Field definitions only (e.g. read back from jsonb, which doesn't keep key order). */
export function canonicalFields(fields: Field[]): Field[] {
	return fields.map(canonicalField) as Field[];
}

export type Kind = "folder" | "document" | "image";
export type Status = "draft" | "published";
export const STATUSES: Status[] = ["draft", "published"];

/** A document as Spotcraft stores and exports it. */
export type DocumentRecord = {
	id: string;
	/** Where it sits, e.g. `posts/shipping-small`; its slug is the last segment. */
	path: string;
	title: string;
	status: Status;
	/** When it was first published (a "posted on" date): ISO 8601, ms, UTC. Null for drafts. */
	publishedAt: string | null;
	tags: string[];
	/** Field values by key, for the fields its chain of configs defines. */
	attributes: Record<string, unknown>;
	/** Front-matter keys that match no field, as text. */
	extras: Record<string, string>;
	/** The body's Markdown tree (see body.ts); null when empty. */
	body: Root | null;
};

const blank = (value: unknown) => value === undefined || value === null;

/** One value in stored form, or undefined for "absent". Never changes a value's type. */
function canonicalValue(field: FieldType, value: unknown): unknown {
	if (blank(value)) return undefined;
	switch (field.type) {
		case "boolean":
			return value === false ? undefined : value;
		case "number":
			return Object.is(value, -0) ? 0 : value;
		case "markdown":
			return typeof value === "string" && !value.trim() ? undefined : value;
		case "list": {
			if (!Array.isArray(value)) return value;
			const items = value
				.map((item) => canonicalValue(field.of, item))
				.filter((i) => i !== undefined);
			return items.length ? items : undefined;
		}
		case "object": {
			if (!isObject(value)) return value;
			const object = canonicalData(field.fields, value);
			return Object.keys(object).length ? object : undefined;
		}
		case "image": {
			if (!isObject(value)) return value;
			const image = ordered({ ...value, src: trimmed(value.src), alt: trimmed(value.alt) }, [
				"src",
				"alt",
			]);
			return image.src === "" && image.alt === "" ? undefined : image;
		}
		default: {
			const text = trimmed(value);
			return text === "" ? undefined : text;
		}
	}
}

/**
 * `data` in stored form: fields in definition order, empty values and `false` absent, text
 * trimmed. Types are never coerced, so wrong values still fail validation; unknown keys are
 * kept (last) for the same reason.
 */
export function canonicalData(fields: Field[], data: Record<string, unknown>) {
	const out: Record<string, unknown> = {};
	const known = new Set<string>();
	for (const field of fields) {
		known.add(field.key);
		const value = canonicalValue(field, data[field.key]);
		if (value !== undefined) out[field.key] = value;
	}
	for (const [key, value] of Object.entries(data)) {
		if (!known.has(key) && value !== undefined) out[key] = value;
	}
	return out;
}

/** Milliseconds, UTC — what a timestamp is stored and exported as. */
export function canonicalTime(value: string | Date) {
	return new Date(value).toISOString();
}

/** Keys sorted, so equal extras are always stored and written the same way. */
export function canonicalExtras(extras: Record<string, string>) {
	return Object.fromEntries(
		Object.entries(extras).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
	);
}

export function canonicalDocument(fields: Field[], doc: DocumentRecord): DocumentRecord {
	const published = doc.status === "published";
	return {
		id: doc.id,
		path: doc.path,
		title: doc.title.trim(),
		status: doc.status,
		publishedAt: published && doc.publishedAt ? canonicalTime(doc.publishedAt) : null,
		tags: doc.tags.map((t) => t.trim()),
		attributes: canonicalData(fields, doc.attributes),
		extras: canonicalExtras(doc.extras),
		body: doc.body?.children.length ? doc.body : null,
	};
}

/** Equal as JSON, whatever the key order (jsonb doesn't keep it). */
export function sameJson(a: unknown, b: unknown): boolean {
	const sorted = (value: unknown): unknown =>
		Array.isArray(value)
			? value.map(sorted)
			: value && typeof value === "object"
				? Object.fromEntries(
						Object.keys(value)
							.sort()
							.map((key) => [key, sorted((value as Record<string, unknown>)[key])]),
					)
				: value;
	return JSON.stringify(sorted(a)) === JSON.stringify(sorted(b));
}
