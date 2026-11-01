// Reading the content tree with plain `pg`, for the content:export / content:import scripts
// (Node type stripping: relative imports with extensions, `import type`).
import type pg from "pg";
import { canonicalConfig, canonicalExtras } from "../../src/lib/content/canonical.ts";
import type { ContentTree } from "../../src/lib/content/tree.ts";
import type { ImageInfo } from "../../src/lib/images.ts";
import { canonicalSite, SITE_COLUMNS, type SiteSettings } from "../../src/lib/site/settings.ts";
import { createStorage, type Storage, storageConfigFrom } from "../../src/lib/storage.ts";

export const LOCAL_HOSTS = ["127.0.0.1", "localhost", "::1"];

export function databaseHost(url: string) {
	try {
		return new URL(url).hostname;
	} catch {
		return "";
	}
}

/** Folders and documents (images aren't files yet), as the tree export writes them. */
export async function readTree(
	client: pg.Client,
	siteId: string,
): Promise<ContentTree & { ids: Map<string, string> }> {
	const { rows } = await client.query(
		`select id, kind, path, config, title, status, published_at, tags, attributes, extras, body
		 from entries where kind <> 'image' and site_id = $1 order by path`,
		[siteId],
	);
	const tree: ContentTree & { ids: Map<string, string> } = {
		folders: [],
		documents: [],
		ids: new Map(),
	};
	for (const r of rows) {
		tree.ids.set(r.path, r.id);
		const config = r.config ? canonicalConfig(r.config) : null;
		if (r.kind === "folder") tree.folders.push({ path: r.path, config });
		else {
			tree.documents.push({
				config,
				record: {
					id: r.id,
					path: r.path,
					title: r.title,
					status: r.status,
					publishedAt: r.published_at ? (r.published_at as Date).toISOString() : null,
					tags: r.tags,
					attributes: r.attributes,
					extras: canonicalExtras(r.extras),
					body: r.body,
				},
			});
		}
	}
	return tree;
}

export async function readSite(client: pg.Client, siteId: string): Promise<SiteSettings> {
	const columns = SITE_COLUMNS.map(([, column]) => column).join(", ");
	const { rows } = await client.query(`select ${columns} from sites where id = $1`, [siteId]);
	const row = rows[0] ?? {};
	return canonicalSite(Object.fromEntries(SITE_COLUMNS.map(([key, column]) => [key, row[column]])));
}

/** Writes all settings (canonical, validated before). */
export async function writeSite(client: pg.Client, siteId: string, settings: SiteSettings) {
	const assignments = SITE_COLUMNS.map(([, column], i) => `${column} = $${i + 1}`).join(", ");
	await client.query(`update sites set ${assignments} where id = $${SITE_COLUMNS.length + 1}`, [
		...SITE_COLUMNS.map(([key]) => settings[key]),
		siteId,
	]);
}

export const SITE_FILE = "site.yaml";
export const FORMAT_FILE = "spotcraft.yaml";
export const FORMAT = "format: 2\n";

/** A stored image: its path (`posts/hello/cover.png`), its document's id and its file. */
export type StoredImage = {
	id: string;
	path: string;
	parent: string;
	name: string;
	file: ImageInfo;
};

export async function readImages(client: pg.Client, siteId: string): Promise<StoredImage[]> {
	const { rows } = await client.query(
		`select id, path, parent, slug, file from entries
		 where kind = 'image' and site_id = $1 order by path`,
		[siteId],
	);
	return rows.map((r) => ({
		id: r.id,
		path: r.path,
		parent: r.parent,
		name: r.slug,
		file: r.file,
	}));
}

/** The image bucket from S3_* in the environment, or null when it isn't configured. */
export function storageFromEnv(): Storage | null {
	const config = storageConfigFrom(process.env);
	return config ? createStorage(config) : null;
}

/**
 * The site a script works on: `--site <slug>`, else the default site. Null if there's no such
 * site (or no site at all).
 */
export async function findSite(
	client: pg.Client,
	slug: string | null,
): Promise<{ id: string; slug: string } | null> {
	const { rows } = slug
		? await client.query("select id, slug from sites where slug = $1", [slug])
		: await client.query("select id, slug from sites order by is_default desc, created_at limit 1");
	return rows[0] ?? null;
}

/** Flags that take a value (`--site <slug>`). */
const VALUE_FLAGS = new Set(["--site", "--site-url"]);

/** The value after `flag`, if given. */
export function flagValue(args: string[], flag: string): string | null {
	const at = args.indexOf(flag);
	return at >= 0 ? (args[at + 1] ?? null) : null;
}

/** The value after `--site`, if given. */
export const siteArg = (args: string[]) => flagValue(args, "--site");

/** Arguments without flags and their values. */
export function positionals(args: string[]): string[] {
	return args.filter((a, i) => !a.startsWith("--") && !VALUE_FLAGS.has(args[i - 1]));
}
