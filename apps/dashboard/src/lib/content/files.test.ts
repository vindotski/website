import fc from "fast-check";
import { describe, expect, it, vi } from "vitest";
import { parse } from "yaml";
import { markdownToTree, sameTree, treeToMarkdown } from "./body";
import {
	canonicalConfig,
	canonicalData,
	canonicalDocument,
	canonicalFields,
	type DocumentRecord,
} from "./canonical";
import {
	type Config,
	configSchema,
	EXTRAS_KEY,
	type Field,
	type FieldShape,
	type FieldType,
	type ItemType,
	isStorable,
	RESERVED_KEYS,
} from "./fields";
import {
	bodyOf,
	configToJson,
	documentTemplate,
	documentToMarkdown,
	fromYaml,
	jsonToConfig,
	markdownToDocument,
	siteToYaml,
	toYaml,
	yamlToSite,
} from "./files";
import { validateData } from "./validate";

// Property-based proof of the file round trips (docs: Files). Generators produce canonical,
// valid configs and documents; every property must hold for all of them.

// FC_RUNS=5000 pnpm test … for a deeper search.
const RUNS = { numRuns: Number(process.env.FC_RUNS ?? 250) };
vi.setConfig({ testTimeout: 120_000 });

// Strings that trip up YAML (1.1 and 1.2), JSON, front matter or Markdown.
const HARD = [
	"no",
	"yes",
	"on",
	"off",
	"y",
	"n",
	"~",
	"null",
	"true",
	"2024-05-01",
	"2026-10-31T09:00:00.000Z",
	"123",
	"0o12",
	"0x1F",
	"1_000",
	"1:20",
	".inf",
	"-.5",
	"---",
	"...",
	"a: b",
	"- item",
	"#hash",
	"'single'",
	'"double"',
	"<<",
	"=",
	"!tag",
	"&anchor",
	"*alias",
	"%percent",
	"@at",
	"`tick`",
	"😀 漢字 ñ",
	"tab\there",
	"trailing  ",
	" line sep",
];

const anyText = fc
	.oneof(
		fc.constantFrom(...HARD),
		fc.string({ unit: "grapheme", maxLength: 12 }),
		fc.string({ unit: "binary", maxLength: 6 }),
	)
	.filter(isStorable);
/** A canonical single-line value: trimmed, not empty. */
const text = anyText.map((s) => s.replace(/[\r\n]/g, " ").trim()).filter((s) => s.length > 0);
const multiline = fc
	.array(fc.oneof(anyText, fc.constant("")), { minLength: 1, maxLength: 4 })
	.map((lines) => lines.join("\n"));
const nonBlank = fc.oneof(text, multiline).filter((s) => s.trim().length > 0);
const key = fc.stringMatching(/^[a-z][a-z0-9_]{0,8}$/);
const maybe = <T>(arb: fc.Arbitrary<T>) => fc.option(arb, { nil: undefined });
const strip = <T extends object>(value: T) =>
	Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;

// ─── Configs ─────────────────────────────────────────────────────────────────

const folderPath = fc
	.array(fc.stringMatching(/^[a-z0-9]{1,6}(-[a-z0-9]{1,4})?$/), { minLength: 1, maxLength: 3 })
	.map((parts) => parts.join("/"));

const shapeOf = (depth: number, item: boolean): fc.Arbitrary<FieldShape> => {
	const leaves: fc.Arbitrary<FieldShape>[] = [
		fc
			.record({ multiline: maybe(fc.constant(true as const)) })
			.map((o) => strip({ type: "text" as const, ...o })),
		fc.constant({ type: "markdown" as const }),
		fc.constant({ type: "number" as const }),
		fc.constant({ type: "date" as const }),
		fc.constant({ type: "url" as const }),
		fc
			.uniqueArray(text, { minLength: 1, maxLength: 4 })
			.map((options) => ({ type: "select" as const, options })),
		fc.constant({ type: "image" as const }),
	];
	if (!item) leaves.push(fc.constant({ type: "boolean" as const }));
	if (depth > 0) {
		leaves.push(fieldsOf(depth - 1, false).map((fields) => ({ type: "object" as const, fields })));
		if (!item) {
			leaves.push(
				(shapeOf(depth - 1, true) as fc.Arbitrary<ItemType>).map((of) => ({
					type: "list" as const,
					of,
				})),
			);
		}
	}
	return fc.oneof(...leaves);
};

