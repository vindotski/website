// Writes a site's content tree as files: `_config.json` per folder that has one, `<path>/index.md`
// per document with its images next to it (their bytes, from S3), plus site.yaml. Usage: pnpm
// content:export <dir> [--site <slug>] (else the default site). Deterministic: the same database
// always gives the same bytes. See docs: Files. Plain Node (type stripping), relative imports
// with extensions.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import pg from "pg";
import { isStableTree } from "../src/lib/content/body.ts";
import { canonicalDocument, sameJson } from "../src/lib/content/canonical.ts";
import { siteToYaml } from "../src/lib/content/files.ts";
import { treeFields, treeToFiles } from "../src/lib/content/tree.ts";
import { imageKey } from "../src/lib/storage.ts";
import {
	FORMAT,
	FORMAT_FILE,
	findSite,
	positionals,
	readImages,
	readSite,
	readTree,
	SITE_FILE,
	siteArg,
	storageFromEnv,
} from "./lib/content-db.ts";

const args = process.argv.slice(2);
const target = positionals(args)[0];
if (!target) {
	console.error("Usage: pnpm content:export <dir> [--site <slug>]");
	process.exit(1);
}
const dir = resolve(target);
if (existsSync(dir) && readdirSync(dir).length && !existsSync(join(dir, FORMAT_FILE))) {
	console.error(`Refusing to export: ${dir} isn't empty and isn't a previous export.`);
	process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
	// --site <slug>, else the default site.
	const found = await findSite(client, siteArg(args));
	if (!found) {
		console.error(siteArg(args) ? `There's no site "${siteArg(args)}".` : "There's no site yet.");
		process.exit(1);
	}
	const tree = await readTree(client, found.id);

	// The guarantee only holds for canonical rows; stop rather than export something lossy.
	const problems = tree.documents.filter(({ record }) => {
		const fields = treeFields(tree, record.path);
		// jsonb doesn't keep key order, so compare values (order is fixed on export).
		return (
			typeof fields === "string" ||
			!sameJson(canonicalDocument(fields, record), record) ||
			(record.body !== null && !isStableTree(record.body))
		);
	});
	if (problems.length) {
		console.error("These documents aren't stored in canonical form (open and save them first):");
		for (const { record } of problems) console.error(`  ${record.path}`);
		process.exit(1);
	}

	const files = new Map<string, string | Uint8Array>([[FORMAT_FILE, FORMAT]]);
	files.set(SITE_FILE, siteToYaml(await readSite(client, found.id)));
	for (const [path, text] of treeToFiles(tree)) files.set(path, text);

	// Images: their exact bytes, checked against the stored hash.
	const images = await readImages(client, found.id);
	const storage = storageFromEnv();
	if (images.length && !storage) {
		console.error(`There are ${images.length} images: set S3_* (see .env.example) to export them.`);
		process.exit(1);
	}
	for (const image of images) {
		const object = await storage?.get(imageKey(found.id, image.id));
		const bytes = object ? new Uint8Array(await object.arrayBuffer()) : null;
		if (!bytes || createHash("sha256").update(bytes).digest("hex") !== image.file.sha256) {
			console.error(`${image.path}: its file is missing or changed in the bucket.`);
			process.exit(1);
		}
		files.set(image.path, bytes);
	}

	// Previous output is replaced as a whole, so removed folders and documents don't linger.
	// Hidden entries (.git, .github, …) are left alone.
	for (const name of existsSync(dir) ? readdirSync(dir) : []) {
		if (!name.startsWith(".")) rmSync(join(dir, name), { recursive: true, force: true });
	}
	for (const [path, text] of files) {
		mkdirSync(dirname(join(dir, path)), { recursive: true });
		writeFileSync(join(dir, path), text);
	}
	const configs = [...files.keys()].filter((f) => f.endsWith("_config.json")).length;
	console.log(
		`Exported site settings, ${configs} configs, ${tree.documents.length} documents and ${images.length} images to ${dir}`,
	);
} finally {
	await client.end();
}
