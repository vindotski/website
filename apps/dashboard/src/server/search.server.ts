import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "#/lib/db/client.server";
import { entries, searchChunks } from "#/lib/db/schema";
import { documentChunks, planSync } from "#/lib/search/chunks";
import { type EmbeddingConfig, embed } from "#/lib/search/embed";
import { EMBEDDING_MODEL } from "#/lib/search/model";
import { fieldsFor } from "./content.server";
import { serverEnv } from "./env.server";

// Search's index: a published document's chunks, kept in step with every save (in the background)
// and by `pnpm search:sync` for everything else (imports, a failed sync, a new model). Chunks are
// always written, for keyword search; with OPENAI_API_KEY they're also embedded, for semantic
// search. Server-only. Docs: Reading content from your site.

/** How to reach the embeddings API, or null without a key (keyword search only). */
export function searchConfig(): EmbeddingConfig | null {
	const env = serverEnv();
	return env.OPENAI_API_KEY ? { apiKey: env.OPENAI_API_KEY, baseUrl: env.OPENAI_BASE_URL } : null;
}

/**
 * Brings one entry's chunks up to date: indexed if it's a published document (or a draft, when
 * SPOTCRAFT_API_TOKEN is set), else removed. Search itself filters by status.
 */
export async function reindexEntry(id: string) {
	const config = searchConfig();
	const db = getDb();
	const [doc] = await db
		.select({
			path: entries.path,
			title: entries.title,
			status: entries.status,
			tags: entries.tags,
			attributes: entries.attributes,
			body: entries.body,
		})
		.from(entries)
		.where(and(eq(entries.id, id), eq(entries.kind, "document")));
	// Drafts are indexed only when a frontend's server can search them (with the API token).
	const searchable =
		doc?.status === "published" || (doc?.status === "draft" && !!serverEnv().SPOTCRAFT_API_TOKEN);
	if (!doc || !searchable) {
		await db.delete(searchChunks).where(eq(searchChunks.entryId, id));
		return;
	}
	const fields = await fieldsFor(db, doc.path);
	const chunks = documentChunks({
		title: doc.title ?? "",
		tags: doc.tags,
		attributes: doc.attributes,
		body: doc.body,
		fields: fields.ok ? fields.fields : [],
	});
	const stored = await db
		.select({ key: searchChunks.key, contentHash: searchChunks.contentHash })
		.from(searchChunks)
		.where(eq(searchChunks.entryId, id));
	let plan = planSync(stored, chunks, config ? EMBEDDING_MODEL : null);
	let vectors: number[][] | null = null;
	if (config) {
		try {
			vectors = await embed(
				plan.write.map((c) => c.content),
				config,
			);
		} catch (error) {
			// Keyword search still gets the text; the next save or `search:sync` embeds it.
			console.error("[search] unavailable", JSON.stringify({ id, message: String(error) }));
			plan = planSync(stored, chunks, null);
		}
	}

	await db.transaction(async (tx) => {
		if (plan.remove.length) {
			await tx
				.delete(searchChunks)
				.where(and(eq(searchChunks.entryId, id), inArray(searchChunks.key, plan.remove)));
		}
		for (const [i, chunk] of plan.write.entries()) {
			const row = {
				heading: chunk.heading,
				content: chunk.content,
				contentHash: chunk.contentHash,
				model: vectors ? EMBEDDING_MODEL : null,
				embedding: vectors ? vectors[i] : null,
			};
			await tx
				.insert(searchChunks)
				.values({ entryId: id, key: chunk.key, ...row })
				.onConflictDoUpdate({
					target: [searchChunks.entryId, searchChunks.key],
					set: { ...row, updatedAt: sql`now()` },
				});
		}
	});
}

/**
 * After a save: re-index in the background, so a save never waits on (or fails because of) the
 * embeddings API. A failure is logged; `pnpm search:sync` catches up.
 */
export function scheduleReindex(id: string) {
	// One at a time per document, in save order, so an older run can't overwrite a newer one.
	const next = (pending.get(id) ?? Promise.resolve())
		.then(() => reindexEntry(id))
		.catch((error: unknown) => {
			console.error("[search] failed", JSON.stringify({ id, message: String(error) }));
		})
		.finally(() => {
			if (pending.get(id) === next) pending.delete(id);
		});
	pending.set(id, next);
}

const pending = new Map<string, Promise<void>>();

// Query vectors, by lowercased query: a popular search costs one embedding, not one per visitor.
const queryVectors = new Map<string, number[]>();
const QUERY_CACHE_SIZE = 500;

/** The vector for a search query, or null without a key. Throws if the embeddings API fails. */
export async function embedQuery(q: string): Promise<number[] | null> {
	const config = searchConfig();
	if (!config) return null;
	const key = q.toLowerCase();
	const cached = queryVectors.get(key);
	if (cached) {
		// Most recently used last.
		queryVectors.delete(key);
		queryVectors.set(key, cached);
		return cached;
	}
	const [vector] = await embed([q], config);
	queryVectors.set(key, vector);
	if (queryVectors.size > QUERY_CACHE_SIZE) {
		queryVectors.delete(queryVectors.keys().next().value as string);
	}
	return vector;
}