const fieldsOf = (depth: number, top: boolean): fc.Arbitrary<Field[]> =>
	fc.uniqueArray(
		fc
			.record({
				key: top ? key.filter((k) => !RESERVED_KEYS.includes(k)) : key,
				label: text.map((s) => s.slice(0, 100).trim()).filter(Boolean),
				required: maybe(fc.constant(true as const)),
				help: maybe(text),
				shape: shapeOf(depth, false),
			})
			.map(({ shape, ...named }) => strip({ ...named, ...shape }) as Field),
		// A group needs at least one field.
		{ selector: (f) => f.key, minLength: top ? 0 : 1, maxLength: 4 },
	);

const config: fc.Arbitrary<Config> = fieldsOf(2, true).map((fields) => canonicalConfig({ fields }));

/** jsonb doesn't keep key order: what reading a value back from Postgres looks like. */
const throughJsonb = <T>(value: T): T =>
	JSON.parse(JSON.stringify(value), (_k, v) =>
		v && typeof v === "object" && !Array.isArray(v)
			? Object.fromEntries(Object.entries(v).reverse())
			: v,
	);

describe("configs ⇄ _config.json", () => {
	it("generated configs are valid and canonical (what the builder can express)", () => {
		fc.assert(
			fc.property(config, (c) => {
				expect(configSchema.safeParse(c).success).toBe(true);
				expect(canonicalConfig(c)).toStrictEqual(c);
			}),
			RUNS,
		);
	});

	it("config → JSON → config is the identity, and the bytes are stable", () => {
		fc.assert(
			fc.property(config, (c) => {
				const json = configToJson(c);
				const back = jsonToConfig(json);
				expect(back.ok, JSON.stringify(!back.ok && back.errors)).toBe(true);
				if (!back.ok) return;
				expect(back.value).toStrictEqual(c);
				expect(configToJson(back.value)).toBe(json);
			}),
			RUNS,
		);
	});

	it("survives a trip through jsonb (key order) unchanged", () => {
		fc.assert(
			fc.property(config, (c) => {
				expect(canonicalFields(throughJsonb(c.fields))).toStrictEqual(c.fields);
				expect(configToJson(throughJsonb(c))).toBe(configToJson(c));
			}),
			RUNS,
		);
	});

	it("normalizes hand-written files and rejects what isn't a valid config", () => {
		const loose = '{"fields":[{"type":"text","label":"  Role ","key":"role","required":false}]}';
		const parsed = jsonToConfig(loose);
		expect(parsed.ok && configToJson(parsed.value)).toBe(
			'{\n  "fields": [\n    {\n      "key": "role",\n      "label": "Role",\n      "type": "text"\n    }\n  ]\n}\n',
		);
		const bad = (text: string) => {
			const result = jsonToConfig(text);
			return result.ok ? [] : Object.keys(result.errors);
		};
		expect(bad('{"fields":[],"extra":1}')).toEqual(["(root)"]);
		expect(bad(loose.replace('"required":false', '"colour":"red"'))).toEqual(["fields.0"]);
		expect(bad(loose.replace('"key":"role"', '"key":"title"'))).toEqual(["fields.0.key"]);
		expect(bad(loose.replace('"key":"role"', '"key":"type"'))).toEqual(["fields.0.key"]);
		expect(bad('{"fields": [unclosed')).toEqual(["(file)"]);
	});
});

// ─── Bodies ──────────────────────────────────────────────────────────────────

const BODY_PARTS = [
	"# Heading",
	"Some **bold** and _italic_ text, `code` and a [link](https://example.com).",
	"a < b, spaced",
	"Escaped \\< and \\*",
	"---",
	"| a | b |\n| - | - |\n| 1 | 2 |",
	"- one\n- two\n  - nested",
	"1. first\n2. second",
	"- [ ] task\n- [x] done",
	"> quoted\n> text",
	"```ts\nconst a = 1;\n```",
	"A footnote[^1].\n\n[^1]: The note.",
	"![Cover](./images/cover.png)",
	"~~gone~~",
	"trailing spaces  ",
	"",
	"😀 漢字",
];
const markdownText = fc
	.array(
		fc.oneof(
			fc.constantFrom(...BODY_PARTS),
			text.filter((s) => !/[<>]/.test(s)),
		),
		{ minLength: 1, maxLength: 5 },
	)
	.map((parts) => parts.join("\n\n") + (parts.length % 2 ? "\n" : ""))
	.filter((b) => b.trim().length > 0 && isStorable(b));
