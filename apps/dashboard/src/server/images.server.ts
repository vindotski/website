import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "#/lib/db/client.server";
import { entries } from "#/lib/db/schema";
import { type ImageInfo, inspectImage } from "#/lib/images";
import { imageKey } from "#/lib/storage";
import { inSite, isoMs } from "./content.server";
import { currentSiteId } from "./site.server";
import { getStorage } from "./storage.server";
import { emitWebhook } from "./webhooks.server";

// A document's images: files next to its index.md (`posts/hello/cover.png`), stored in S3 by
// entry id and served at /<site>/media/<path>. Uploading the same name replaces the file.
// Server-only.
// Docs: Images.

export type ImageRow = {
	id: string;
	/** `posts/hello/cover.png` */
	path: string;
	/** `cover.png` */
	name: string;
	file: ImageInfo;
	updatedAt: string;
};

export type ImageResult = { ok: true; image: ImageRow } | { ok: false; error: string };

const imageColumns = {
	id: entries.id,
	path: entries.path,
	name: entries.slug,
	file: entries.file,
	updatedAt: isoMs(entries.updatedAt),
};

/** The images of the given documents (or folders), by path. */
export async function imagesOf(parentIds: string[]): Promise<(ImageRow & { parent: string })[]> {
	if (!parentIds.length) return [];
	const rows = await getDb()
		.select({ ...imageColumns, parent: entries.parent })
		.from(entries)
		.where(and(eq(entries.kind, "image"), inArray(entries.parent, parentIds)))
		.orderBy(asc(entries.path));
	return rows.map((r) => ({ ...r, parent: r.parent ?? "", file: r.file as ImageInfo }));
}

async function documentById(id: string) {
	const [doc] = await getDb()
		.select({ id: entries.id, path: entries.path, status: entries.status })
		.from(entries)
		.where(and(await inSite(), and(eq(entries.id, id), eq(entries.kind, "document"))));
	return doc ?? null;
}

/** The site sees a published document's images: tell it when they change. */
function imagesChanged(doc: { id: string; path: string; status: string | null }) {
	if (doc.status === "published") {
		emitWebhook({ event: "document.updated", id: doc.id, path: doc.path });
	}
}

/** Adds an image to a document, or replaces the one with the same name. */
export async function uploadImage(input: {
	documentId: string;
	name: string;
	bytes: Uint8Array;
	userId: string;
}): Promise<ImageResult> {
	const storage = await getStorage();
	if (!storage) return { ok: false, error: "Images are off: S3 isn't configured." };
	const doc = await documentById(input.documentId);
	if (!doc) return { ok: false, error: "This document doesn't exist anymore." };
	const checked = inspectImage(input.bytes, input.name);
	if (!checked.ok) return checked;

	const db = getDb();
	const siteId = await currentSiteId();
	const [existing] = await db
		.select({ id: entries.id })
		.from(entries)
		.where(
			and(eq(entries.parent, doc.id), eq(entries.slug, input.name), eq(entries.kind, "image")),
		);
	const id = existing?.id ?? crypto.randomUUID();
	// The object first: a failed upload leaves nothing behind in the table.
	await storage.put(imageKey(siteId, id), input.bytes, checked.info.mime);
	const path = `${doc.path}/${input.name}`;
	const [row] = existing
		? await db
				.update(entries)
				.set({ file: checked.info, updatedBy: input.userId })
				.where(eq(entries.id, id))
				.returning(imageColumns)
		: await db
				.insert(entries)
				.values({
					id,
					siteId,
					kind: "image",
					parent: doc.id,
					parentKind: "document",
					slug: input.name,
					path,
					file: checked.info,
					createdBy: input.userId,
					updatedBy: input.userId,
				})
				.returning(imageColumns);
	imagesChanged(doc);
	return { ok: true, image: { ...row, file: row.file as ImageInfo } };
}

/** Deletes an image: its row, then its file. */
export async function deleteImage(
	id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
	const db = getDb();
	const [image] = await db
		.delete(entries)
		.where(and(await inSite(), and(eq(entries.id, id), eq(entries.kind, "image"))))
		.returning({ id: entries.id, parent: entries.parent });
	if (!image) return { ok: false, error: "This image doesn't exist anymore." };
	await removeObjects([image.id]);
	const doc = image.parent ? await documentById(image.parent) : null;
	if (doc) imagesChanged(doc);
	return { ok: true };
}

/** Removes images' files after their rows are gone. A failure is logged: it only leaves an orphan. */
export async function removeObjects(ids: string[]) {
	const storage = await getStorage().catch(() => null);
	if (!storage || !ids.length) return;
	const siteId = await currentSiteId();
	for (const id of ids) {
		await storage.remove(imageKey(siteId, id)).catch((error: unknown) => {
			console.error("[images] failed", JSON.stringify({ id, message: String(error) }));
		});
	}
}
