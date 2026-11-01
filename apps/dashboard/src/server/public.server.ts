import { getRequest } from "@tanstack/react-start/server";
import {
	and,
	arrayContains,
	cosineDistance,
	desc,
	eq,
	inArray,
	like,
	notLike,
	type SQL,
	sql,
} from "drizzle-orm";
import type { Root } from "mdast";
import { type DocumentHeading, headingsOf } from "#/lib/content/headings";
import {
	type PublicImage,
	publicImage,
	resolveBodyImages,
	resolveImageFields,
} from "#/lib/content/media";
import { getDb } from "#/lib/db/client.server";
import { entries, searchChunks, sites } from "#/lib/db/schema";
import { anchorOf, toSnippet } from "#/lib/search/chunks";
import { EMBEDDING_MODEL } from "#/lib/search/model";
import { fuse } from "#/lib/search/rank";
import { imagesOf } from "./images.server";
import { embedQuery } from "./search.server";
import { defaultSite, type SiteRef, siteBySlug, siteSlugInPath } from "./site.server";
import { imagesEnabled } from "./storage.server";

// What's public: the site's settings, and its published documents. The public API
// (src/server/api) reads through here, so a draft can never leak: every document query below is
// limited to published documents of this site, unless the caller has the API token and asks for
// drafts (`drafts: true`, checked by the API). Server-only.
// Docs: Reading content from your site.

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

/** A published document as the public API serves it (plain JSON). */
export type SiteDocument = {
	id: string;
	path: string;
	slug: string;
	title: string;
	publishedAt: string | null;
	status: "published" | "draft";
	tags: string[];
	attributes: JsonObject;
	/** The body's Markdown tree (mdast) as JSON. */
	body: JsonObject | null;
	/** The body's headings with their ids, as GitHub and rehype-slug make them. */
	headings: DocumentHeading[];
	/** The document's own images (files next to its index.md), with their URLs. */
	images: PublicImage[];
};

/**
 * `drafts`: drafts too, for a caller with the API token. `origin`: where /media is served, for
 * image URLs (without it, image references are left as written).
 */
export type ReadOptions = { drafts?: boolean; origin?: string };

export type SiteSettings = { siteName: string; siteUrl: string | null };

const columns = {
	id: entries.id,
	path: entries.path,
	slug: entries.slug,
	title: entries.title,
	publishedAt: entries.publishedAt,
	status: entries.status,
	tags: entries.tags,
	attributes: entries.attributes,
	body: entries.body,
};

type Row = {
	id: string;
	path: string;
	slug: string;
	title: string | null;
	publishedAt: Date | null;
	status: string | null;
	tags: string[];
	attributes: unknown;
	body: unknown;
};

function toDocument(row: Row, images: PublicImage[]): SiteDocument {
	const byName = new Map(images.map((i) => [i.name, i]));
	const body = (row.body ?? null) as JsonObject | null;
	return {
		id: row.id,
		path: row.path,
		slug: row.slug,
		title: row.title ?? "",
		publishedAt: row.publishedAt?.toISOString() ?? null,
		status: row.status === "published" ? "published" : "draft",
		tags: row.tags,
		attributes: resolveImageFields(row.attributes ?? {}, byName) as JsonObject,
		body: body && resolveBodyImages(body, byName),
		headings: headingsOf(body as Root | null),
		images,
	};
}

/** Documents with their images (one query for all of them). */
async function toDocuments(rows: Row[], options: ReadOptions): Promise<SiteDocument[]> {
	const { origin } = options;
	if (!origin || !imagesEnabled()) return rows.map((r) => toDocument(r, []));
	const byParent = new Map<string, PublicImage[]>();
	for (const image of await imagesOf(rows.map((r) => r.id))) {
		byParent.set(image.parent, [...(byParent.get(image.parent) ?? []), publicImage(origin, image)]);
	}
	return rows.map((r) => toDocument(r, byParent.get(r.id) ?? []));
}

/** Published documents, or with `drafts` every document. */
const visible = (options: ReadOptions) =>
	options.drafts
		? inArray(entries.status, ["published", "draft"])
		: eq(entries.status, "published");

/**
 * The site a public request is for: the one its path names (`/<slug>/api/…`), else the default
 * site (`/api/…`). Never the dashboard's cookie: public answers are the same for everyone (and
 * cached). Null if the named site doesn't exist, or there's no site yet.
 */
export async function publicSite(): Promise<SiteRef | null> {
	const slug = siteSlugInPath(new URL(getRequest().url).pathname);
	return slug ? siteBySlug(slug) : defaultSite();
}

/** This request's site row (its settings). */
async function siteRow() {
	const site = await publicSite();
	if (!site) throw new Error("No such site.");
	const [row] = await getDb().select().from(sites).where(eq(sites.id, site.id));
	return row;
}

export async function getSettings(): Promise<SiteSettings> {
	const row = await siteRow();
	return { siteName: row.name, siteUrl: row.siteUrl };
}

/**
 * Published documents of this site matching `where`, newest first (drafts, which have no date,
 * before them, most recently edited first). Not cached: the site can be set up again.
 */
