import { queryOptions } from "@tanstack/react-query";
import { CONTENT_KEY } from "#/integrations/tanstack-query/keys";
import { getEntry, listCollections, recentEntries } from "#/server/content.functions";
import { getContentType } from "#/server/content-types.functions";
import { listFiles, readEntrySource } from "#/server/files.functions";
import { listDocumentImages } from "#/server/images.functions";

// Query options for the content dashboard. Invalidate CONTENT_KEY after any write.

export { CONTENT_KEY };

export type EntryStatusFilter = "all" | "draft" | "published";

export const collectionsQuery = queryOptions({
	queryKey: [...CONTENT_KEY, "collections"],
	queryFn: () => listCollections(),
});

export const entryQuery = (id: string) =>
	queryOptions({
		queryKey: [...CONTENT_KEY, "entry", id],
		queryFn: () => getEntry({ data: { id } }),
	});

/** A document as its `index.md`, with the version a save must match. */
export const entrySourceQuery = (id: string) =>
	queryOptions({
		queryKey: [...CONTENT_KEY, "entry-source", id],
		queryFn: () => readEntrySource({ data: { id } }),
	});

export const recentEntriesQuery = queryOptions({
	queryKey: [...CONTENT_KEY, "recent"],
	queryFn: () => recentEntries(),
});

export const contentTypeQuery = (slug: string) =>
	queryOptions({
		queryKey: [...CONTENT_KEY, "type", slug],
		queryFn: () => getContentType({ data: { slug } }),
	});

export const filesQuery = queryOptions({
	queryKey: [...CONTENT_KEY, "files"],
	queryFn: () => listFiles(),
});

/** Whether images are on, and a document's images. */
export const documentImagesQuery = (documentId: string) =>
	queryOptions({
		queryKey: [...CONTENT_KEY, "images", documentId],
		queryFn: () => listDocumentImages({ data: { documentId } }),
	});
