import { os as base, ORPCError } from "@orpc/server";
import { z } from "zod";
import { createRateLimit } from "#/lib/rate-limit";
import {
	getDocument,
	getSettings,
	listDocuments,
	publicSite,
	searchDocuments,
} from "../public.server";

// The public read API (/api, OpenAPI at /api/openapi.json): what any frontend can read without an
// account — the site's settings and its published documents, nothing else. Read-only by design:
// there's no procedure that writes. A frontend's server holding SPOTCRAFT_API_TOKEN may also read
// drafts (`drafts=true`) and skips the search limit. Docs: Reading content from your site.

/**
 * Set by src/server/api/http.server.ts for each request. `trusted`: it carried the API token.
 * `origin`: the site's base URL (`https://cms.example.com/<slug>`), for image URLs.
 */
export type ApiContext = { ip: string; trusted: boolean; origin: string };
const os = base.$context<ApiContext>();

const path = z
	.string()
	.max(500)
	.regex(/^[a-z0-9]+(-[a-z0-9]+)*(\/[a-z0-9]+(-[a-z0-9]+)*)*$/, "A path like posts/shipping-small");

const document = z.object({
	id: z.uuid(),
	path: z.string(),
	slug: z.string(),
	title: z.string(),
	publishedAt: z.string().nullable(),
	/** Always "published", unless drafts were asked for with the API token. */
	status: z.enum(["published", "draft"]),
	tags: z.array(z.string()),
	attributes: z.record(z.string(), z.unknown()),
	/** The body's Markdown syntax tree (mdast), or null. */
	body: z.record(z.string(), z.unknown()).nullable(),
	/** The body's headings in order, with the ids GitHub and rehype-slug give them. */
	headings: z.array(z.object({ depth: z.number().int(), text: z.string(), anchor: z.string() })),
	/** The document's own images. `image` fields and Markdown images naming them get these URLs. */
	images: z.array(
		z.object({
			path: z.string(),
			name: z.string(),
			url: z.string(),
			mime: z.string(),
			width: z.number().int(),
			height: z.number().int(),
			bytes: z.number().int(),
		}),
	),
});

/** `drafts=true`: drafts too. Only with the API token. */
const drafts = z.stringbool().optional();

/** Drafts were asked for: the caller must have the token. */
function readOptions(input: { drafts?: boolean }, context: ApiContext) {
	if (input.drafts && !context.trusted) {
		throw new ORPCError("UNAUTHORIZED", { message: "drafts=true needs the API token." });
	}
	return { drafts: input.drafts ?? false, origin: context.origin };
}

const settings = z.object({ siteName: z.string(), siteUrl: z.string().nullable() });

const searchResult = z.object({
	path: z.string(),
	/** The section's heading id (as GitHub and rehype-slug make it), or null for the document. */
	anchor: z.string().nullable(),
	/** The top-level folder, such as `posts`. */
	folder: z.string(),
	title: z.string(),
	/** The section's heading, or null for the document itself. */
	heading: z.string().nullable(),
	snippet: z.string(),
	/** How well it matches, 0–1: higher is better, comparable within one search. */
	score: z.number(),
});

// Each search costs an embedding call: a few per second per visitor is plenty.
const searchAllowed = createRateLimit({ limit: 30, windowMs: 60_000 });

/** The site the request names (`/<slug>/api`) or the default (`/api`) must exist. */
async function requireSite() {
	if (!(await publicSite())) {
		throw new ORPCError("NOT_FOUND", { message: "There's no such site here." });
	}
}

export const router = {
	site: os
		.route({ method: "GET", path: "/site", summary: "The site's name and its frontend's address" })
		.output(settings)
		.handler(async () => {
			await requireSite();
			return getSettings();
		}),

	content: {
		list: os
			.route({
				method: "GET",
				path: "/content",
				summary:
					"Published documents in a folder, newest first: directly in it, or anywhere below it with deep=true",
			})
			.input(
				z
					.object({
						/** Optional with deep=true: then the whole site. */
						folder: path.optional(),
						deep: z.stringbool().optional(),
						tag: z.string().max(100).optional(),
						limit: z.coerce.number().int().min(1).max(100).optional(),
						offset: z.coerce.number().int().min(0).optional(),
						drafts,
					})
					.refine((i) => i.folder !== undefined || i.deep, {
						message: "Give a folder, or deep=true for the whole site",
						path: ["folder"],
					}),
			)
			.output(z.array(document))
			.handler(async ({ input, context }) => {
				const options = readOptions(input, context);
				await requireSite();
				return listDocuments(input.folder ?? "", { ...input, ...options });
			}),

		get: os
			.route({ method: "GET", path: "/document", summary: "One published document by its path" })
			.input(z.object({ path, drafts }))
			.output(document)
			.handler(async ({ input, context }) => {
				const options = readOptions(input, context);
				await requireSite();
				const found = await getDocument(input.path, options);
				if (!found) throw new ORPCError("NOT_FOUND", { message: "No published document there." });
				return found;
			}),
	},

	search: os
		.route({
			method: "GET",
			path: "/search",
			summary:
				"Published documents and sections matching a query, best first: by its words, and by meaning when Spotcraft has an OpenAI key",
		})
		.input(
			z.object({
				q: z.string().trim().min(2).max(200),
				/** Only documents below this folder (at any depth). */
				folder: path.optional(),
				tag: z.string().max(100).optional(),
				limit: z.coerce.number().int().min(1).max(10).default(5),
				drafts,
			}),
		)
		.output(
			z.object({
				/** "keyword": by words only; "hybrid": by words and meaning (with an OpenAI key). */
				mode: z.enum(["keyword", "hybrid"]),
				results: z.array(searchResult),
			}),
		)
		.handler(async ({ input, context }) => {
			const options = readOptions(input, context);
			await requireSite();
			// Your frontend's server, proxying every visitor's searches, isn't limited.
			if (!context.trusted && !searchAllowed(context.ip)) {
				throw new ORPCError("TOO_MANY_REQUESTS", { message: "Too many searches. Try again soon." });
			}
			return searchDocuments(input, options);
		}),
};

export type ApiRouter = typeof router;