async function published(
	where: SQL | undefined,
	page: { limit?: number; offset?: number } = {},
	options: ReadOptions = {},
) {
	const site = await siteRow();
	const query = getDb()
		.select(columns)
		.from(entries)
		.where(and(eq(entries.siteId, site.id), eq(entries.kind, "document"), visible(options), where))
		.orderBy(desc(entries.publishedAt), desc(entries.updatedAt), entries.path)
		.offset(page.offset ?? 0);
	return page.limit ? query.limit(page.limit) : query;
}

/** One published document by its path, e.g. `posts/shipping-small` or `profile`. */
export async function getDocument(
	path: string,
	options: ReadOptions = {},
): Promise<SiteDocument | null> {
	const [row] = await published(eq(entries.path, path), {}, options);
	return row ? ((await toDocuments([row], options))[0] ?? null) : null;
}

/**
 * The published documents in a folder, newest first: directly in it, or with `deep` anywhere
 * below it (`folder` "" with `deep`: the whole site). Optionally with a tag.
 */
export async function listDocuments(
	folder: string,
	options: ReadOptions & { tag?: string; deep?: boolean; limit?: number; offset?: number } = {},
): Promise<SiteDocument[]> {
	const below = folder ? `${folder}/%` : "%";
	const rows = await published(
		and(
			like(entries.path, below),
			options.deep ? undefined : notLike(entries.path, `${below}/%`),
			options.tag ? arrayContains(entries.tags, [options.tag]) : undefined,
		),
		{ limit: options.limit, offset: options.offset },
		options,
	);
	return toDocuments(rows, options);
}

/** One search hit: a document, or one of its sections. */
export type SearchResult = {
	path: string;
	/** The section's heading id (as GitHub and rehype-slug make it), or null for the document. */
	anchor: string | null;
	/** The top-level folder, such as `posts`. */
	folder: string;
	title: string;
	heading: string | null;
	snippet: string;
	/** How well it matches, 0–1: higher is better, comparable within one search. */
	score: number;
};

/** "keyword": full-text search only (no OpenAI key, or it failed); "hybrid": with meaning too. */
export type SearchMode = "keyword" | "hybrid";

/**
 * Below this, text-embedding-3-small matches are noise. Tune it against real content: unrelated
 * text scores around 0.1–0.25 with this model, good matches 0.4 and up.
 */
const MIN_SIMILARITY = 0.3;

/**
 * Published documents (and their sections) matching `q`, best first: by its words (Postgres
 * full-text search, English stemming), and with OPENAI_API_KEY also by meaning, the two rankings
 * fused. If the embeddings API fails, the search still answers, by words.
 */
export async function searchDocuments(
	input: { q: string; folder?: string; tag?: string; limit: number },
	options: ReadOptions = {},
): Promise<{ mode: SearchMode; results: SearchResult[] }> {
	const site = await siteRow();
	const db = getDb();
	const scope = (match: SQL) =>
		and(
			eq(entries.siteId, site.id),
			eq(entries.kind, "document"),
			visible(options),
			input.folder ? like(entries.path, `${input.folder}/%`) : undefined,
			input.tag ? arrayContains(entries.tags, [input.tag]) : undefined,
			match,
		);
	const columns = {
		entryId: searchChunks.entryId,
		key: searchChunks.key,
		path: entries.path,
		title: entries.title,
		heading: searchChunks.heading,
		content: searchChunks.content,
	};
	// Extra rows: the parts of one long section collapse into one result.
	const take = input.limit * 3;

	const query = sql`websearch_to_tsquery('english', ${input.q})`;
	// Normalization 32: rank / (rank + 1), so 0–1.
	const rank = sql<number>`ts_rank_cd(${searchChunks.fts}, ${query}, 32)`;
	const keyword = await db
		.select({ ...columns, score: rank })
		.from(searchChunks)
		.innerJoin(entries, eq(entries.id, searchChunks.entryId))
		.where(scope(sql`${searchChunks.fts} @@ ${query}`))
		.orderBy(desc(rank))
		.limit(take);

	let vector: number[] | null = null;
	try {
		vector = await embedQuery(input.q);
	} catch (error) {
		console.error("[search] unavailable", JSON.stringify({ message: String(error) }));
	}
	let ranked: { item: (typeof keyword)[number]; score: number }[];
	if (vector) {
		const distance = cosineDistance(searchChunks.embedding, vector);
		const semantic = (
			await db
				.select({ ...columns, score: sql<number>`1 - (${distance})` })
				.from(searchChunks)
				.innerJoin(entries, eq(entries.id, searchChunks.entryId))
				.where(scope(eq(searchChunks.model, EMBEDDING_MODEL)))
				.orderBy(distance)
				.limit(take)
		).filter((row) => Number(row.score) >= MIN_SIMILARITY);
		ranked = fuse(keyword, semantic, (row) => `${row.entryId}/${row.key}`);
	} else {
		ranked = keyword.map((row) => ({ item: row, score: Number(row.score) }));
	}

	const seen = new Set<string>();
	const results: SearchResult[] = [];
	for (const { item: row, score } of ranked) {
		const anchor = anchorOf(row.key);
		const id = `${row.path}#${anchor ?? ""}`;
		if (seen.has(id)) continue;
		seen.add(id);
		results.push({
			path: row.path,
			anchor,
			folder: row.path.split("/")[0],
			title: row.title ?? "",
			heading: row.heading,
			snippet: toSnippet(row.content),
			score: Number(score.toFixed(3)),
		});
	}
	return { mode: vector ? "hybrid" : "keyword", results: results.slice(0, input.limit) };
}
