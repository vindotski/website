import { Document, parse, visit } from "yaml";
import { canonicalSite, SITE_COLUMNS, type SiteSettings, validateSite } from "../site/settings.ts";
import { markdownToTree, treeToMarkdown } from "./body.ts";
import {
	canonicalConfig,
	canonicalData,
	canonicalDocument,
	canonicalExtras,
	canonicalTime,
	type DocumentRecord,
	STATUSES,
	type Status,
} from "./canonical.ts";
import {
	type Config,
	configSchema,
	EXTRAS_KEY,
	type Field,
	isStorable,
	PATH,
	RESERVED_KEYS,
	tagsSchema,
} from "./fields.ts";
import { validateData } from "./validate.ts";

// Content as files: a folder's fields as `_config.json`, a document as `<path>/index.md`
// (YAML front matter + Markdown body), images as themselves. Losslessly: database → file →
// database is the identity, and file → database → file gives the same bytes for any file written
// here. See docs: Files.

export type FileErrors = Record<string, string[]>;
export type Parsed<T> = { ok: true; value: T } | { ok: false; errors: FileErrors };

// ─── YAML ────────────────────────────────────────────────────────────────────

const YAML_12 = { version: "1.2", schema: "core" } as const;

/** A plain scalar YAML 1.1 or 1.2 would read as something other than this string. */
function ambiguous(value: string) {
	if (value.includes("\n")) return false; // block scalars are always strings
	for (const options of [YAML_12, { version: "1.1" } as const]) {
		try {
			// Silent: a lone scalar like "%s · Site" reads as a directive; it's quoted either way.
			if (parse(value, { ...options, logLevel: "silent" }) !== value) return true;
		} catch {
			return true;
		}
	}
	return false;
}

/**
 * Deterministic YAML that YAML 1.1 parsers (js-yaml, gray-matter) and YAML 1.2 parsers read
 * the same: strings like `no`, `2024-05-01` or `0o12` are quoted. No folding, no aliases.
 */
export function toYaml(value: unknown) {
	const doc = new Document(value, { ...YAML_12, aliasDuplicateObjects: false });
	visit(doc, {
		Scalar(_key, node) {
			if (typeof node.value === "string" && ambiguous(node.value)) node.type = "QUOTE_DOUBLE";
		},
	});
	return doc.toString({ lineWidth: 0, minContentWidth: 0, indent: 2, indentSeq: true });
}

/** YAML 1.2 (core schema), strict, unique keys. */
export function fromYaml(text: string): Parsed<unknown> {
	try {
		return {
			ok: true,
			value: parse(text, { ...YAML_12, strict: true, uniqueKeys: true, prettyErrors: false }),
		};
	} catch (error) {
		return { ok: false, errors: { "(file)": [(error as Error).message] } };
	}
}

const isObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

function unknownKeys(source: Record<string, unknown>, allowed: readonly string[]) {
	const errors: FileErrors = {};
	for (const key of Object.keys(source)) {
		if (!allowed.includes(key)) errors[key] = ["Unknown key"];
	}
	return errors;
}

function zodErrors(issues: { path: PropertyKey[]; message: string }[], prefix = "") {
	const errors: FileErrors = {};
	for (const issue of issues) {
		const key = prefix + (issue.path.map(String).join(".") || "(root)");
		errors[key] = [...(errors[key] ?? []), issue.message];
	}
	return errors;
}

// ─── Configs ─────────────────────────────────────────────────────────────────

/** `_config.json`: two-space indent, fixed key order, a trailing newline. */
export function configToJson(config: Config) {
	return `${JSON.stringify(canonicalConfig(config), null, 2)}\n`;
}

export function jsonToConfig(text: string): Parsed<Config> {
	let value: unknown;
	try {
		value = JSON.parse(text);
	} catch (error) {
		return { ok: false, errors: { "(file)": [(error as Error).message] } };
	}
	if (!isObject(value)) return { ok: false, errors: { "(file)": ["Expected an object"] } };
	const result = configSchema.safeParse(canonicalConfig(value));
	if (!result.success) return { ok: false, errors: zodErrors(result.error.issues) };
	return { ok: true, value: canonicalConfig(result.data) };
}

// ─── Documents ───────────────────────────────────────────────────────────────

/** Front-matter keys every document has, in file order; its fields follow, then its extras. */
export const STANDARD_KEYS = ["id", "title", "status", "published_at", "tags"] as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const FENCE = "---\n";

