import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { api } from "./support/api";
import { serverErrorsSince, serverLogOffset, sql } from "./support/db";
import { FAIL_WORD } from "./support/embeddings-stub";
import { F } from "./support/functions";
import { callServerFn, type Jar } from "./support/http";
import { API_TOKEN } from "./support/webhook-stub";
import { signInAs } from "./support/world";

// Semantic search: published documents are indexed in the background after a save, and /api/search
// finds them and their sections. Embeddings come from the stub in support/embeddings-stub.ts, which
// matches on shared words.

type Saved = { ok: true; id: string; path: string; updatedAt: string } | { ok: false };
type Result = {
	path: string;
	anchor: string | null;
	folder: string;
	title: string;
	heading: string | null;
	snippet: string;
	score: number;
};

let editor: Jar;
let logOffset = 0;
let draftId = "";
let publishedId = "";
let updatedAt = "";

const file = (front: string, body = "") => `---\n${front}---\n${body}`;
const save = (slug: string, text: string) =>
	callServerFn<Saved>(editor, F.saveEntryFile, { collection: "guides", slug, text });
const search = (query: string, headers?: HeadersInit) =>
	api<{ mode: string; results: Result[] }>(`/search?${query}`, { headers });

/** Waits for the background sync: chunks for `id` match `expected` (a count, or none). */
async function indexed(id: string, expected: (count: number) => boolean) {
	for (let i = 0; i < 40; i++) {
		const [row] = await sql<{ count: string }>(
			"select count(*) from search_chunks where entry_id = $1",
			[id],
		);
		if (expected(Number(row.count))) return;
		await new Promise((r) => setTimeout(r, 100));
	}
	throw new Error(`search index for ${id} didn't settle`);
}

beforeAll(async () => {
	logOffset = serverLogOffset();
	const admin = await signInAs("admin");
	editor = await signInAs("editor");
	const folder = await callServerFn<{ ok: boolean }>(admin, F.createContentType, {
		slug: "guides",
		fields: [{ key: "summary", label: "Summary", type: "text" }],
	});
	expect(folder.value?.ok).toBe(true);

	const published = await save(
		"field-notes",
		file(
			'title: Field notes\nstatus: published\npublished_at: "2026-10-01T09:00:00.000Z"\ntags:\n  - data\nsummary: Notes from building a portfolio CMS.\n',
			"## Choosing a database\n\nPostgres with pgvector keeps embeddings next to the content.\n\n## Deploying\n\nOne Docker image runs everywhere.\n",
		),
	);
	const draft = await save(
		"secret-plans",
		file(
			"title: Secret plans\nstatus: draft\n",
			"## Choosing a database\n\nPostgres pgvector embeddings.\n",
		),
	);
	if (!published.value?.ok || !draft.value?.ok) throw new Error("e2e: saving documents failed");
	({ id: publishedId, updatedAt } = published.value);
	draftId = draft.value.id;
	await indexed(publishedId, (n) => n === 3); // the summary and two sections
});

describe("happy path", () => {
	it("finds the section that matches, with its heading and anchor", async () => {
		const res = await search("q=postgres+pgvector+embeddings");
		expect(res.status).toBe(200);
		expect(res.body?.results[0]).toMatchObject({
			path: "guides/field-notes",
			anchor: "choosing-a-database",
			folder: "guides",
			title: "Field notes",
			heading: "Choosing a database",
			snippet: "Postgres with pgvector keeps embeddings next to the content.",
		});
		// The stub key makes this hybrid: words and meaning, fused.
		expect(res.body?.mode).toBe("hybrid");
		expect(res.body?.results[0].score).toBeGreaterThan(0);
		expect(res.body?.results[0].score).toBeLessThanOrEqual(1);
	});

	it("finds a document by its summary, with no anchor", async () => {
		const res = await search("q=notes+building+portfolio+cms");
		expect(res.body?.results[0]).toMatchObject({
			path: "guides/field-notes",
			anchor: null,
			heading: null,
		});
	});

	it("filters by folder and tag", async () => {
		const q = "q=postgres+pgvector+embeddings";
		expect((await search(`${q}&folder=guides&tag=data`)).body?.results.length).toBeGreaterThan(0);
		expect((await search(`${q}&folder=posts`)).body?.results).toEqual([]);
		expect((await search(`${q}&tag=other`)).body?.results).toEqual([]);
	});
});

describe("bad paths", () => {
	it("never returns drafts publicly; the API token's holder can ask for them", async () => {
		// Drafts are indexed because this server has an API token (see global-setup).
		await indexed(draftId, (n) => n > 0);
		const q = "q=secret+plans+pgvector";
		expect((await search(q)).body?.results.map((r) => r.path)).not.toContain("guides/secret-plans");
		expect((await search(`${q}&drafts=true`)).status).toBe(401);
		const trusted = await search(`${q}&drafts=true`, { Authorization: `Bearer ${API_TOKEN}` });
		expect(trusted.body?.results.map((r) => r.path)).toContain("guides/secret-plans");
	});

	it("drops a document from search as soon as it's unpublished", async () => {
		const res = await callServerFn<Saved>(editor, F.setEntryStatus, {
			id: publishedId,
			intent: "unpublish",
			expectedUpdatedAt: updatedAt,
		});
		expect(res.value?.ok).toBe(true);
		expect((await search("q=postgres+pgvector+embeddings")).body?.results).toEqual([]);
	});

	it("refuses bad queries and writes", async () => {
		expect((await search("q=a")).status).toBe(400);
		expect((await search(`q=${"x".repeat(201)}`)).status).toBe(400);
		expect((await search("q=fine&limit=11")).status).toBe(400);
		expect((await api("/search?q=fine", { method: "POST" })).status).toBe(405);
	});

	it("still answers, by words, when the embeddings API fails", async () => {
		// The stub refuses any text with FAIL_WORD, so the query can't be embedded. By now both
		// guides are drafts (unpublished above): search them with the token.
		const res = await search(`q=pgvector+or+${FAIL_WORD}&drafts=true`, {
			Authorization: `Bearer ${API_TOKEN}`,
		});
		expect(res.status).toBe(200);
		expect(res.body?.mode).toBe("keyword");
		const hit = res.body?.results.find((r) => r.anchor === "choosing-a-database");
		expect(hit?.score).toBeGreaterThan(0);
		expect(hit?.score).toBeLessThanOrEqual(1);
	});

	it("rate-limits each caller, but not the API token's holder", async () => {
		const headers = { "X-Forwarded-For": "203.0.113.9" };
		const statuses: number[] = [];
		for (let i = 0; i < 31; i++) statuses.push((await search(`q=limit+${i}`, headers)).status);
		expect(statuses.slice(0, 30).every((s) => s === 200)).toBe(true);
		expect(statuses[30]).toBe(429);
		expect((await search("q=limit+other")).status).toBe(200);
		const trusted = { ...headers, Authorization: `Bearer ${API_TOKEN}` };
		expect((await search("q=limit+again", trusted)).status).toBe(200);
	});
});

afterAll(() => {
	expect(serverErrorsSince(logOffset)).toEqual([]);
});
