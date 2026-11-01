// Brings the whole search index in line with the published documents: writes new and changed
// chunks (embedded too when OPENAI_API_KEY is set), removes the rest. Saves in the dashboard do
// this per document; run this after `content:import`, a config change, adding a key, an upgrade,
// or a failed background sync. Every site, or one with --site <slug>. Usage: pnpm search:sync
// [--site <slug>] [--dry-run]. See docs: Reading content from your site. Plain Node (type stripping), relative
// imports with extensions.
import pg from "pg";
import { treeFields } from "../src/lib/content/tree.ts";
import { documentChunks, planSync } from "../src/lib/search/chunks.ts";
import { embed } from "../src/lib/search/embed.ts";
import { EMBEDDING_MODEL } from "../src/lib/search/model.ts";
import { findSite, readTree, siteArg } from "./lib/content-db.ts";

const dryRun = process.argv.includes("--dry-run");
const apiKey = process.env.OPENAI_API_KEY;
// Without a key: keyword search only (the text, no embeddings).
const config = apiKey
	? { apiKey, baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1" }
	: null;
const model = config ? EMBEDDING_MODEL : null;

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
/** Syncs one site's index. */
async function syncSite(site: { id: string; slug: string }) {
	const tree = await readTree(client, site.id);
	// Drafts too when a frontend's server can search them (SPOTCRAFT_API_TOKEN), as the app does.
	const withDrafts = Boolean(process.env.SPOTCRAFT_API_TOKEN);
	const published = tree.documents.filter(
		({ record }) => record.status === "published" || (withDrafts && record.status === "draft"),
	);
	const { rows } = await client.query<{ entry_id: string; key: string; content_hash: string }>(
		`select c.entry_id, c.key, c.content_hash from search_chunks c
		 join entries e on e.id = c.entry_id where e.site_id = $1`,
		[site.id],
	);
	const stored = new Map<string, { key: string; contentHash: string }[]>();
	for (const r of rows) {
		stored.set(r.entry_id, [
			...(stored.get(r.entry_id) ?? []),
			{ key: r.key, contentHash: r.content_hash },
		]);
	}

	let written = 0;
	let removed = 0;
	for (const { record } of published) {
		const fields = treeFields(tree, record.path);
		if (typeof fields === "string") console.log(`  ! ${record.path}: ${fields}; fields skipped`);
		const chunks = documentChunks({
			title: record.title ?? "",
			tags: record.tags,
			attributes: record.attributes,
			body: record.body,
			fields: typeof fields === "string" ? [] : fields,
		});
		const plan = planSync(stored.get(record.id) ?? [], chunks, model);
		stored.delete(record.id);
		if (!plan.write.length && !plan.remove.length) continue;
		console.log(
			`  ~ ${record.path}: ${plan.write.length} to write, ${plan.remove.length} to remove`,
		);
		written += plan.write.length;
		removed += plan.remove.length;
		if (dryRun) continue;

		const vectors = config
			? await embed(
					plan.write.map((c) => c.content),
					config,
				)
			: null;
		await client.query("begin");
		await client.query("delete from search_chunks where entry_id = $1 and key = any($2)", [
			record.id,
			plan.remove,
		]);
		for (const [i, chunk] of plan.write.entries()) {
			await client.query(
				`insert into search_chunks (entry_id, key, heading, content, content_hash, model, embedding)
				 values ($1, $2, $3, $4, $5, $6, $7::vector)
				 on conflict (entry_id, key) do update set heading = excluded.heading,
				   content = excluded.content, content_hash = excluded.content_hash,
				   model = excluded.model, embedding = excluded.embedding, updated_at = now()`,
				[
					record.id,
					chunk.key,
					chunk.heading,
					chunk.content,
					chunk.contentHash,
					model,
					vectors ? JSON.stringify(vectors[i]) : null,
				],
			);
		}
		await client.query("commit");
	}

	// Whatever is left belongs to documents that are no longer published.
	const orphans = [...stored.keys()];
	removed += [...stored.values()].reduce((n, chunks) => n + chunks.length, 0);
	if (orphans.length && !dryRun) {
		await client.query("delete from search_chunks where entry_id = any($1)", [orphans]);
	}

	const summary = `${site.slug}: ${published.length} ${withDrafts ? "documents (with drafts)" : "published documents"}, ${written} chunks to write${config ? " (embedded)" : " (keyword only: no OPENAI_API_KEY)"}, ${removed} to remove`;
	console.log(dryRun ? `${summary}. Dry run: nothing written.` : `Synced ${summary}.`);
}

try {
	const slug = siteArg(process.argv.slice(2));
	const sites = slug
		? [await findSite(client, slug)].filter((s) => s !== null)
		: (await client.query<{ id: string; slug: string }>("select id, slug from sites order by slug"))
				.rows;
	if (slug && !sites.length) {
		console.error(`There's no site "${slug}".`);
		process.exit(1);
	}
	for (const site of sites) await syncSite(site);
} catch (error) {
	await client.query("rollback").catch(() => {});
	throw error;
} finally {
	await client.end();
}