export function documentToMarkdown(fields: Field[], record: DocumentRecord) {
	const doc = canonicalDocument(fields, record);
	const front: Record<string, unknown> = { id: doc.id, title: doc.title, status: doc.status };
	if (doc.publishedAt) front.published_at = doc.publishedAt;
	front.tags = doc.tags;
	Object.assign(front, doc.attributes, doc.extras);
	return `${FENCE}${toYaml(front)}${FENCE}${treeToMarkdown(doc.body)}`;
}

/**
 * A new document's file: the standard keys, then each required field with no value yet (so a save
 * says what's missing). Optional fields are left out; the dashboard lists them.
 */
export function documentTemplate(fields: Field[], id: string) {
	const required = fields.filter((f) => f.required).map((f) => `${f.key}:\n`);
	return `${FENCE}id: ${id}\ntitle: ""\nstatus: draft\ntags: []\n${required.join("")}${FENCE}`;
}

/** The body of a document's file (everything after the front matter), for previews. */
export function bodyOf(text: string) {
	const split = splitFrontMatter(text);
	return split.ok ? split.value.body : text;
}

/** Splits `---\n<yaml>---\n<body>`; the first line that is exactly `---` closes the front matter. */
function splitFrontMatter(text: string): Parsed<{ yaml: string; body: string; bodyLine: number }> {
	if (!text.startsWith(FENCE)) {
		return {
			ok: false,
			errors: { "(file)": ["Must start with a --- line (front matter, LF line endings)"] },
		};
	}
	const rest = text.slice(FENCE.length);
	const close = rest.startsWith(FENCE) ? 0 : rest.indexOf(`\n${FENCE}`);
	const closeAtEnd = rest.endsWith("\n---") ? rest.length - 3 : -1;
	if (close === -1 && closeAtEnd === -1) {
		return { ok: false, errors: { "(file)": ["Front matter isn't closed with a --- line"] } };
	}
	if (close === -1) {
		return { ok: true, value: { yaml: rest.slice(0, closeAtEnd), body: "", bodyLine: 1 } };
	}
	const yamlEnd = close === 0 ? 0 : close + 1;
	const yaml = rest.slice(0, yamlEnd);
	// The body's first line in the file: after the opening fence, the YAML and the closing fence.
	const bodyLine = 2 + (yaml.match(/\n/g)?.length ?? 0) + 1;
	return { ok: true, value: { yaml, body: rest.slice(yamlEnd + FENCE.length), bodyLine } };
}

/** An extras value as text: strings as they are, anything else as JSON. */
const asText = (value: unknown) => (typeof value === "string" ? value : JSON.stringify(value));

export type ParsedDocument = { record: DocumentRecord; extrasFromFile: string[] };

/**
 * Reads `<path>/index.md` for a document with these fields. Keys that match no field are kept in
 * `extras` (as text, and listed in `extrasFromFile`); keys that can't be an extras key are errors.
 */