/** Trees as stored: whatever parses (Markdown that can't be stored exactly is refused). */
const tree = markdownText.chain((md) => {
	const parsed = markdownToTree(md);
	return parsed.ok && parsed.tree ? fc.constant(parsed.tree) : fc.constant(null);
});

describe("bodies ⇄ Markdown", () => {
	it("tree → Markdown → tree is exact, and the Markdown is stable", () => {
		fc.assert(
			fc.property(tree, (t) => {
				if (!t) return;
				const md = treeToMarkdown(t);
				const back = markdownToTree(md);
				expect(back.ok).toBe(true);
				if (!back.ok) return;
				expect(sameTree(back.tree, t)).toBe(true);
				expect(treeToMarkdown(back.tree)).toBe(md);
			}),
			RUNS,
		);
	});

	it("refuses raw HTML, with its line", () => {
		const result = markdownToTree("Fine.\n\n<div>no</div>\n");
		expect(result.ok ? null : result.problem.line).toBe(3);
		expect(markdownToTree("Inline <span>no</span>.").ok).toBe(false);
		expect(markdownToTree("a < b and \\<tag> are text").ok).toBe(true);
	});

	it("stores an empty body as null", () => {
		expect(markdownToTree("  \n\n")).toStrictEqual({ ok: true, tree: null });
		expect(treeToMarkdown(null)).toBe("");
	});
});

// ─── Documents ───────────────────────────────────────────────────────────────

const uuid = fc.uuid({ version: 4 });
const slugPart = fc.stringMatching(/^[a-z0-9]{1,8}$/);

function valueFor(field: FieldType): fc.Arbitrary<unknown> {
	switch (field.type) {
		case "text":
			return field.multiline ? nonBlank.map((s) => s.trim()).filter(Boolean) : text;
		case "markdown":
			return nonBlank;
		case "number":
			return fc
				.oneof(fc.integer(), fc.double({ noNaN: true, noDefaultInfinity: true }))
				.map((n) => (Object.is(n, -0) ? 0 : n));
		case "boolean":
			return fc.constant(true);
		case "date":
			return fc
				.date({ min: new Date("1900-01-01"), max: new Date("2200-12-31"), noInvalidDate: true })
				.map((d) => d.toISOString().slice(0, 10));
		case "url":
			return fc
				.tuple(fc.constantFrom("https", "http"), slugPart, fc.option(slugPart, { nil: "" }))
				.map(([scheme, host, path]) => `${scheme}://${host}.example.com/${path}`);
		case "select":
			return fc.constantFrom(...field.options);
		case "image":
			return fc.tuple(text, fc.oneof(text, fc.constant(""))).map(([src, alt]) => ({ src, alt }));
		case "object":
			return dataOf(field.fields, true);
		case "list":
			return fc.array(valueFor(field.of), { minLength: 1, maxLength: 3 });
	}
}

/** Data for these fields; `nonEmpty` always fills the first field (a group can't be empty). */
function dataOf(fields: Field[], nonEmpty = false): fc.Arbitrary<Record<string, unknown>> {
	const parts = fields.map((f, i) =>
		(f.required || (nonEmpty && i === 0) ? valueFor(f) : maybe(valueFor(f))).map(
			(v) => [f.key, v] as const,
		),
	);
	return fc.tuple(...parts).map((pairs) => strip(Object.fromEntries(pairs)));
}

const tags = fc.uniqueArray(fc.stringMatching(/^[a-z0-9]{1,6}(-[a-z0-9]{1,4})?$/), {
	maxLength: 4,
});
const extrasFor = (fields: Field[]) =>
	fc.dictionary(
		fc
			.stringMatching(/^[A-Za-z0-9](?:[A-Za-z0-9_-]{0,6}[A-Za-z0-9])?$/)
			.filter((k) => !RESERVED_KEYS.includes(k) && !fields.some((f) => f.key === k)),
		anyText,
		{ maxKeys: 3 },
	);

const fieldsAndDocument = config.chain(({ fields }) =>
	fc
		.record({
			id: uuid,
			path: folderPath,
			title: text,
			// A published document's date can be any time, past or future: it's a date, not a schedule.
			published: fc.option(
				fc.date({ min: new Date("1971-01-01"), max: new Date("2100-01-01"), noInvalidDate: true }),
				{ nil: null },
			),
			tags,
			attributes: dataOf(fields),
			extras: extrasFor(fields),
			body: tree,
		})
		.map(
			({ published, ...d }): DocumentRecord =>
				canonicalDocument(fields, {
					...d,
					status: published ? "published" : "draft",
					publishedAt: published?.toISOString() ?? null,
				}),
		)
		.filter((d) => validateData(fields, d.attributes).ok)
		.map((record) => ({ fields, record })),
);

