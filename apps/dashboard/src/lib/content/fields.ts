import { z } from "zod";

// Field definitions, as kept in a folder's (or document's) `_config.json` and `entries.config`:
// which typed fields the documents below it have. Pure data + Zod — also imported by scripts run
// with Node's type stripping (keep runtime TS-free: no enums/namespaces; relative imports with
// extensions).

export const FIELD_KEY = /^[a-z][a-z0-9_]*$/;
/** A folder's or document's name: lowercase letters, digits and single hyphens. */
export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** An image's file name. */
export const IMAGE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*\.(?:png|jpg|jpeg|webp|avif|gif|svg)$/;
/** Where something sits: slugs joined by `/`; the root is "". */
export const PATH = /^(?:[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*)?$/;
/** A tag: like a slug. */
export const TAG = SLUG;
export const MAX_TAGS = 20;
/** An extras key: a JSON:API member name (letters, digits, _ and -, alphanumeric at both ends). */
export const EXTRAS_KEY = /^[A-Za-z0-9](?:[A-Za-z0-9_-]*[A-Za-z0-9])?$/;

type Common = { key?: string; label?: string; required?: boolean; help?: string };

/** A type and its options, without a name. `list.of` is one of these (lists can't nest). */
export type FieldShape =
	| { type: "text"; multiline?: boolean }
	| { type: "markdown" }
	| { type: "number" }
	| { type: "boolean" }
	| { type: "date" }
	| { type: "url" }
	| { type: "select"; options: string[] }
	| { type: "list"; of: ItemType }
	| { type: "object"; fields: Field[] }
	| { type: "image" };

/** What each item of a list is (not a list, and not a yes/no: false is stored as absent). */
export type ItemType = Exclude<FieldShape, { type: "list" } | { type: "boolean" }>;

/** A field's type and options, maybe with its name (list items have none). */
export type FieldType = Common & FieldShape;

/** A named field inside a config or object. */
export type Field = FieldType & { key: string; label: string };

export type FieldKind = FieldType["type"];

/**
 * Front-matter keys every document has, plus names a JSON:API resource reserves. Fields can't use
 * them (front matter is flat).
 */
export const RESERVED_KEYS = [
	"id",
	"slug",
	"title",
	"status",
	"published_at",
	"tags",
	"type",
	"links",
	"relationships",
	"meta",
];

// Postgres rejects NUL and unpaired surrogates in text and jsonb.
const STORABLE = /\0|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;
export const isStorable = (value: string) => !STORABLE.test(value);
export const storableString = () =>
	z.string().refine(isStorable, "Contains characters that can't be stored");

// Strict objects, and only canonical values (`required: true` or absent, never `false`), so a
// definition has exactly one form; see canonical.ts. What the type builder can express.
const flag = () => z.literal(true).optional();
const label = () => storableString().trim().min(1).max(100);

const named = {
	key: z.string().regex(FIELD_KEY, "Use lowercase letters, digits and _ (start with a letter)"),
	label: label(),
	required: flag(),
	help: storableString().trim().min(1).max(500).optional(),
};

const unique = (values: string[]) => new Set(values).size === values.length;

function shapes<T extends z.core.$ZodShape>(extra: T, item: boolean) {
	const strict = <S extends z.core.$ZodShape>(shape: S) => z.strictObject({ ...extra, ...shape });
	const variants = [
		strict({ type: z.literal("text"), multiline: flag() }),
		strict({ type: z.literal("markdown") }),
		strict({ type: z.literal("number") }),
		strict({ type: z.literal("date") }),
		strict({ type: z.literal("url") }),
		strict({
			type: z.literal("select"),
			options: z.array(label()).min(1).refine(unique, "Options must be unique"),
		}),
		strict({ type: z.literal("object"), fields: fieldsSchema }),
		strict({ type: z.literal("image") }),
	] as const;
	const boolean = strict({ type: z.literal("boolean") });
	return item
		? variants
		: ([...variants, boolean, strict({ type: z.literal("list"), of: itemTypeSchema })] as const);
}

export const itemTypeSchema: z.ZodType<ItemType> = z.lazy(() =>
	z.discriminatedUnion("type", shapes({}, true)),
) as z.ZodType<ItemType>;

export const fieldSchema: z.ZodType<Field> = z.lazy(() =>
	z.discriminatedUnion("type", shapes(named, false)),
) as z.ZodType<Field>;

/** A collection's (or group's) field list: valid fields with unique keys. */
export const fieldsSchema: z.ZodType<Field[]> = z.lazy(() =>
	z
		.array(fieldSchema)
		.refine((fields) => unique(fields.map((f) => f.key)), "Field keys must be unique"),
);

/** A `_config.json`: the fields it adds for the documents below it. */
export type Config = { fields: Field[] };

export const configSchema: z.ZodType<Config> = z.strictObject({
	fields: fieldsSchema.superRefine((fields, ctx) => {
		fields.forEach((field, i) => {
			if (RESERVED_KEYS.includes(field.key)) {
				ctx.addIssue({
					code: "custom",
					path: [i, "key"],
					message: `"${field.key}" is a standard document field; pick another key`,
				});
			}
		});
	}),
});

/** One step of a document's chain: a folder (or the document itself) and its config. */
export type ConfigLink = { path: string; config: Config | null };

/** A field and the folder whose config defines it. */
export type OwnedField = Field & { owner: string };

/**
 * A document's fields: each config from the root down to its own, in order. A key defined twice
 * along the chain is refused (`clash`), so a name means one thing in a subtree.
 */
export function combineFields(
	chain: ConfigLink[],
): { ok: true; fields: OwnedField[] } | { ok: false; clash: { key: string; paths: string[] } } {
	const fields: OwnedField[] = [];
	const owner = new Map<string, string>();
	for (const link of chain) {
		for (const field of link.config?.fields ?? []) {
			const first = owner.get(field.key);
			if (first !== undefined) {
				return { ok: false, clash: { key: field.key, paths: [first, link.path] } };
			}
			owner.set(field.key, link.path);
			fields.push({ ...field, owner: link.path });
		}
	}
	return { ok: true, fields };
}

/** Tags: unique slugs, at most MAX_TAGS. */
export const tagsSchema = z
	.array(z.string().regex(TAG, "Tags use lowercase letters, digits and single hyphens"))
	.max(MAX_TAGS, `At most ${MAX_TAGS} tags`)
	.refine(unique, "Tags must be unique");

/** Extras: front-matter keys that match no field, kept as text. */
export const extrasSchema = z.record(
	z.string().regex(EXTRAS_KEY, "Use letters, digits, _ and - (letter or digit at both ends)"),
	storableString(),
);

// ─── Paths ───────────────────────────────────────────────────────────────────

export const joinPath = (parent: string, slug: string) => (parent ? `${parent}/${slug}` : slug);
export const parentOf = (path: string) => path.slice(0, Math.max(0, path.lastIndexOf("/")));
export const slugOf = (path: string) => path.slice(path.lastIndexOf("/") + 1);

/** The root and every folder down to `path`, itself included: "", "a", "a/b". */
export function pathChain(path: string) {
	const out = [""];
	if (!path) return out;
	const parts = path.split("/");
	for (let i = 1; i <= parts.length; i++) out.push(parts.slice(0, i).join("/"));
	return out;
}

/** `inside` is `folder` itself or somewhere below it. */
export const isWithin = (inside: string, folder: string) =>
	folder === "" || inside === folder || inside.startsWith(`${folder}/`);
