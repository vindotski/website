// Reads an export folder (site.yaml, `_config.json` files, `<path>/index.md` documents and the
// images next to them) and shows what would change; `--apply` writes it in one transaction (images
// are uploaded to S3 first). Folders that don't exist are created with their configs; an existing
// config must match exactly (change configs in the dashboard, where the impact is previewed).
// Documents are created or updated by id, and moved when their path changed; front-matter keys
// that match no field are kept in extras (and listed). Images are added or replaced by name.
// Nothing is deleted. Into --site <slug> (else the default site); a site that doesn't exist yet
// is created with --create-site (from site.yaml, or named "My site" without one). --site-url
// <url> sets the site's address instead of site.yaml's (`pnpm dev`: the local frontend).
// Usage: pnpm content:import <dir> [--site <slug>] [--site-url <url>] [--apply] [--yes]
// [--create-site].
// See docs: Files.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import pg from "pg";
import { canonicalDocument, sameJson } from "../src/lib/content/canonical.ts";
import { type Config, IMAGE_SLUG, parentOf, slugOf } from "../src/lib/content/fields.ts";
import { configToJson, yamlToSite } from "../src/lib/content/files.ts";
import { filesToTree, type TreeDocument, treeFields } from "../src/lib/content/tree.ts";
import { type ImageInfo, inspectImage } from "../src/lib/images.ts";
import { type SiteSettings, validateSite } from "../src/lib/site/settings.ts";
import { imageKey } from "../src/lib/storage.ts";
import {
	databaseHost,
	FORMAT,
	FORMAT_FILE,
	findSite,
	flagValue,
	LOCAL_HOSTS,
	positionals,
	readImages,
	readSite,
	readTree,
	SITE_FILE,
	siteArg,
	storageFromEnv,
	writeSite,
} from "./lib/content-db.ts";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const createSite = args.includes("--create-site");
const siteSlug = siteArg(args);
const siteUrl = flagValue(args, "--site-url");
const target = positionals(args)[0];
if (!target) {
	console.error(
		"Usage: pnpm content:import <dir> [--site <slug>] [--site-url <url>] [--apply] [--yes] [--create-site]",
	);
	process.exit(1);
}
const dir = resolve(target);
const url = process.env.DATABASE_URL ?? "";
if (apply && !LOCAL_HOSTS.includes(databaseHost(url)) && !args.includes("--yes")) {
	console.error(`Importing into ${databaseHost(url)}: add --yes to confirm it isn't local.`);
	process.exit(1);
}

const format = existsSync(join(dir, FORMAT_FILE))
	? readFileSync(join(dir, FORMAT_FILE), "utf8")
	: "";
if (format !== FORMAT) {
	console.error(`${join(dir, FORMAT_FILE)} must contain "${FORMAT.trim()}" (a Spotcraft export).`);
	process.exit(1);
}

/**
 * Every file below `dir` except hidden ones and the export's own files, by `/` path: text files,
 * and images (by their name, like cover.png) as bytes.
 */
function readFiles(root: string) {
	const files = new Map<string, string>();
	const images = new Map<string, Uint8Array>();
	const walk = (folder: string) => {
		for (const name of readdirSync(folder).sort()) {
			if (name.startsWith(".")) continue;
			const full = join(folder, name);
			if (statSync(full).isDirectory()) walk(full);
			else {
				const path = relative(root, full).split(sep).join("/");
				if (IMAGE_SLUG.test(name)) images.set(path, readFileSync(full));
				else if (path !== FORMAT_FILE && path !== SITE_FILE)
					files.set(path, readFileSync(full, "utf8"));
			}
		}
	};
	walk(root);
	return { files, images };
}