describe("documents ⇄ index.md", () => {
	it("generated documents are valid and canonical", () => {
		fc.assert(
			fc.property(fieldsAndDocument, ({ fields, record }) => {
				expect(canonicalDocument(fields, record)).toStrictEqual(record);
				expect(canonicalData(fields, record.attributes)).toStrictEqual(record.attributes);
				expect(Object.keys(record.extras).every((k) => EXTRAS_KEY.test(k))).toBe(true);
			}),
			RUNS,
		);
	});

	it("document → Markdown → document is the identity, and the bytes are stable", () => {
		fc.assert(
			fc.property(fieldsAndDocument, ({ fields, record }) => {
				const file = documentToMarkdown(fields, record);
				const back = markdownToDocument(fields, record.path, file);
				expect(back.ok, JSON.stringify(!back.ok && back.errors)).toBe(true);
				if (!back.ok) return;
				const { body, ...rest } = back.value.record;
				const { body: expected, ...expectedRest } = record;
				expect(rest).toStrictEqual(expectedRest);
				expect(sameTree(body, expected)).toBe(true);
				expect(documentToMarkdown(fields, back.value.record)).toBe(file);
			}),
			RUNS,
		);
	});

	it("front matter reads the same in YAML 1.1 and 1.2 parsers", () => {
		fc.assert(
			fc.property(fieldsAndDocument, ({ fields, record }) => {
				const file = documentToMarkdown(fields, record);
				const yaml = file.slice(4, file.indexOf("\n---\n", 3) + 1);
				expect(parse(yaml, { version: "1.1" })).toStrictEqual(parse(yaml, { version: "1.2" }));
			}),
			RUNS,
		);
	});

	it("survives jsonb unchanged", () => {
		fc.assert(
			fc.property(fieldsAndDocument, ({ fields, record }) => {
				// Read back from Postgres (key order lost).
				const stored = throughJsonb(record);
				expect(documentToMarkdown(fields, stored)).toBe(documentToMarkdown(fields, record));
			}),
			RUNS,
		);
	});
});

