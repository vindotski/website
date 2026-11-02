import type { Root } from "mdast";
import type { paths } from "./schema.js";

// A small typed client for Spotcraft's public API (`<your Spotcraft>/api`). Plain fetch, so it runs
// in Node, browsers, edge runtimes and Next.js (pass `next` for revalidate and tags).

type Ok<P extends keyof paths> = paths[P]["get"] extends {
	responses: { 200: { content: { "application/json": infer T } } };
}
	? T
	: never;

type RawDocument = Ok<"/document">;

/** The site's name and its frontend's address. */
export type Site = Ok<"/site">;
/** A published document (or, with the token and `drafts`, a draft). */
export type SpotcraftDocument = Omit<RawDocument, "body"> & {
	/** The body's Markdown syntax tree (mdast), image URLs resolved; null when empty. */
	body: Root | null;
};
export type DocumentHeading = RawDocument["headings"][number];
export type DocumentImage = RawDocument["images"][number];
export type SearchResult = Ok<"/search">["results"][number];
/** "keyword": by words only; "hybrid": by words and meaning (Spotcraft has an OpenAI key). */
export type SearchMode = Ok<"/search">["mode"];

/** Fetch options passed through, including Next.js's `next: { revalidate, tags }`. */
export type RequestOptions = RequestInit & {
	next?: { revalidate?: number | false; tags?: string[] };
};

export type ListOptions = {
	/** A folder's path, like `posts`. Optional with `deep`: the whole site. */
	folder?: string;
	/** Everything below the folder, at any depth. */
	deep?: boolean;
	tag?: string;
	/** 1–100. */
	limit?: number;
	offset?: number;
	/** Drafts too (needs the token). */
	drafts?: boolean;
};

export type SearchOptions = {
	q: string;
	folder?: string;
	tag?: string;
	/** 1–10, default 5. */
	limit?: number;
	drafts?: boolean;
};

export type ClientOptions = {
	/**
	 * Your site's base URL: where Spotcraft is served plus the site's slug, like
	 * `https://cms.example.com/blog` (without a slug, Spotcraft's default site).
	 */
	url: string;
	/** SPOTCRAFT_API_TOKEN, on your server only: drafts and no search limit. Never in a browser. */
	token?: string;
	/** A fetch to use instead of the global one. */
	fetch?: typeof fetch;
	/** Options for every request (merged under each call's). */
	init?: RequestOptions;
};

/** An error answer from the API: `status` (e.g. 404, 429), `code` (e.g. NOT_FOUND) and a message. */
export class SpotcraftError extends Error {
	constructor(
		readonly status: number,
		readonly code: string,
		message: string,
	) {
		super(message);
		this.name = "SpotcraftError";
	}
}

type Query = Record<string, string | number | boolean | undefined>;

export function createClient(options: ClientOptions) {
	const base = `${options.url.replace(/\/+$/, "").replace(/\/api$/, "")}/api`;
	const doFetch = options.fetch ?? globalThis.fetch;

	async function get<T>(path: string, query: Query, init?: RequestOptions): Promise<T> {
		const params = new URLSearchParams();
		for (const [key, value] of Object.entries(query)) {
			if (value !== undefined && value !== false) params.set(key, String(value));
		}
		const headers = new Headers(options.init?.headers);
		for (const [k, v] of new Headers(init?.headers)) headers.set(k, v);
		headers.set("Accept", "application/json");
		if (options.token) headers.set("Authorization", `Bearer ${options.token}`);
		const qs = params.size ? `?${params}` : "";
		const res = await doFetch(`${base}${path}${qs}`, {
			...options.init,
			...init,
			headers,
			method: "GET",
		} as RequestInit);
		if (!res.ok) {
			const body = (await res.json().catch(() => null)) as {
				code?: string;
				message?: string;
			} | null;
			throw new SpotcraftError(
				res.status,
				body?.code ?? String(res.status),
				body?.message ?? res.statusText,
			);
		}
		return (await res.json()) as T;
	}

	return {
		/** The site's name and its frontend's address. */
		site: (init?: RequestOptions) => get<Site>("/site", {}, init),

		/** Documents in a folder, newest first (`deep` for everything below it). */
		list: (list: ListOptions, init?: RequestOptions) =>
			get<SpotcraftDocument[]>("/content", list, init),

		/** One document by its path, like `posts/shipping-small`; null if there's none. */
		async get(path: string, opts: { drafts?: boolean } = {}, init?: RequestOptions) {
			try {
				return await get<SpotcraftDocument>("/document", { path, ...opts }, init);
			} catch (error) {
				if (error instanceof SpotcraftError && error.status === 404) return null;
				throw error;
			}
		},

		/** Documents and sections matching `q`, best first: by words, and by meaning with a key. */
		search: (search: SearchOptions, init?: RequestOptions) =>
			get<{ mode: SearchMode; results: SearchResult[] }>("/search", search, init),
	};
}

export type SpotcraftClient = ReturnType<typeof createClient>;