const sameConfig = (a: Config | null, b: Config | null) =>
	(a ? configToJson(a) : "") === (b ? configToJson(b) : "");

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
	// The site: --site <slug>, else the default. One that doesn't exist yet (or a new install's
	// first) is created with --create-site.
	const found = await findSite(client, siteSlug);
	const newSite = !found;
	if (newSite && !createSite) {
		console.error(
			siteSlug
				? `There's no site "${siteSlug}": add --create-site to create it from site.yaml.`
				: "This install has no site yet: add --create-site to create it from site.yaml.",
		);
		process.exit(1);
	}
	const db: Awaited<ReturnType<typeof readTree>> = found
		? await readTree(client, found.id)
		: { folders: [], documents: [], ids: new Map() };
	const read = readFiles(dir);
	const { tree, problems, notes } = filesToTree(read.files);
	const problem = (file: string, message: string) => problems.push(`${file}: ${message}`);

	// Site settings: updated when site.yaml (with --site-url's address) differs. No site.yaml (like
	// the example's content): a new site gets a placeholder name, to change in Settings → Site.
	const stored = found ? await readSite(client, found.id) : null;
	let wanted: SiteSettings | null = stored ?? { siteName: "My site", siteUrl: null };
	if (existsSync(join(dir, SITE_FILE))) {
		const parsed = yamlToSite(readFileSync(join(dir, SITE_FILE), "utf8"));
		if (parsed.ok) wanted = parsed.value;
		else {
			wanted = null;
			for (const [key, messages] of Object.entries(parsed.errors))
				for (const m of messages) problem(SITE_FILE, `${key}: ${m}`);
		}
	}
	if (wanted && siteUrl !== null) {
		const checked = validateSite({ ...wanted, siteUrl });
		if (checked.ok) wanted = checked.value;
		else problem("--site-url", checked.errors.siteUrl?.join(" ") ?? "Not a valid address");
	}
	const site = wanted && (!stored || !sameJson(wanted, stored)) ? wanted : null;

	// Folders: new ones are created; existing configs must match.
	const dbFolders = new Map(db.folders.map((f) => [f.path, f]));
	const dbDocsByPath = new Map(db.documents.map((d) => [d.record.path, d]));
	const dbDocsById = new Map(db.documents.map((d) => [d.record.id, d]));
	const newFolders = tree.folders.filter((f) => !dbFolders.has(f.path));
	// A folder that has no config yet takes the import's: that only adds fields.
	const newConfigs = tree.folders.filter((f) => {
		const existing = dbFolders.get(f.path);
		return existing && !existing.config && f.config;
	});
	for (const folder of tree.folders) {
		const file = folder.path ? `${folder.path}/_config.json` : "_config.json";
		const existing = dbFolders.get(folder.path);
		if (dbDocsByPath.has(folder.path)) problem(folder.path, "is a document in the database");
		// A folder without a _config.json in the export leaves the stored config alone (nothing is
		// deleted); one with a config must match it.
		else if (existing?.config && folder.config && !sameConfig(existing.config, folder.config)) {
			problem(file, "differs from the config in the database. Change configs in the dashboard.");
		}
	}

	// Documents: by id; a changed path moves it.
	const created: TreeDocument[] = [];
	const updated: TreeDocument[] = [];
	const moved: TreeDocument[] = [];
	let unchanged = 0;
	const seen = new Set<string>();
	for (const doc of tree.documents) {
		const { record } = doc;
		const file = `${record.path}/index.md`;
		if (seen.has(record.id)) problem(file, "id: Used by another file");
		seen.add(record.id);
		const atPath = dbDocsByPath.get(record.path);
		if (atPath && atPath.record.id !== record.id) {
			problem(file, `another document (${atPath.record.id}) is at this path`);
		}
		if (dbFolders.has(record.path)) problem(file, "is a folder in the database");
		const existing = dbDocsById.get(record.id);
		if (!existing) created.push(doc);
		else {
			if (!sameConfig(existing.config, doc.config)) {
				problem(
					`${record.path}/_config.json`,
					"differs from the database. Change configs in the dashboard.",
				);
			}
			const fields = treeFields(tree, record.path);
			if (existing.record.path !== record.path) moved.push(doc);
			else if (
				typeof fields !== "string" &&
				!sameJson(canonicalDocument(fields, existing.record), record)
			) {
				updated.push(doc);
			} else unchanged++;
		}
	}

	// Images: next to a document's index.md; added, or replaced when their bytes differ.
	const docIdsByPath = new Map(tree.documents.map((d) => [d.record.path, d.record.id]));
	const dbImages = new Map(
		(found ? await readImages(client, found.id) : []).map(
			(i) => [`${i.parent}/${i.name}`, i] as const,
		),
	);
	type ImportImage = {
		id: string;
		document: string;
		path: string;
		bytes: Uint8Array;
		info: ImageInfo;
	};
	const newImages: ImportImage[] = [];
	const changedImages: ImportImage[] = [];
	for (const [path, bytes] of read.images) {
		const document = docIdsByPath.get(parentOf(path));
		if (!document) {
			problem(path, "images go next to a document's index.md");
			continue;
		}
		const checked = inspectImage(bytes, slugOf(path));
		if (!checked.ok) {
			problem(path, checked.error);
			continue;
		}
		const existing = dbImages.get(`${document}/${slugOf(path)}`);
		const image = {
			id: existing?.id ?? crypto.randomUUID(),
			document,
			path,
			bytes,
			info: checked.info,
		};
		if (!existing) newImages.push(image);
		else if (existing.file.sha256 !== checked.info.sha256) changedImages.push(image);
	}
	const storage = storageFromEnv();
	if ((newImages.length || changedImages.length) && !storage) {
		problem("images", "set S3_* (see .env.example) to import images");
	}

	// Ids are unique across sites: a document can't be imported over another site's.
	const { rows: elsewhere } = await client.query(
		"select id, path from entries where id = any($1) and ($2::uuid is null or site_id <> $2)",
		[tree.documents.map((d) => d.record.id), found?.id ?? null],
	);
	for (const row of elsewhere) {
		const doc = tree.documents.find((d) => d.record.id === row.id);
		problem(`${doc?.record.path}/index.md`, `its id belongs to ${row.path} in another site`);
	}

	if (problems.length) {
		console.error(`Nothing imported. ${problems.length} problem(s):`);
		for (const p of problems) console.error(`  ${p}`);
		process.exit(1);
	}
	for (const n of notes) console.log(`  ! ${n}`);
	if (site) console.log(`  ~ ${SITE_FILE}`);
	for (const f of newFolders) console.log(`  + folder ${f.path}`);
	for (const f of newConfigs) console.log(`  + ${f.path ? `${f.path}/` : ""}_config.json`);
	for (const { record } of created) console.log(`  + ${record.path}/index.md`);
	for (const { record } of updated) console.log(`  ~ ${record.path}/index.md`);
	for (const { record } of moved)
		console.log(`  → ${dbDocsById.get(record.id)?.record.path} → ${record.path}`);
	for (const { path } of newImages) console.log(`  + ${path}`);
	for (const { path } of changedImages) console.log(`  ~ ${path}`);
	const summary = `${newSite ? "site created, " : site ? "site settings updated, " : ""}${newFolders.length} new folders, ${created.length} new documents, ${updated.length} updated, ${moved.length} moved, ${unchanged} unchanged, ${newImages.length + changedImages.length} images added or replaced`;
	if (!apply) {
		console.log(`${summary}. Dry run: add --apply to import.`);
		process.exit(0);
	}

	await client.query("begin");
	const ids = new Map(db.ids);
	let siteId = found?.id ?? "";
	if (!found && site) {
		// Its root folder comes from a trigger; the root's config (if any) is set below. The first
		// site becomes the default.
		const { rows } = await client.query(
			`insert into sites (slug, name, is_default)
			 values ($1, $2, not exists (select 1 from sites where is_default)) returning id`,
			[siteSlug ?? "site", site.siteName],
		);
		siteId = rows[0].id;
	}
	if (site) await writeSite(client, siteId, site);
	for (const folder of newConfigs) {
		await client.query(
			`update entries set config = $1 where kind = 'folder' and path = $2 and site_id = $3`,
			[JSON.stringify(folder.config), folder.path, siteId],
		);
	}
	for (const folder of newFolders) {
		if (folder.path === "") {
			const { rows } = await client.query(
				`update entries set config = $1 where kind = 'folder' and path = '' and site_id = $2
				 returning id`,
				[folder.config && JSON.stringify(folder.config), siteId],
			);
			ids.set("", rows[0].id);
			continue;
		}
		const { rows } = await client.query(
			`insert into entries (site_id, kind, parent, parent_kind, slug, path, config)
			 values ($5, 'folder', $1, 'folder', $2, $3, $4) returning id`,
			[
				ids.get(parentOf(folder.path)),
				slugOf(folder.path),
				folder.path,
				folder.config && JSON.stringify(folder.config),
				siteId,
			],
		);
		ids.set(folder.path, rows[0].id);
	}
	for (const { record: e, config } of [...created, ...updated, ...moved]) {
		const before = dbDocsById.get(e.id)?.record.path;
		await client.query(
			`insert into entries (id, kind, parent, parent_kind, slug, path, config, title, status,
			   published_at, tags, attributes, extras, body, site_id)
			 values ($1, 'document', $2, 'folder', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
			 on conflict (id) do update set parent = excluded.parent, slug = excluded.slug,
			   path = excluded.path, title = excluded.title, status = excluded.status,
			   published_at = excluded.published_at, tags = excluded.tags,
			   attributes = excluded.attributes, extras = excluded.extras, body = excluded.body`,
			[
				e.id,
				ids.get(parentOf(e.path)),
				slugOf(e.path),
				e.path,
				config && JSON.stringify(config),
				e.title,
				e.status,
				e.publishedAt,
				e.tags,
				JSON.stringify(e.attributes),
				JSON.stringify(e.extras),
				e.body && JSON.stringify(e.body),
				siteId,
			],
		);
		if (before && before !== e.path) {
			// What's inside a moved document (its images) moves with it.
			await client.query(
				`update entries set path = $1 || substr(path, $2) where path like $3 and site_id = $4`,
				[e.path, before.length + 1, `${before}/%`, siteId],
			);
		}
	}
	// A fresh store (a new install, or a wiped volume) may not have the bucket yet.
	if (newImages.length || changedImages.length) await storage?.ensureBucket();
	for (const image of [...newImages, ...changedImages]) {
		// The file first: if the upload fails, the transaction is rolled back.
		await storage?.put(imageKey(siteId, image.id), image.bytes, image.info.mime);
		await client.query(
			`insert into entries (id, kind, parent, parent_kind, slug, path, file, site_id)
			 values ($1, 'image', $2, 'document', $3, $4, $5, $6)
			 on conflict (id) do update set file = excluded.file`,
			[
				image.id,
				image.document,
				slugOf(image.path),
				image.path,
				JSON.stringify(image.info),
				siteId,
			],
		);
	}
	await client.query("commit");
	console.log(`Imported: ${summary}.`);
	console.log("Search: run `pnpm search:sync` to index what was imported.");
} catch (error) {
	await client.query("rollback").catch(() => {});
	throw error;
} finally {
	await client.end();
}
