import { sql } from "drizzle-orm";
import {
	boolean,
	check,
	customType,
	foreignKey,
	index,
	jsonb,
	pgTable,
	primaryKey,
	text,
	timestamp,
	unique,
	uniqueIndex,
	uuid,
	vector,
} from "drizzle-orm/pg-core";
import type { Root } from "mdast";
import type { Kind, Status } from "../content/canonical.ts";
import type { Config } from "../content/fields.ts";
import type { ImageInfo } from "../images.ts";
import type { SiteRole } from "../roles.ts";
import { EMBEDDING_DIMENSIONS } from "../search/model.ts";

// Drizzle schema — the source of truth for app tables.
// After editing: `pnpm db:generate --name=<change>`, review the SQL, `pnpm db:migrate`.
//
// Accounts (`user`, `session`, `account`, `verification`, `jwks`: Better Auth's tables, see
// src/server/better-auth.server.ts; `user.role` is 'superadmin' or null). Sites (`sites`, with their
// settings) and their teams (`site_members`, with a role per site: admin or editor). Each
// site's content is a file system in one table, `entries`: folders (which may carry a
// `_config.json` defining fields for the documents below them), documents (a folder with an
// `index.md`: front matter + Markdown) and images. A site's root folder is its row with path ''.
// Only the server talks to the database: the dashboard through server functions, frontends
// through the public read API (src/server/api). Triggers (updated_at, a new site's root folder)
// live in custom migrations.

const timestamps = {
	createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
};

// Better Auth's tables (generated with `npx auth generate`, written in this file's style). Ids are
// text, made by Better Auth.
export const user = pgTable("user", {
	id: text().primaryKey(),
	name: text().notNull(),
	email: text().notNull().unique(),
	/** Set once they've followed an email link (invite or reset); an invite is pending until then. */
	emailVerified: boolean().notNull().default(false),
	image: text(),
	/** 'superadmin' (every site) or null; site roles live in site_members. */
	role: text(),
	...timestamps,
});

export const session = pgTable(
	"session",
	{
		id: text().primaryKey(),
		expiresAt: timestamp({ withTimezone: true }).notNull(),
		token: text().notNull().unique(),
		ipAddress: text(),
		userAgent: text(),
		userId: text()
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		...timestamps,
	},
	(t) => [index("session_user_id_idx").on(t.userId)],
);

export const account = pgTable(
	"account",
	{
		id: text().primaryKey(),
		accountId: text().notNull(),
		providerId: text().notNull(),
		userId: text()
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		accessToken: text(),
		refreshToken: text(),
		idToken: text(),
		accessTokenExpiresAt: timestamp({ withTimezone: true }),
		refreshTokenExpiresAt: timestamp({ withTimezone: true }),
		scope: text(),
		password: text(),
		...timestamps,
	},
	(t) => [index("account_user_id_idx").on(t.userId)],
);

export const verification = pgTable(
	"verification",
	{
		id: text().primaryKey(),
		identifier: text().notNull(),
		value: text().notNull(),
		expiresAt: timestamp({ withTimezone: true }).notNull(),
		...timestamps,
	},
	(t) => [index("verification_identifier_idx").on(t.identifier)],
);

/** The jwt plugin's signing keys (the private key encrypted with BETTER_AUTH_SECRET). */
export const jwks = pgTable("jwks", {
	id: text().primaryKey(),
	publicKey: text().notNull(),
	privateKey: text().notNull(),
	createdAt: timestamp({ withTimezone: true }).notNull(),
	expiresAt: timestamp({ withTimezone: true }),
	alg: text(),
	crv: text(),
});

