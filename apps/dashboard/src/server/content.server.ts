import { and, asc, desc, eq, inArray, like, ne, or, type SQL, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import type { Root } from "mdast";
import { z } from "zod";
import { describeBodyProblem, markdownToTree, treeToMarkdown } from "#/lib/content/body";
import {
	canonicalConfig,
	canonicalData,
	canonicalExtras,
	canonicalTime,
	type DocumentRecord,
	type Status,
} from "#/lib/content/canonical";
import {
	type ConfigLink,
	combineFields,
	extrasSchema,
	isWithin,
	joinPath,
	type OwnedField,
	parentOf,
	pathChain,
	SLUG,
	slugOf,
	storableString,
	tagsSchema,
} from "#/lib/content/fields";
import { validateData } from "#/lib/content/validate";
import { getDb } from "#/lib/db/client.server";
import { user as authors, entries } from "#/lib/db/schema";
import { removeObjects } from "./images.server";
import { scheduleReindex } from "./search.server";
import { currentSiteId } from "./site.server";
import { documentEvent, emitWebhook } from "./webhooks.server";

// Documents (admins and editors). Server-only; called from content.functions.ts.
// A document's fields come from its chain of configs: the root's, every folder's down to it, and
// its own (see combineFields).

export type DisplayStatus = Status;
export type JsonValue =
	| string
	| number
	| boolean
	| null
	| JsonValue[]
	| { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };
export type FieldErrors = Record<string, string[]>;

type Db = Pick<ReturnType<typeof getDb>, "select" | "insert" | "update" | "delete" | "execute">;

/** A folder documents can be created in, with the fields they get there. */
export type CollectionSummary = {
	/** The folder's path. */
	slug: string;
	name: string;
	description: string | null;
	/** Every field a document in this folder has (inherited ones too). */
	fields: OwnedField[];
	counts: Record<DisplayStatus, number>;
};

export type EntrySummary = {
	id: string;
	/** The folder it's in. */
	collection: string;
	slug: string;
	path: string;
	title: string;
	status: DisplayStatus;
	publishedAt: string | null;
	updatedAt: string;
	updatedBy: string | null;
	/** Doesn't match its fields (e.g. a required field was added). */
	invalid?: boolean;
};

export type EntryDetail = EntrySummary & {
	/** The body as Markdown text, for editing. */
	body: string | null;
	data: JsonObject;
	tags: string[];
	extras: Record<string, string>;
};

// Millisecond precision: JS dates can't carry Postgres' microseconds, and the conflict check
// compares the timestamp the editor loaded with the current one.
export const isoMs = (column: AnyPgColumn) =>
	sql<string>`to_char(${column} at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;
export const updatedAtIso = isoMs(entries.updatedAt);

const isDocument = eq(entries.kind, "document");

/** This site's rows only: every query on `entries` goes through it (see site.server.ts). */
export const inSite = async () => eq(entries.siteId, await currentSiteId());
/** `path` itself or anything below it. */
export const within = (path: string) =>
	path ? or(eq(entries.path, path), like(entries.path, `${path}/%`)) : undefined;

const summaryColumns = {
	id: entries.id,
	slug: entries.slug,
	path: entries.path,
	title: sql<string>`${entries.title}`,
	status: sql<DisplayStatus>`${entries.status}`,
	publishedAt: isoMs(entries.publishedAt) as SQL<string | null>,
	updatedAt: updatedAtIso,
	updatedBy: authors.email,
};

const withFolder = <T extends { path: string }>(row: T) => ({
	...row,
	collection: parentOf(row.path),
});

// ─── Fields ──────────────────────────────────────────────────────────────────

/** The configs from the root down to `path` (whatever of it exists), and their kinds. */
export async function loadChain(db: Pick<Db, "select">, path: string) {
	const paths = pathChain(path);
	const rows = await db
		.select({ id: entries.id, path: entries.path, kind: entries.kind, config: entries.config })
		.from(entries)
		.where(and(await inSite(), inArray(entries.path, paths)));
	const byPath = new Map(rows.map((r) => [r.path, r]));
	return paths.flatMap((p) => {
		const row = byPath.get(p);
		return row ? [{ ...row, config: row.config ? canonicalConfig(row.config) : null }] : [];
	});
}

export type FieldsResult = { ok: true; fields: OwnedField[] } | { ok: false; error: string };

export function fieldsOfChain(chain: ConfigLink[]): FieldsResult {
	const combined = combineFields(chain);
	if (combined.ok) return combined;
	const [a, b] = combined.clash.paths.map((p) => p || "the root");
	return {
		ok: false,
		error: `The field "${combined.clash.key}" is defined in both ${a} and ${b}. Rename one.`,
	};
}

/** The fields of a document at `path` (it may not exist yet). */
export async function fieldsFor(db: Pick<Db, "select">, path: string) {
	return fieldsOfChain(await loadChain(db, path));
}

/** A folder documents can go in: it exists, is a folder, and isn't inside a document. */
export async function findFolder(db: Pick<Db, "select">, path: string) {
	const chain = await loadChain(db, path);
	const folder = chain.at(-1);
	if (!folder || folder.path !== path || folder.kind !== "folder") return null;
	if (chain.some((link) => link.kind === "document")) return null;
	const fields = fieldsOfChain(chain);
	return { id: folder.id, path, chain, fields };
}

// ─── Reading ─────────────────────────────────────────────────────────────────

/** Folders documents can be created in (the root too, as ""), with their documents counted. */
export async function listCollections(): Promise<CollectionSummary[]> {
	const db = getDb();
	const rows = await db
		.select({
			path: entries.path,
			kind: entries.kind,
			config: entries.config,
			status: entries.status,
		})
		.from(entries)
		.where(await inSite())
		.orderBy(asc(entries.path));
	const documents = rows.filter((r) => r.kind === "document");
	const configs = new Map(rows.map((r) => [r.path, r.config ? canonicalConfig(r.config) : null]));
	const insideDocument = (path: string) =>
		documents.some((d) => path !== d.path && isWithin(path, d.path));
	const out: CollectionSummary[] = [];
	for (const row of rows) {
		if (row.kind !== "folder" || insideDocument(row.path)) continue;
		const chain = pathChain(row.path).map((p) => ({ path: p, config: configs.get(p) ?? null }));
		const combined = combineFields(chain);
		const mine = documents.filter((d) => parentOf(d.path) === row.path);
		out.push({
			slug: row.path,
			name: row.path || "/",
			description: null,
			fields: combined.ok ? combined.fields : [],
			counts: {
				published: mine.filter((d) => d.status === "published").length,
				draft: mine.filter((d) => d.status === "draft").length,
			},
		});
	}
	return out;
}

export async function recentEntries(limit: number) {
	const rows = await getDb()
		.select(summaryColumns)
		.from(entries)
		.leftJoin(authors, eq(authors.id, entries.updatedBy))
		.where(and(await inSite(), isDocument))
		.orderBy(desc(entries.updatedAt))
		.limit(limit);
	return rows.map((row) => ({ ...withFolder(row), collectionName: parentOf(row.path) || "/" }));
}

export async function getEntry(id: string): Promise<EntryDetail | null> {
	if (!z.uuid().safeParse(id).success) return null;
	const [row] = await getDb()
		.select({
			...summaryColumns,
			body: entries.body,
			attributes: entries.attributes,
			tags: entries.tags,
			extras: entries.extras,
		})
		.from(entries)
		.leftJoin(authors, eq(authors.id, entries.updatedBy))
		.where(and(await inSite(), and(eq(entries.id, id), isDocument)));
	if (!row) return null;
	const { body, attributes, ...rest } = row;
	// `attributes` is JSON from Postgres (jsonb), validated on every write.
	return withFolder({
		...rest,
		body: body ? treeToMarkdown(body) : null,
		data: attributes as JsonObject,
		extras: canonicalExtras(rest.extras),
	});
}

/** A document as stored (ISO times, the body as a tree): what its file is made from. */
export async function getDocumentRecord(
	id: string,
): Promise<(DocumentRecord & { updatedAt: string }) | null> {
	if (!z.uuid().safeParse(id).success) return null;
	const [row] = await getDb()
		.select({
			id: entries.id,
			path: entries.path,
			title: entries.title,
			status: entries.status,
			publishedAt: isoMs(entries.publishedAt) as SQL<string | null>,
			tags: entries.tags,
			attributes: entries.attributes,
			extras: entries.extras,
			body: entries.body,
			updatedAt: updatedAtIso,
		})
		.from(entries)
		.where(and(await inSite(), and(eq(entries.id, id), isDocument)));
	if (!row) return null;
	return { ...row, title: row.title ?? "", status: row.status ?? "draft" };
}

// ─── Saving ──────────────────────────────────────────────────────────────────

export const entryValuesSchema = z.object({
	title: storableString().trim().min(1, "Required").max(200),
	slug: z
		.string()
		.trim()
		.min(1, "Required")
		.max(120)
		.regex(SLUG, "Use lowercase letters, digits and single hyphens"),
	body: storableString().max(200_000).optional(),
	data: z.record(z.string(), z.unknown()),
	tags: tagsSchema.optional(),
	extras: extrasSchema.optional(),
});
export type EntryValues = z.input<typeof entryValuesSchema>;

export type SaveResult =
	| { ok: true; id: string; path: string; updatedAt: string }
	| {
			ok: false;
			error?: string;
			fieldErrors?: FieldErrors;
			conflict?: { updatedAt: string; updatedBy: string | null };
	  };

export function issuesToErrors(issues: z.core.$ZodIssue[], prefix = ""): FieldErrors {
	const errors: FieldErrors = {};
	for (const issue of issues) {
		const key = prefix + (issue.path.join(".") || "(root)");
		errors[key] = [...(errors[key] ?? []), issue.message];
	}
	return errors;
}

/** What `writeEntry` stores. */
export type EntryWrite = {
	slug: string;
	title: string;
	/** Markdown text (from the form) or a tree (from a file, already parsed). */
	body?: string | Root | null;
	data: Record<string, unknown>;
	tags?: string[];
	extras?: Record<string, string>;
	status: DisplayStatus;
	/** The "posted on" date; required when published, none for drafts. */
	publishedAt: Date | null;
};

const pgCode = (error: unknown) =>
	(error as { cause?: { code?: string }; code?: string }).cause?.code ??
	(error as { code?: string }).code;

/**
 * The one way a document is written — from the form, from its file (Source tab) or a rename:
 * canonical form, validation against its chain of configs, the body parsed to a tree, unique
 * name in its folder, and the optimistic conflict check. A changed slug moves the
 * document and everything inside it. Field errors use form paths (`title`, `data.years.start`).
 */
export async function writeEntry(
	folderPath: string,
	entry: EntryWrite,
	opts: {
		/** The document being updated; without it a new one is created (with `newId` if given). */
		id?: string;
		newId?: string;
		expectedUpdatedAt?: string;
		userId: string;
		fieldErrors?: FieldErrors;
	},
): Promise<SaveResult> {
	const before = opts.id ? await statusAndPath(opts.id) : null;
	const result = await saveEntry(folderPath, entry, opts);
	if (!result.ok) return result;
	// Search and webhooks follow what was committed, in the background.
	scheduleReindex(result.id);
	const change = documentEvent(before, { status: entry.status, path: result.path });
	if (change) emitWebhook({ id: result.id, ...change });
	return result;
}

async function statusAndPath(id: string) {
	const [row] = await getDb()
		.select({ status: entries.status, path: entries.path })
		.from(entries)
		.where(and(await inSite(), and(eq(entries.id, id), isDocument)));
	return row ?? null;
}

function saveEntry(
	folderPath: string,
	entry: EntryWrite,
	opts: Parameters<typeof writeEntry>[2],
): Promise<SaveResult> {
	return getDb().transaction(async (tx) => {
		const folder = await findFolder(tx, folderPath);
		if (!folder) return { ok: false, error: "This folder doesn't exist." };

		const fieldErrors: FieldErrors = { ...opts.fieldErrors };
		const parsed = entryValuesSchema.safeParse({
			title: entry.title,
			slug: entry.slug,
			body: typeof entry.body === "string" ? entry.body : undefined,
			data: entry.data,
			tags: entry.tags ?? [],
			extras: entry.extras ?? {},
		});
		if (!parsed.success) Object.assign(fieldErrors, issuesToErrors(parsed.error.issues));

		// Its own config, if it has one, adds to the folder's fields.
		const [own] = opts.id
			? await tx
					.select({ config: entries.config })
					.from(entries)
					.where(and(await inSite(), and(eq(entries.id, opts.id), isDocument)))
			: [];
		const fields = fieldsOfChain([
			...folder.chain,
			{
				path: joinPath(folderPath, entry.slug),
				config: own?.config ? canonicalConfig(own.config) : null,
			},
		]);
		if (!fields.ok) return { ok: false, error: fields.error };

		// Canonical first (src/lib/content/canonical.ts), so equal content is always stored the same way.
		const data = validateData(fields.fields, canonicalData(fields.fields, entry.data));
		if (!data.ok) {
			for (const [path, messages] of Object.entries(data.errors))
				fieldErrors[`data.${path}`] = messages;
		}
		let body: Root | null = null;
		if (typeof entry.body === "string") {
			const tree = markdownToTree(entry.body);
			if (tree.ok) body = tree.tree;
			else fieldErrors.body = [describeBodyProblem(tree.problem)];
		} else body = entry.body?.children.length ? entry.body : null;
		if (entry.status === "published" && !entry.publishedAt) {
			fieldErrors.publishedAt = ["Published documents need a date"];
		}
		if (!parsed.success || !data.ok || Object.keys(fieldErrors).length)
			return { ok: false, fieldErrors };
		const values = parsed.data;

		const [clash] = await tx
			.select({ id: entries.id })
			.from(entries)
			.where(
				and(
					await inSite(),
					and(
						eq(entries.parent, folder.id),
						eq(entries.slug, values.slug),
						opts.id ? ne(entries.id, opts.id) : undefined,
					),
				),
			);
		if (clash) fieldErrors.slug = ["Already used in this folder"];
		if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };

		const path = joinPath(folderPath, values.slug);
		const row = {
			title: values.title,
			slug: values.slug,
			path,
			body,
			attributes: data.data,
			tags: values.tags ?? [],
			extras: canonicalExtras(values.extras ?? {}),
			status: entry.status,
			// Milliseconds, like every stored time (canonical.ts); drafts have none.
			publishedAt:
				entry.status === "published" && entry.publishedAt
					? new Date(canonicalTime(entry.publishedAt))
					: null,
			updatedBy: opts.userId,
		};

		if (!opts.id) {
			try {
				const created = await tx
					.insert(entries)
					.values({
						...row,
						...(opts.newId ? { id: opts.newId } : {}),
						siteId: await currentSiteId(),
						kind: "document",
						parent: folder.id,
						parentKind: "folder",
						createdBy: opts.userId,
					})
					.onConflictDoNothing({ target: entries.id })
					.returning({ id: entries.id, updatedAt: updatedAtIso });
				if (!created.length)
					return { ok: false, fieldErrors: { id: ["Already used by another document"] } };
				return { ok: true, id: created[0].id, path, updatedAt: created[0].updatedAt };
			} catch (error) {
				if (pgCode(error) === "23505")
					return { ok: false, fieldErrors: { slug: ["Already used in this folder"] } };
				throw error;
			}
		}

		const [before] = await tx
			.select({ path: entries.path })
			.from(entries)
			.where(
				and(
					await inSite(),
					and(eq(entries.id, opts.id), isDocument, eq(entries.parent, folder.id)),
				),
			)
			.for("update");
		if (!before) return { ok: false, error: "This document doesn't exist anymore." };
		const [updated] = await tx
			.update(entries)
			.set(row)
			.where(
				and(
					await inSite(),
					and(
						eq(entries.id, opts.id),
						// Only if nobody saved since this editor loaded it.
						opts.expectedUpdatedAt ? sql`${updatedAtIso} = ${opts.expectedUpdatedAt}` : undefined,
					),
				),
			)
			.returning({ id: entries.id, updatedAt: updatedAtIso });
		if (!updated) {
			const latest = await getEntry(opts.id);
			if (!latest) return { ok: false, error: "This document doesn't exist anymore." };
			return { ok: false, conflict: { updatedAt: latest.updatedAt, updatedBy: latest.updatedBy } };
		}
		if (before.path !== path) await movePaths(tx, before.path, path);
		return { ok: true, id: updated.id, path, updatedAt: updated.updatedAt };
	});
}

/** Rewrites the paths of everything below `from` (not itself) to sit below `to`. */
export async function movePaths(db: Pick<Db, "execute">, from: string, to: string) {
	await db.execute(sql`
		update ${entries} set path = ${to} || substr(${entries.path}, ${from.length + 1})
		where ${entries.path} like ${`${from}/%`} and ${entries.siteId} = ${await currentSiteId()}`);
}

/** Publish (dated now, unless it already has a date) or unpublish (drafts have no date). */
export async function setEntryStatus(input: {
	id: string;
	intent: "publish" | "unpublish";
	expectedUpdatedAt?: string;
	userId: string;
}): Promise<SaveResult> {
	const current = await getDocumentRecord(input.id);
	if (!current) return { ok: false, error: "This document doesn't exist anymore." };
	const state =
		input.intent === "publish"
			? {
					status: "published" as const,
					publishedAt: current.publishedAt ? new Date(current.publishedAt) : new Date(),
				}
			: { status: "draft" as const, publishedAt: null };
	return writeEntry(
		parentOf(current.path),
		{
			slug: slugOf(current.path),
			title: current.title,
			body: current.body,
			data: current.attributes,
			tags: current.tags,
			extras: current.extras,
			...state,
		},
		{ id: input.id, expectedUpdatedAt: input.expectedUpdatedAt, userId: input.userId },
	);
}

// ─── Delete ─────────────────────────────────────────────

/** Deletes a document with its images (their files go after the rows). */
export async function deleteEntry(id: string) {
	try {
		const result = await getDb().transaction(async (tx) => {
			const [doc] = await tx
				.select({ id: entries.id })
				.from(entries)
				.where(and(await inSite(), and(eq(entries.id, id), isDocument)))
				.for("update");
			if (!doc) return null;
			const images = await tx
				.delete(entries)
				.where(and(eq(entries.parent, id), eq(entries.kind, "image")))
				.returning({ id: entries.id });
			const [deleted] = await tx
				.delete(entries)
				.where(eq(entries.id, id))
				.returning({ id: entries.id, status: entries.status, path: entries.path });
			return { deleted, images: images.map((i) => i.id) };
		});
		if (!result) return { ok: false as const, error: "This document doesn't exist anymore." };
		await removeObjects(result.images);
		const change = documentEvent(result.deleted, null);
		if (change) emitWebhook({ id, ...change });
		return { ok: true as const };
	} catch (error) {
		if (pgCode(error) === "23503") {
			return {
				ok: false as const,
				error: "It still holds folders. Remove them first.",
			};
		}
		throw error;
	}
}