describe("document files", () => {
	const fields: Field[] = [
		{ key: "featured", label: "Featured", type: "boolean" },
		{ key: "source_url", label: "Source", type: "url" },
	];
	const file = [
		"---",
		"id: 7d0e3a4e-4a35-4a35-9a35-3a4e4a354a35",
		"title: Hello",
		"status: published",
		'published_at: "2026-10-31T09:00:00.000Z"',
		"tags:",
		"  - notes",
		"featured: true",
		"mood: sunny",
		"---",
		"# Hello\n\nSome _text_.\n",
	].join("\n");
	const read = (text: string) => markdownToDocument(fields, "posts/hello", text);
	const errors = (text: string) => {
		const result = read(text);
		return result.ok ? {} : result.errors;
	};

	it("reads a canonical file and writes the same bytes back", () => {
		const parsed = read(file);
		expect(parsed.ok).toBe(true);
		if (!parsed.ok) return;
		expect(parsed.value.record.extras).toEqual({ mood: "sunny" });
		expect(parsed.value.extrasFromFile).toEqual(["mood"]);
		expect(documentToMarkdown(fields, parsed.value.record)).toBe(file);
	});

	it("keeps unknown keys as text in extras, after the fields and sorted", () => {
		const parsed = read(file.replace("mood: sunny", "zeta: 3\nalpha: [1, 2]"));
		expect(parsed.ok && parsed.value.record.extras).toEqual({ alpha: "[1,2]", zeta: "3" });
		if (parsed.ok) {
			expect(documentToMarkdown(fields, parsed.value.record)).toContain(
				'featured: true\nalpha: "[1,2]"\nzeta: "3"\n',
			);
		}
	});

	it("reports bad keys, bad values and bodies it can't store instead of dropping them", () => {
		expect(Object.keys(errors(file.replace("mood: sunny", "My Key: 1")))).toEqual(["My Key"]);
		expect(Object.keys(errors(file.replace("featured: true", "featured: no")))).toEqual([
			"featured",
		]);
		expect(Object.keys(errors(file.replace("Some _text_.", "see <b>this</b>")))).toEqual(["body"]);
		expect(errors(file.replace("Some _text_.", "see <b>this</b>")).body?.[0]).toMatch(/^Line 13:/);
		expect(Object.keys(errors(file.replace("status: published", "status: draft")))).toEqual([
			"published_at",
		]);
		expect(Object.keys(errors(file.replace("status: published", "status: live")))).toEqual([
			"status",
		]);
		expect(Object.keys(errors(file.replace("  - notes", "  - Not A Tag")))).toEqual(["tags"]);
		expect(Object.keys(errors(file.replace("title: Hello", "title: Hello\nslug: hi")))).toEqual([
			"slug",
		]);
		expect(Object.keys(errors(file.replace(/^---\n/, "")))).toEqual(["(file)"]);
	});

	it("keeps a published date in the future: it's a date, not a schedule", () => {
		const future = file.replace("2026-10-31T09:00:00.000Z", "2099-01-01T00:00:00.000Z");
		const parsed = read(future);
		expect(parsed.ok && parsed.value.record).toMatchObject({
			status: "published",
			publishedAt: "2099-01-01T00:00:00.000Z",
		});
	});

	it("starts a new file with the standard keys and the required fields to fill in", () => {
		const required: Field[] = [
			...fields,
			{ key: "summary", label: "Summary", type: "text", required: true },
		];
		const template = documentTemplate(required, "7d0e3a4e-4a35-4a35-9a35-3a4e4a354a35");
		expect(template).toBe(
			'---\nid: 7d0e3a4e-4a35-4a35-9a35-3a4e4a354a35\ntitle: ""\nstatus: draft\ntags: []\nsummary:\n---\n',
		);
		// Saving it as it is says what's missing.
		const result = markdownToDocument(required, "posts/new", template);
		expect(result.ok ? [] : Object.keys(result.errors).sort()).toEqual(["summary", "title"]);
		expect(bodyOf(template.concat("Hello\n"))).toBe("Hello\n");
	});

	it("treats false as absent", () => {
		const parsed = read(file.replace("featured: true", "featured: false"));
		expect(parsed.ok && parsed.value.record.attributes).toEqual({});
	});
});

describe("toYaml", () => {
	it("quotes strings that some YAML parser would read as something else", () => {
		expect(toYaml({ a: "no", b: "0o12", c: "2024-05-01", d: "plain" })).toBe(
			'a: "no"\nb: "0o12"\nc: "2024-05-01"\nd: plain\n',
		);
		expect(fromYaml('a: "no"').ok).toBe(true);
	});
});

describe("site.yaml", () => {
	const site = { siteName: "Alex Example", siteUrl: "https://alex.example" };

	it("writes column names, leaves empty values out, and reads back exactly", () => {
		const yaml = siteToYaml(site);
		expect(yaml).toBe("name: Alex Example\nsite_url: https://alex.example\n");
		const back = yamlToSite(yaml);
		expect(back.ok && back.value).toStrictEqual(site);
		expect(siteToYaml({ siteName: "no", siteUrl: null })).toBe('name: "no"\n');
	});

	it("round-trips any valid settings", () => {
		const arb = fc
			.record({
				siteName: text.map((s) => s.slice(0, 100).trim()).filter(Boolean),
				siteUrl: fc.option(
					slugPart.map((h) => `https://${h}.dev`),
					{ nil: null },
				),
			})
			// Plain objects (fast-check's records have a null prototype).
			.map((s) => ({ ...s }));
		fc.assert(
			fc.property(arb, (s) => {
				const yaml = siteToYaml(s);
				const back = yamlToSite(yaml);
				expect(back.ok, JSON.stringify(!back.ok && back.errors)).toBe(true);
				if (back.ok) {
					expect(back.value).toStrictEqual(s);
					expect(siteToYaml(back.value)).toBe(yaml);
				}
			}),
			RUNS,
		);
	});

	it("reports unknown keys and bad values by column", () => {
		const bad = yamlToSite("name: X\ncolour: red\n");
		expect(bad.ok ? [] : Object.keys(bad.errors)).toEqual(["colour"]);
		const invalid = yamlToSite("name: X\nsite_url: https://x.dev/path\n");
		expect(invalid.ok ? [] : Object.keys(invalid.errors)).toEqual(["site_url"]);
	});
});