// Sites: one database holds several, each at its own path (`/<slug>/…`: dashboard, API, images;
// see src/server/site.server.ts). One is the default, served at the bare `/api` and `/media`. A
// site row is also its settings (name, the frontend's address). Empty values are null.
export const sites = pgTable(
	"sites",
	{
		id: uuid().primaryKey().defaultRandom(),
		slug: text().notNull().unique("sites_slug_unique"),
		name: text().notNull().default("My site"),
		/** The frontend's address (View site in the dashboard; served at /api/site). */
		siteUrl: text(),
		/** The site the bare /api and /media serve. Exactly one, once any site exists. */
		isDefault: boolean().notNull().default(false),
		updatedBy: text().references(() => user.id, { onDelete: "set null" }),
		...timestamps,
	},
	(t) => [
		uniqueIndex("sites_one_default").on(t.isDefault).where(sql`${t.isDefault}`),
		check("sites_slug_format", sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
		check("sites_no_empty_text", sql`${t.name} <> '' and ${t.siteUrl} <> ''`),
		index("sites_updated_by_idx").on(t.updatedBy),
	],
);

// Who works on which site, with their role there. Superadmins (user.role) can do everything on
// every site without a row here.
export const siteMembers = pgTable(
	"site_members",
	{
		siteId: uuid()
			.notNull()
			.references(() => sites.id, { onDelete: "cascade" }),
		userId: text()
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		/** Their role on this site (SITE_ROLES in src/lib/roles.ts). */
		role: text().$type<SiteRole>().notNull().default("editor"),
		createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
	},
	(t) => [
		primaryKey({ name: "site_members_pkey", columns: [t.siteId, t.userId] }),
		index("site_members_user_id_idx").on(t.userId),
		check("site_members_role", sql`${t.role} in ('admin', 'editor')`),
	],
);

export type { Kind };
/** An image's file: its type, size, pixels and hash (src/lib/images.ts); the bytes are in S3. */
export type ImageFile = ImageInfo;

export const entries = pgTable(
	"entries",
	{
		id: uuid().primaryKey().defaultRandom(),
		/** The site it belongs to. */
		siteId: uuid()
			.notNull()
			.references(() => sites.id, { onDelete: "cascade" }),
		kind: text().$type<Kind>().notNull(),
		/** The containing folder or document; null only for the root. */
		parent: uuid(),
		/** The parent's kind, so the foreign key below can check what may contain what. */
		parentKind: text().$type<Kind>(),
		slug: text().notNull(),
		/** Slugs from the root, joined by `/` (the root is ''). Kept in step with parent + slug. */
		path: text().notNull(),
		/** Its `_config.json`: fields for the documents below it (folders and documents). */
		config: jsonb().$type<Config>(),
		title: text(),
		/** A document's body: its Markdown syntax tree (mdast), never Markdown text. */
		body: jsonb().$type<Root>(),
		/** A document's field values by key (the fields come from its chain of configs). */
		attributes: jsonb().$type<Record<string, unknown>>().notNull().default({}),
		/** A document's front-matter keys that match no field, as text. */
		extras: jsonb().$type<Record<string, string>>().notNull().default({}),
		file: jsonb().$type<ImageFile>(),
		tags: text().array().notNull().default(sql`'{}'::text[]`),
		/** Image paths a document uses (resolved), so an image in use can't be removed. */
		links: text().array().notNull().default(sql`'{}'::text[]`),
		status: text().$type<Status>(),
		/** When it was first published: a "posted on" date, never a schedule. */
		publishedAt: timestamp({ withTimezone: true }),
		createdBy: text().references(() => user.id, { onDelete: "set null" }),
		updatedBy: text().references(() => user.id, { onDelete: "set null" }),
		...timestamps,
	},
	(t) => [
		unique("entries_site_id_kind_unique").on(t.siteId, t.id, t.kind),
		// What may contain what, within one site. No action (not restrict): a non-empty folder
		// can't be deleted, but a site's whole tree can go in one statement.
		foreignKey({
			name: "entries_parent_fk",
			columns: [t.siteId, t.parent, t.parentKind],
			foreignColumns: [t.siteId, t.id, t.kind],
		}),
		// Also the index for the parent foreign key (parent first).
		unique("entries_parent_slug_unique").on(t.parent, t.slug),
		unique("entries_site_path_unique").on(t.siteId, t.path),
		index("entries_site_parent_idx").on(t.siteId, t.parent),
		index("entries_listing_idx").on(t.siteId, t.parent, t.kind, t.status, t.publishedAt.desc()),
		index("entries_path_prefix_idx").using("btree", t.siteId, sql`${t.path} text_pattern_ops`),
		index("entries_tags_idx").using("gin", t.tags),
		index("entries_links_idx").using("gin", t.links),
		index("entries_attributes_idx").using("gin", sql`${t.attributes} jsonb_path_ops`),
		index("entries_created_by_idx").on(t.createdBy),
		index("entries_updated_by_idx").on(t.updatedBy),
		check("entries_kind", sql`${t.kind} in ('folder', 'document', 'image')`),
		// The root is the one folder without a parent.
		check(
			"entries_root",
			sql`(${t.parent} is null) = (${t.path} = '') and (${t.parent} is not null or (${t.kind} = 'folder' and ${t.slug} = ''))`,
		),
		// What may contain what: documents sit in folders; folders and images in folders or
		// documents (a document's own images/ folder).
		check(
			"entries_parent_kind",
			sql`${t.parent} is null
				or (${t.kind} = 'document' and ${t.parentKind} = 'folder')
				or (${t.kind} in ('folder', 'image') and ${t.parentKind} in ('folder', 'document'))`,
		),
		check(
			"entries_slug_format",
			sql`${t.path} = ''
				or (${t.kind} = 'image' and ${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*[.](png|jpg|jpeg|webp|avif|gif|svg)$')
				or (${t.kind} <> 'image' and ${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$')`,
		),
		check(
			"entries_path_ends_in_slug",
			sql`${t.path} = ${t.slug} or right(${t.path}, length(${t.slug}) + 1) = '/' || ${t.slug}`,
		),
		// One stored form per kind (src/lib/content/canonical.ts), so content exports to files
		// losslessly.
		check(
			"entries_document_columns",
			sql`${t.kind} <> 'document' or (${t.title} is not null and ${t.title} <> '' and ${t.status} is not null)`,
		),
		check(
			"entries_other_columns",
			sql`${t.kind} = 'document' or (${t.title} is null and ${t.body} is null and ${t.status} is null
				and ${t.publishedAt} is null and ${t.attributes} = '{}' and ${t.extras} = '{}'
				and ${t.tags} = '{}' and ${t.links} = '{}')`,
		),
		check(
			"entries_config",
			sql`${t.config} is null or (${t.kind} <> 'image' and jsonb_typeof(${t.config}) = 'object')`,
		),
		check(
			"entries_file",
			sql`(${t.kind} = 'image') = (${t.file} is not null) and (${t.file} is null or jsonb_typeof(${t.file}) = 'object')`,
		),
		check(
			"entries_json_shapes",
			sql`jsonb_typeof(${t.attributes}) = 'object' and jsonb_typeof(${t.extras}) = 'object'
				and (${t.body} is null or jsonb_typeof(${t.body}) = 'object')`,
		),
		check("entries_status", sql`${t.status} in ('draft', 'published')`),
		check(
			"entries_published_has_date",
			sql`(${t.status} = 'published') = (${t.publishedAt} is not null)`,
		),
		check(
			"entries_published_at_ms",
			sql`${t.publishedAt} = date_trunc('milliseconds', ${t.publishedAt})`,
		),
		check(
			"entries_tags",
			sql`cardinality(${t.tags}) <= 20 and array_position(${t.tags}, null) is null
				and array_to_string(${t.tags}, ',') ~ '^([a-z0-9]+(-[a-z0-9]+)*)?(,[a-z0-9]+(-[a-z0-9]+)*)*$'`,
		),
	],
);

/** Postgres full-text search's document type (only ever generated, never written). */
const tsvector = customType<{ data: string }>({ dataType: () => "tsvector" });

// Search: the chunks of published documents (src/lib/search/chunks.ts), with their text for
// keyword search (`fts`, always) and their embedding for semantic search (when OPENAI_API_KEY is
// set). Path, title, status and tags are joined from `entries`, so a rename costs nothing and
// unpublishing hides a document at once. Needs pgvector (migration 0005).
export const searchChunks = pgTable(
	"search_chunks",
	{
		entryId: uuid()
			.notNull()
			.references(() => entries.id, { onDelete: "cascade" }),
		/** "" for the summary, a heading's anchor for a section; later parts add `:2`, `:3`, … */
		key: text().notNull(),
		heading: text(),
		content: text().notNull(),
		/** Of the model ("none" without one) and the text: unchanged chunks aren't written again. */
		contentHash: text().notNull(),
		/** Null until embedded (no OPENAI_API_KEY, or the embeddings API failed). */
		model: text(),
		embedding: vector({ dimensions: EMBEDDING_DIMENSIONS }),
		/** For keyword search: English stemming, the heading weighing more than the text. */
		fts: tsvector().generatedAlwaysAs(
			sql`setweight(to_tsvector('english', coalesce(heading, '')), 'A') || setweight(to_tsvector('english', content), 'B')`,
		),
		...timestamps,
	},
	(t) => [
		primaryKey({ columns: [t.entryId, t.key] }),
		index("search_chunks_embedding_idx").using("hnsw", t.embedding.op("vector_cosine_ops")),
		index("search_chunks_fts_idx").using("gin", t.fts),
	],
);