export function markdownToDocument(
	fields: Field[],
	path: string,
	text: string,
	/** For a new file without an `id` key: the id it gets. */
	opts: { newId?: string } = {},
): Parsed<ParsedDocument> {
	const split = splitFrontMatter(text);
	if (!split.ok) return split;
	const parsed = fromYaml(split.value.yaml);
	if (!parsed.ok) return parsed;
	const front = parsed.value ?? {};
	if (!isObject(front))
		return { ok: false, errors: { "(file)": ["Front matter must be a mapping"] } };

	const errors: FileErrors = {};
	const fail = (key: string, message: string) => {
		errors[key] = [...(errors[key] ?? []), message];
	};
	const str = (key: string) =>
		typeof front[key] === "string" ? (front[key] as string) : undefined;

	if (!PATH.test(path) || !path) fail("(file)", `Bad document path: ${path}`);
	const id = "id" in front ? str("id") : opts.newId;
	if (!id || !UUID.test(id)) fail("id", "Expected a lowercase UUID");
	const title = str("title")?.trim();
	if (!title) fail("title", "Required");
	else if (!isStorable(title)) fail("title", "Contains characters that can't be stored");
	const status = front.status as Status;
	if (!STATUSES.includes(status)) fail("status", "Expected draft or published");
	const publishedAt = front.published_at;
	if (status === "published") {
		if (typeof publishedAt !== "string" || Number.isNaN(Date.parse(publishedAt))) {
			fail("published_at", "Published documents need an ISO date and time");
		}
	} else if (status === "draft" && publishedAt !== undefined) {
		fail("published_at", "Drafts have no publish date");
	}
	const tags = tagsSchema.safeParse(front.tags ?? []);
	if (!tags.success) for (const issue of tags.error.issues) fail("tags", issue.message);
	if ("slug" in front) fail("slug", "The slug is the folder's name; remove this key");

	const fieldKeys = new Set(fields.map((f) => f.key));
	const raw: Record<string, unknown> = {};
	const extras: Record<string, string> = {};
	for (const [key, value] of Object.entries(front)) {
		if (RESERVED_KEYS.includes(key)) continue;
		if (fieldKeys.has(key)) raw[key] = value;
		else if (!EXTRAS_KEY.test(key)) fail(key, "Unknown key, and not usable as an extra");
		else if (value !== null && value !== undefined) {
			const text = asText(value);
			if (!isStorable(text)) fail(key, "Contains characters that can't be stored");
			else extras[key] = text;
		}
	}
	for (const key of Object.keys(front)) {
		if (RESERVED_KEYS.includes(key) && !(STANDARD_KEYS as readonly string[]).includes(key)) {
			if (key !== "slug") fail(key, "Reserved key");
		}
	}

	const data = validateData(fields, canonicalData(fields, raw));
	if (!data.ok) {
		for (const [p, messages] of Object.entries(data.errors)) for (const m of messages) fail(p, m);
	}

	let body: DocumentRecord["body"] = null;
	if (!isStorable(split.value.body)) fail("body", "Contains characters that can't be stored");
	else {
		const tree = markdownToTree(split.value.body);
		if (tree.ok) body = tree.tree;
		else {
			const line = split.value.bodyLine + tree.problem.line - 1;
			fail("body", `Line ${line}: ${tree.problem.message}`);
		}
	}

	if (Object.keys(errors).length || !data.ok || !tags.success) return { ok: false, errors };
	return {
		ok: true,
		value: {
			record: {
				id: id as string,
				path,
				title: title as string,
				status,
				publishedAt: status === "published" ? canonicalTime(publishedAt as string) : null,
				tags: tags.data,
				attributes: canonicalData(fields, data.data),
				extras: canonicalExtras(extras),
				body,
			},
			extrasFromFile: Object.keys(extras).sort(),
		},
	};
}

// ─── Paths in an export folder ───────────────────────────────────────────────

const checked = (path: string) => {
	if (!PATH.test(path)) throw new Error(`Bad path: ${path}`);
	return path;
};

/** A folder's (or document's) config file; the root's is `_config.json`. */
export const configFile = (path: string) =>
	checked(path) ? `${path}/_config.json` : "_config.json";

/** A document's file. */
export const documentFile = (path: string) => {
	if (!checked(path)) throw new Error("The root isn't a document");
	return `${path}/index.md`;
};

export const CONFIG_FILE = "_config.json";
export const DOCUMENT_FILE = "index.md";
export const SITE_FILE = "site.yaml";

// ─── Site settings ───────────────────────────────────────────────────────────

/** site.yaml: column names, empty values left out. */
export function siteToYaml(settings: SiteSettings) {
	const canonical = canonicalSite(settings);
	const file: Record<string, unknown> = {};
	for (const [key, column] of SITE_COLUMNS) {
		const value = canonical[key];
		if (value !== null) file[column] = value;
	}
	return toYaml(file);
}

export function yamlToSite(text: string): Parsed<SiteSettings> {
	const parsed = fromYaml(text);
	if (!parsed.ok) return parsed;
	if (!isObject(parsed.value)) return { ok: false, errors: { "(file)": ["Expected a mapping"] } };
	const source = parsed.value;
	const errors = unknownKeys(
		source,
		SITE_COLUMNS.map(([, column]) => column),
	);
	if (Object.keys(errors).length) return { ok: false, errors };
	const values = Object.fromEntries(SITE_COLUMNS.map(([key, column]) => [key, source[column]]));
	const checked = validateSite(values);
	if (!checked.ok) {
		const byColumn = new Map<string, string>(SITE_COLUMNS);
		return {
			ok: false,
			errors: Object.fromEntries(
				Object.entries(checked.errors).map(([key, messages]) => [
					byColumn.get(key) ?? key,
					messages ?? [],
				]),
			),
		};
	}
	return { ok: true, value: checked.value };
}
