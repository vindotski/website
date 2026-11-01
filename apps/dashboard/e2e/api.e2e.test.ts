import { createHmac } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { api } from "./support/api";
import { serverErrorsSince, serverLogOffset } from "./support/db";
import { F } from "./support/functions";
import { callServerFn, type Jar } from "./support/http";
import { API_TOKEN, type Received, receivedWebhooks, WEBHOOK_SECRET } from "./support/webhook-stub";
import { signInAs } from "./support/world";

// What a frontend's server relies on beyond plain reads: the API token (drafts, no caching),
// listing a whole subtree, headings for a table of contents, and webhooks when content changes.

type Saved = { ok: true; id: string; path: string; updatedAt: string } | { ok: false };
type ApiDocument = {
	path: string;
	status: string;
	headings: { depth: number; text: string; anchor: string }[];
};

let editor: Jar;
let logOffset = 0;
const ids: Record<string, { id: string; updatedAt: string }> = {};
const auth = { Authorization: `Bearer ${API_TOKEN}` };

const file = (front: string, body = "") => `---\n${front}---\n${body}`;
const published = (title: string, date: string) =>
	`title: ${title}\nstatus: published\npublished_at: "${date}"\n`;
async function save(folder: string, slug: string, text: string) {
	const res = await callServerFn<Saved>(editor, F.saveEntryFile, {
		collection: folder,
		slug,
		text,
	});
	if (!res.value?.ok) throw new Error(`e2e: saving ${folder}/${slug} failed`);
	ids[`${folder}/${slug}`] = { id: res.value.id, updatedAt: res.value.updatedAt };
	return res.value;
}

/** Webhooks received for `path` since the suite started, once they've arrived. */
async function hooksFor(path: string, count: number): Promise<Received[]> {
	for (let i = 0; i < 50; i++) {
		const hooks = (await receivedWebhooks()).filter((h) => {
			const body = JSON.parse(h.body) as { path: string; previousPath?: string };
			return body.path === path || body.previousPath === path;
		});
		if (hooks.length >= count) return hooks;
		await new Promise((r) => setTimeout(r, 100));
	}
	throw new Error(`expected ${count} webhooks for ${path}`);
}

beforeAll(async () => {
	logOffset = serverLogOffset();
	const admin = await signInAs("admin");
	editor = await signInAs("editor");
	for (const slug of ["library", "library/books", "library/films"]) {
		const res = await callServerFn<{ ok: boolean }>(admin, F.createContentType, {
			slug,
			fields: [],
		});
		expect(res.value?.ok, slug).toBe(true);
	}
	await save(
		"library",
		"reading-list",
		file(
			published("Reading list", "2026-09-01T00:00:00.000Z"),
			"## Fiction\n\nA.\n\n## Fiction\n\nB.\n",
		),
	);
	await save("library/books", "dune", file(published("Dune", "2026-09-03T00:00:00.000Z")));
	await save("library/films", "arrival", file(published("Arrival", "2026-09-02T00:00:00.000Z")));
	await save("library/films", "draft-film", file("title: Draft film\nstatus: draft\n"));
});

describe("listing and headings", () => {
	it("lists a folder's own documents, or with deep=true everything below it, newest first", async () => {
		const own = await api<ApiDocument[]>("/content?folder=library");
		expect(own.body?.map((d) => d.path)).toEqual(["library/reading-list"]);
		const deep = await api<ApiDocument[]>("/content?folder=library&deep=true");
		expect(deep.body?.map((d) => d.path)).toEqual([
			"library/books/dune",
			"library/films/arrival",
			"library/reading-list",
		]);
		const page = await api<ApiDocument[]>("/content?folder=library&deep=true&limit=1&offset=1");
		expect(page.body?.map((d) => d.path)).toEqual(["library/films/arrival"]);
		expect((await api("/content")).status).toBe(400);
	});

	it("gives each document its headings, with the anchors a page uses", async () => {
		const doc = await api<ApiDocument>("/document?path=library/reading-list");
		expect(doc.body?.status).toBe("published");
		expect(doc.body?.headings).toEqual([
			{ depth: 2, text: "Fiction", anchor: "fiction" },
			{ depth: 2, text: "Fiction", anchor: "fiction-1" },
		]);
	});
});

