import { and, asc, ne } from "drizzle-orm";
import { canonicalConfig } from "#/lib/content/canonical";
import { combineFields, parentOf, pathChain, slugOf } from "#/lib/content/fields";
import {
	DOCUMENT_FILE,
	documentFile,
	documentToMarkdown,
	markdownToDocument,
} from "#/lib/content/files";
import { validateData } from "#/lib/content/validate";
import { getDb } from "#/lib/db/client.server";
import { entries } from "#/lib/db/schema";
import {
	type DisplayStatus,
	type FieldErrors,
	fieldsFor,
	getDocumentRecord,
	inSite,
	isoMs,
	type SaveResult,
	writeEntry,
} from "./content.server";

// Content presented as files: `<folder>/_config.json` and `<document>/index.md` — the same bytes
// as `pnpm content:export`. The table stays the source of truth; reading a file renders a row,
// saving a file parses it and writes the row (see writeEntry). Docs: Files, export and import.

/** One folder or document, for browsing. Everything else (a folder's contents, counts) is derived
 * from these on the client. */
export type FileRow = {
	id: string;
	kind: "folder" | "document";
	/** `posts/shipping-small`; the root is "". */
	path: string;
	/** Documents: the title. Folders: their name. */
	title: string;
	status: DisplayStatus | null;
	/** Doesn't match its fields (e.g. a required field was added). */
	invalid: boolean;
	/** Has a `_config.json` (only told to admins). */
	hasConfig: boolean;
	updatedAt: string;
};

export async function listFiles(includeConfigs: boolean): Promise<FileRow[]> {
	const rows = await getDb()
		.select({
			id: entries.id,
			kind: entries.kind,
			path: entries.path,
			title: entries.title,
			status: entries.status,
			config: entries.config,
			attributes: entries.attributes,
			updatedAt: isoMs(entries.updatedAt),
		})
		.from(entries)
		.where(and(await inSite(), ne(entries.kind, "image")))
		.orderBy(asc(entries.path));
	const configs = new Map(rows.map((r) => [r.path, r.config ? canonicalConfig(r.config) : null]));
	return rows.map((r) => {
		const fields =
			r.kind === "document"
				? combineFields(pathChain(r.path).map((p) => ({ path: p, config: configs.get(p) ?? null })))
				: null;
		return {
			id: r.id,
			kind: r.kind === "document" ? "document" : "folder",
			path: r.path,
			title: r.kind === "document" ? (r.title ?? "") : slugOf(r.path),
			status: r.status,
			invalid: !!fields && (!fields.ok || !validateData(fields.fields, r.attributes).ok),
			hasConfig: includeConfigs && !!r.config,
			updatedAt: r.updatedAt,
		};
	});
}

/** A document's file, by id. */
export async function readEntryFile(id: string) {
	const record = await getDocumentRecord(id);
	if (!record) return null;
	const fields = await fieldsFor(getDb(), record.path);
	if (!fields.ok) return null;
	const { updatedAt, ...doc } = record;
	return {
		ok: true as const,
		kind: "entry" as const,
		path: documentFile(record.path),
		text: documentToMarkdown(fields.fields, doc),
		version: updatedAt,
		id,
	};
}

/** Front-matter keys for errors (`data.years.start` → `years.start`). */
function fileErrors(errors: FieldErrors | undefined) {
	return Object.fromEntries(
		Object.entries(errors ?? {}).map(([key, messages]) => [
			key.startsWith("data.") ? key.slice(5) : key === "publishedAt" ? "published_at" : key,
			messages,
		]),
	);
}

export type SaveFileResult =
	| (SaveResult & { ok: true; path: string })
	| Exclude<SaveResult, { ok: true }>;

/**
 * Saves a document from its file text (the Source tab). Status and publish date come from the
 * front matter. A new file without an `id` gets one; its name is `slug`.
 */
export async function saveEntryFile(input: {
	collection: string;
	entryId?: string;
	slug?: string;
	text: string;
	expectedUpdatedAt?: string;
	userId: string;
}): Promise<SaveFileResult> {
	const current = input.entryId ? await getDocumentRecord(input.entryId) : null;
	if (input.entryId && (!current || parentOf(current.path) !== input.collection)) {
		return { ok: false, error: "This document doesn't exist anymore." };
	}
	const slug = current ? slugOf(current.path) : (input.slug ?? "");
	const path = input.collection ? `${input.collection}/${slug}` : slug;
	const fields = await fieldsFor(getDb(), path);
	if (!fields.ok) return { ok: false, error: fields.error };
	// A new file may leave out its id; it gets one (the text is left as it is, so error lines match).
	const parsed = markdownToDocument(fields.fields, path, input.text, {
		newId: input.entryId ? undefined : crypto.randomUUID(),
	});
	if (!parsed.ok) return { ok: false, fieldErrors: parsed.errors };
	const record = parsed.value.record;
	if (input.entryId && record.id !== input.entryId) {
		return { ok: false, fieldErrors: { id: ["Can't change a document's id"] } };
	}
	const result = await writeEntry(
		input.collection,
		{
			slug,
			title: record.title,
			body: record.body,
			data: record.attributes,
			tags: record.tags,
			extras: record.extras,
			status: record.status,
			publishedAt: record.publishedAt ? new Date(record.publishedAt) : null,
		},
		{
			id: input.entryId,
			newId: input.entryId ? undefined : record.id,
			expectedUpdatedAt: input.expectedUpdatedAt,
			userId: input.userId,
		},
	);
	if (!result.ok)
		return { ...result, fieldErrors: result.fieldErrors && fileErrors(result.fieldErrors) };
	return { ...result, path: documentFile(result.path) };
}

/** Renames a document: a new slug (so a new folder name), everything else unchanged. */
export async function renameEntryFile(input: {
	id: string;
	slug: string;
	expectedUpdatedAt?: string;
	userId: string;
}): Promise<SaveFileResult> {
	const record = await getDocumentRecord(input.id);
	if (!record) return { ok: false, error: "This document doesn't exist anymore." };
	const result = await writeEntry(
		parentOf(record.path),
		{
			slug: input.slug,
			title: record.title,
			body: record.body,
			data: record.attributes,
			tags: record.tags,
			extras: record.extras,
			status: record.status,
			publishedAt: record.publishedAt ? new Date(record.publishedAt) : null,
		},
		{ id: input.id, expectedUpdatedAt: input.expectedUpdatedAt, userId: input.userId },
	);
	if (!result.ok) return result;
	return { ...result, path: documentFile(result.path) };
}

export { DOCUMENT_FILE };
