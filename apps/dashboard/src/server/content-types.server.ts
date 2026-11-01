import { and, count, eq, ne } from "drizzle-orm";
import { canonicalConfig, canonicalFields } from "#/lib/content/canonical";
import {
	type Config,
	configSchema,
	type Field,
	type OwnedField,
	parentOf,
	pathChain,
	SLUG,
	slugOf,
} from "#/lib/content/fields";
import { getDb } from "#/lib/db/client.server";
import { entries } from "#/lib/db/schema";
import {
	type FieldErrors,
	fieldsOfChain,
	inSite,
	isoMs,
	issuesToErrors,
	loadChain,
	within,
} from "./content.server";
import { currentSiteId } from "./site.server";

// A folder's `_config.json`: the fields it adds for every document below it. Saving a config
// never rewrites documents: those that no longer fit its fields are marked as needing attention
// (files.server.ts) until someone edits them, and values of removed fields stay in their files.

/** What the builder sends. `fields` is checked against the field-definition schema here. */
export type TypeValues = { slug: string; fields: unknown[] };

export type ContentType = {
	/** The folder's path. */
	slug: string;
	name: string;
	/** Its own config's fields. */
	fields: Field[];
	/** Fields it inherits from the folders above it. */
	inherited: OwnedField[];
	updatedAt: string;
	/** Documents below it. */
	entryCount: number;
};

type Failure = {
	ok: false;
	error?: string;
	fieldErrors?: FieldErrors;
	conflict?: { updatedAt: string };
};

const fieldsOf = (config: Config | null) => (config ? canonicalFields(config.fields) : []);

export async function getContentType(path: string): Promise<ContentType | null> {
	const db = getDb();
	const [row] = await db
		.select({
			path: entries.path,
			kind: entries.kind,
			config: entries.config,
			updatedAt: isoMs(entries.updatedAt),
		})
		.from(entries)
		.where(and(await inSite(), and(eq(entries.path, path), ne(entries.kind, "image"))));
	if (!row || !path) return null;
	const chain = await loadChain(db, parentOf(path));
	const inherited = fieldsOfChain(chain);
	const [{ n }] = await db
		.select({ n: count() })
		.from(entries)
		.where(and(await inSite(), and(eq(entries.kind, "document"), within(path))));
	return {
		slug: row.path,
		name: row.path,
		fields: fieldsOf(row.config),
		inherited: inherited.ok ? inherited.fields : [],
		updatedAt: row.updatedAt,
		entryCount: n,
	};
}

/** The config in its stored form, or field errors. */
function checkConfig(fields: unknown[]): { ok: true; config: Config } | Failure {
	const parsed = configSchema.safeParse(canonicalConfig({ fields }));
	if (!parsed.success) return { ok: false, fieldErrors: issuesToErrors(parsed.error.issues) };
	return { ok: true, config: canonicalConfig(parsed.data) };
}

/** Creates a folder (in an existing folder) with its config. */
export async function createContentType(
	values: TypeValues,
): Promise<{ ok: true; slug: string; updatedAt: string } | Failure> {
	const db = getDb();
	const path = values.slug.trim();
	if (!path || !path.split("/").every((part) => SLUG.test(part))) {
		return {
			ok: false,
			fieldErrors: { slug: ["Use lowercase letters, digits and single hyphens"] },
		};
	}
	const checked = checkConfig(values.fields);
	if (!checked.ok) return checked;
	const chain = await loadChain(db, parentOf(path));
	const parent = chain.at(-1);
	if (!parent || parent.path !== parentOf(path) || chain.some((c) => c.kind !== "folder")) {
		return { ok: false, fieldErrors: { slug: [`There's no folder ${parentOf(path) || "/"}`] } };
	}
	const fields = fieldsOfChain([...chain, { path, config: checked.config }]);
	if (!fields.ok) return { ok: false, fieldErrors: { fields: [fields.error] } };
	const inserted = await db
		.insert(entries)
		.values({
			siteId: await currentSiteId(),
			kind: "folder",
			parent: parent.id,
			parentKind: "folder",
			slug: slugOf(path),
			path,
			config: checked.config,
		})
		.onConflictDoNothing()
		.returning({ path: entries.path, updatedAt: isoMs(entries.updatedAt) });
	if (!inserted.length)
		return { ok: false, fieldErrors: { slug: ["Already used in this folder"] } };
	return { ok: true, slug: inserted[0].path, updatedAt: inserted[0].updatedAt };
}

type ChangeInput = { slug: string; expectedUpdatedAt: string; values: TypeValues };

/**
 * Saves a folder's config, if nobody saved it meanwhile and no field name ends up defined twice
 * along a path (the folders above, or any config below).
 */
export async function saveContentType(
	input: ChangeInput,
): Promise<{ ok: true; updatedAt: string } | Failure> {
	return getDb().transaction(async (tx) => {
		const [current] = await tx
			.select({ id: entries.id, updatedAtIso: isoMs(entries.updatedAt) })
			.from(entries)
			.where(and(await inSite(), and(eq(entries.path, input.slug), ne(entries.kind, "image"))))
			.for("update");
		if (!current || !input.slug) return { ok: false, error: "This folder doesn't exist anymore." };
		if (current.updatedAtIso !== input.expectedUpdatedAt) {
			return { ok: false, conflict: { updatedAt: current.updatedAtIso } };
		}
		const checked = checkConfig(input.values.fields);
		if (!checked.ok) return checked;

		const above = await loadChain(tx, parentOf(input.slug));
		const below = await tx
			.select({ path: entries.path, config: entries.config })
			.from(entries)
			.where(and(await inSite(), and(within(input.slug), ne(entries.kind, "image"))));
		const configs = new Map<string, Config | null>(above.map((a) => [a.path, a.config]));
		for (const row of below) configs.set(row.path, row.config ? canonicalConfig(row.config) : null);
		configs.set(input.slug, checked.config);
		for (const row of below) {
			const chain = pathChain(row.path).map((p) => ({ path: p, config: configs.get(p) ?? null }));
			const fields = fieldsOfChain(chain);
			if (!fields.ok) return { ok: false, error: fields.error };
		}

		const [saved] = await tx
			.update(entries)
			.set({ config: checked.config })
			.where(and(await inSite(), eq(entries.id, current.id)))
			.returning({ updatedAt: isoMs(entries.updatedAt) });
		return { ok: true as const, updatedAt: saved.updatedAt };
	});
}

/** Deletes an empty folder. */
export async function deleteContentType(path: string): Promise<{ ok: true } | Failure> {
	const db = getDb();
	if (!path) return { ok: false, error: "The root can't be deleted." };
	const [folder] = await db
		.select({ id: entries.id })
		.from(entries)
		.where(and(await inSite(), and(eq(entries.path, path), eq(entries.kind, "folder"))));
	if (!folder) return { ok: false, error: "This folder doesn't exist anymore." };
	const [{ n }] = await db
		.select({ n: count() })
		.from(entries)
		.where(and(await inSite(), eq(entries.parent, folder.id)));
	if (n > 0) {
		return {
			ok: false,
			error: `It still holds ${n} ${n === 1 ? "item" : "items"}. Delete them first.`,
		};
	}
	const deleted = await db
		.delete(entries)
		.where(and(await inSite(), eq(entries.id, folder.id)))
		.returning({ id: entries.id });
	return deleted.length ? { ok: true } : { ok: false, error: "This folder doesn't exist anymore." };
}
