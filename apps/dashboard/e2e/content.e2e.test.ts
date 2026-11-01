import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { api } from "./support/api";
import { serverErrorsSince, serverLogOffset, sql } from "./support/db";
import { F } from "./support/functions";
import { callServerFn, type Jar } from "./support/http";
import { signInAs } from "./support/world";

// The core loop: a folder with fields, a document saved as its index.md, published, and read by a
// frontend through the public API.

type Saved =
	| { ok: true; id: string; path: string; updatedAt: string }
	| { ok: false; error?: string; fieldErrors?: Record<string, string[]>; conflict?: unknown };

let admin: Jar;
let editor: Jar;
let logOffset = 0;

const file = (front: string, body = "") => `---\n${front}---\n${body}`;
const save = (input: {
	slug?: string;
	entryId?: string;
	text: string;
	expectedUpdatedAt?: string;
}) => callServerFn<Saved>(editor, F.saveEntryFile, { collection: "posts", ...input });
type ApiDocument = { path: string; title: string; body: { type: string } | null };
/** The document as the public API serves it, or undefined when it isn't public. */
async function publicDoc(path: string) {
	const res = await api<ApiDocument>(`/document?path=${encodeURIComponent(path)}`);
	return res.status === 200 ? res.body : undefined;
}

beforeAll(async () => {
	logOffset = serverLogOffset();
	admin = await signInAs("admin");
	editor = await signInAs("editor");
	const folder = await callServerFn<{ ok: boolean }>(admin, F.createContentType, {
		slug: "posts",
		fields: [{ key: "summary", label: "Summary", type: "text", required: true }],
	});
	expect(folder.value?.ok).toBe(true);
});

describe("happy path", () => {
	let id = "";
	let updatedAt = "";

	it("creates a draft from its file, which only the dashboard sees", async () => {
		const res = await save({
			slug: "hello",
			text: file(
				"title: Hello\nstatus: draft\nsummary: The first post.\n",
				"Some **bold** words.\n",
			),
		});
		expect(res.value).toMatchObject({ ok: true, path: "posts/hello/index.md" });
		if (!res.value?.ok) return;
		({ id, updatedAt } = res.value);
		expect(await publicDoc("posts/hello")).toBeUndefined();
	});

	it("publishes it, and a frontend reads it with its body as a Markdown tree", async () => {
		const res = await callServerFn<Saved>(editor, F.setEntryStatus, {
			id,
			intent: "publish",
			expectedUpdatedAt: updatedAt,
		});
		expect(res.value?.ok).toBe(true);
		if (res.value?.ok) updatedAt = res.value.updatedAt;
		expect(await publicDoc("posts/hello")).toMatchObject({
			title: "Hello",
			body: { type: "root" },
		});
		const listed = await api<ApiDocument[]>("/content?folder=posts");
		expect(listed.body?.map((d) => d.path)).toEqual(["posts/hello"]);
	});

	it("unpublishes it, and it's gone from the frontend", async () => {
		const res = await callServerFn<Saved>(editor, F.setEntryStatus, {
			id,
			intent: "unpublish",
			expectedUpdatedAt: updatedAt,
		});
		expect(res.value?.ok).toBe(true);
		expect(await publicDoc("posts/hello")).toBeUndefined();
	});

	it("refuses a save based on an old version instead of overwriting", async () => {
		const res = await save({
			entryId: id,
			expectedUpdatedAt: "2000-01-01T00:00:00.000Z",
			text: file(`id: ${id}\ntitle: Hello again\nstatus: draft\nsummary: Changed.\n`),
		});
		expect(res.value).toMatchObject({ ok: false, conflict: expect.anything() });
	});
});

describe("bad paths", () => {
	it("reports a missing required field by its key, and saves nothing", async () => {
		const res = await save({
			slug: "no-summary",
			text: file("title: No summary\nstatus: draft\n"),
		});
		expect(res.value?.ok).toBe(false);
		expect(res.value?.ok === false && res.value.fieldErrors?.summary).toBeTruthy();
		expect(await sql("select 1 from entries where path = 'posts/no-summary'")).toEqual([]);
	});

	it("refuses HTML in the body, naming the line", async () => {
		const res = await save({
			slug: "html",
			text: file("title: HTML\nstatus: draft\nsummary: Tags.\n", "Fine.\n\n<b>bold</b>\n"),
		});
		expect(res.value?.ok === false && res.value.fieldErrors?.body?.[0]).toMatch(/Line \d+/);
	});

	it("keeps drafts out of the public API, which has no way to write", async () => {
		await save({ slug: "draft", text: file("title: Draft\nstatus: draft\nsummary: Not yet.\n") });
		expect((await api("/document?path=posts/draft")).status).toBe(404);
		expect((await api<ApiDocument[]>("/content?folder=posts")).body?.map((d) => d.path)).toEqual(
			[],
		);
		for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
			const res = await api("/content?folder=posts", { method });
			expect(res.status, method).toBeGreaterThanOrEqual(400);
		}
		expect((await api("/document?path=../etc/passwd")).status).toBe(400);
	});
});

afterAll(() => {
	expect(serverErrorsSince(logOffset)).toEqual([]);
});