describe("the API token", () => {
	it("reads drafts, never cached", async () => {
		const deep = await api<ApiDocument[]>("/content?folder=library/films&drafts=true", {
			headers: auth,
		});
		expect(deep.status).toBe(200);
		expect(deep.headers.get("cache-control")).toBe("private, no-store");
		// Drafts have no date: they come first, then the published ones, newest first.
		expect(deep.body?.map((d) => [d.path, d.status])).toEqual([
			["library/films/draft-film", "draft"],
			["library/films/arrival", "published"],
		]);
		const draft = await api<ApiDocument>("/document?path=library/films/draft-film&drafts=true", {
			headers: auth,
		});
		expect(draft.body?.status).toBe("draft");
	});

	it("is needed for drafts, and a wrong one is refused", async () => {
		expect((await api("/document?path=library/films/draft-film")).status).toBe(404);
		expect((await api("/document?path=library/films/draft-film&drafts=true")).status).toBe(401);
		const wrong = await api("/site", { headers: { Authorization: "Bearer not-the-token" } });
		expect(wrong.status).toBe(401);
		const publicRead = await api("/site");
		expect(publicRead.headers.get("cache-control")).toContain("public");
	});
});

describe("webhooks", () => {
	it("are signed with the secret", async () => {
		const [hook] = await hooksFor("library/books/dune", 1);
		const expected = createHmac("sha256", WEBHOOK_SECRET).update(hook.body).digest("hex");
		expect(hook.signature).toBe(`sha256=${expected}`);
		expect(hook.event).toBe("document.published");
		expect(JSON.parse(hook.body)).toMatchObject({
			event: "document.published",
			site: "e2e",
			id: ids["library/books/dune"].id,
			path: "library/books/dune",
		});
	});

	it("follow a published document through update, move, unpublish and delete", async () => {
		const { id } = ids["library/books/dune"];
		const updated = await callServerFn<Saved>(editor, F.saveEntryFile, {
			collection: "library/books",
			entryId: id,
			expectedUpdatedAt: ids["library/books/dune"].updatedAt,
			text: file(`id: ${id}\n${published("Dune (1965)", "2026-09-03T00:00:00.000Z")}`),
		});
		expect(updated.value?.ok).toBe(true);
		if (!updated.value?.ok) return;
		const moved = await callServerFn<Saved>(editor, F.renameEntry, {
			id,
			slug: "dune-1965",
			expectedUpdatedAt: updated.value.updatedAt,
		});
		expect(moved.value?.ok).toBe(true);
		if (!moved.value?.ok) return;
		const unpublished = await callServerFn<Saved>(editor, F.setEntryStatus, {
			id,
			intent: "unpublish",
			expectedUpdatedAt: moved.value.updatedAt,
		});
		expect(unpublished.value?.ok).toBe(true);
		// A draft's changes and its deletion aren't the site's business: no more events.
		await callServerFn(editor, F.deleteEntry, { id });

		const events = (await hooksFor("library/books/dune-1965", 2)).map((h) => JSON.parse(h.body));
		const all = (await hooksFor("library/books/dune", 3)).map((h) => JSON.parse(h.body));
		expect(all.map((e) => e.event)).toEqual([
			"document.published",
			"document.updated",
			"document.moved",
		]);
		expect(events.map((e) => [e.event, e.path, e.previousPath])).toEqual([
			["document.moved", "library/books/dune-1965", "library/books/dune"],
			["document.unpublished", "library/books/dune-1965", undefined],
		]);
	});

	it("tell the site when a published document is deleted", async () => {
		const { id } = ids["library/films/arrival"];
		const res = await callServerFn<{ ok: boolean }>(editor, F.deleteEntry, { id });
		expect(res.value?.ok).toBe(true);
		const events = (await hooksFor("library/films/arrival", 2)).map((h) => JSON.parse(h.body));
		expect(events.map((e) => e.event)).toEqual(["document.published", "document.deleted"]);
	});
});

afterAll(() => {
	expect(serverErrorsSince(logOffset)).toEqual([]);
});
