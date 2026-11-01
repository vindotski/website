import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createStorage, imageKey } from "../src/lib/storage";
import { api } from "./support/api";
import { serverErrorsSince, serverLogOffset, sql } from "./support/db";
import { E2E_S3 } from "./support/env";
import { F } from "./support/functions";
import { callServerFn, type Jar } from "./support/http";
import { API_TOKEN, receivedWebhooks } from "./support/webhook-stub";
import { signInAs } from "./support/world";

// Images: uploaded to a document, stored in S3 (SeaweedFS), served at /media, and resolved to
// absolute URLs with their size by the public API.

type Saved = { ok: true; id: string; updatedAt: string } | { ok: false };
type Uploaded =
	| { ok: true; image: { id: string; path: string; name: string; file: { sha256: string } } }
	| { ok: false; error: string };
type Image = { url: string; width: number; height: number; mime: string; name: string };
type ApiDocument = {
	attributes: { cover?: { src: string; alt: string; width?: number; height?: number } };
	body: { children: { children?: { type: string; url?: string; data?: unknown }[] }[] };
	images: Image[];
};

const png = Uint8Array.from(
	atob(
		"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
	),
	(c) => c.charCodeAt(0),
);
const svg = (w: number, h: number) =>
	new TextEncoder().encode(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"/>`);

let editor: Jar;
let logOffset = 0;
let published = "";
let draft = "";
const storage = createStorage({
	endpoint: E2E_S3.S3_ENDPOINT,
	bucket: E2E_S3.S3_BUCKET,
	accessKeyId: E2E_S3.S3_ACCESS_KEY_ID,
	secretAccessKey: E2E_S3.S3_SECRET_ACCESS_KEY,
	region: E2E_S3.S3_REGION,
});

const file = (front: string, body = "") => `---\n${front}---\n${body}`;
async function upload(jar: Jar, documentId: string, name: string, bytes: Uint8Array) {
	const form = new FormData();
	form.set("documentId", documentId);
	form.set("file", new File([bytes as Uint8Array<ArrayBuffer>], name));
	return callServerFn<Uploaded>(jar, F.uploadDocumentImage, form);
}
const media = (url: string, init?: RequestInit) => fetch(url, { redirect: "manual", ...init });
async function objectExists(id: string) {
	const [{ id: site }] = await sql<{ id: string }>("select id from sites limit 1");
	return (await storage.get(imageKey(site, id))) !== null;
}

beforeAll(async () => {
	logOffset = serverLogOffset();
	const admin = await signInAs("admin");
	editor = await signInAs("editor");
	const folder = await callServerFn<{ ok: boolean }>(admin, F.createContentType, {
		slug: "gallery",
		fields: [{ key: "cover", label: "Cover", type: "image" }],
	});
	expect(folder.value?.ok).toBe(true);
	const save = (slug: string, text: string) =>
		callServerFn<Saved>(editor, F.saveEntryFile, { collection: "gallery", slug, text });
	const a = await save(
		"sunrise",
		file(
			'title: Sunrise\nstatus: published\npublished_at: "2026-10-01T00:00:00.000Z"\ncover:\n  src: cover.png\n  alt: A dot\n',
			"![Diagram](diagram.svg)\n",
		),
	);
	const b = await save("sketch", file("title: Sketch\nstatus: draft\n"));
	if (!a.value?.ok || !b.value?.ok) throw new Error("e2e: saving documents failed");
	published = a.value.id;
	draft = b.value.id;
});

describe("happy path", () => {
	it("uploads images to a document and lists them", async () => {
		expect((await upload(editor, published, "cover.png", png)).value).toMatchObject({
			ok: true,
			image: { path: "gallery/sunrise/cover.png", name: "cover.png" },
		});
		expect((await upload(editor, published, "diagram.svg", svg(30, 20))).value?.ok).toBe(true);
		const listed = await callServerFn<{ enabled: boolean; images: { name: string }[] }>(
			editor,
			F.listDocumentImages,
			{ documentId: published },
			"GET",
		);
		expect(listed.value?.enabled).toBe(true);
		expect(listed.value?.images.map((i) => i.name)).toEqual(["cover.png", "diagram.svg"]);
	});

	it("gives a frontend absolute URLs with sizes, in fields and in the body", async () => {
		const doc = (await api<ApiDocument>("/document?path=gallery/sunrise")).body;
		const cover = doc?.images.find((i) => i.name === "cover.png");
		expect(cover).toMatchObject({ mime: "image/png", width: 1, height: 1 });
		expect(cover?.url).toMatch(/\/media\/gallery\/sunrise\/cover\.png\?v=[0-9a-f]{12}$/);
		expect(doc?.attributes.cover).toEqual({
			src: cover?.url,
			alt: "A dot",
			width: 1,
			height: 1,
			mime: "image/png",
		});
		const image = doc?.body.children[0].children?.[0];
		expect(image?.url).toMatch(/\/media\/gallery\/sunrise\/diagram\.svg\?v=/);
		expect(image?.data).toEqual({ hProperties: { width: 30, height: 20 } });
	});

	it("serves them, cached for a year at their versioned URL", async () => {
		const doc = (await api<ApiDocument>("/document?path=gallery/sunrise")).body;
		const cover = doc?.images.find((i) => i.name === "cover.png");
		const res = await media(cover?.url ?? "");
		expect(res.status).toBe(200);
		expect(res.headers.get("content-type")).toBe("image/png");
		expect(res.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
		expect(new Uint8Array(await res.arrayBuffer())).toEqual(png);
		const again = await media(cover?.url ?? "", {
			headers: { "If-None-Match": res.headers.get("etag") ?? "" },
		});
		expect(again.status).toBe(304);

		const unversioned = await media(cover?.url.replace(/\?.*$/, "") ?? "");
		expect(unversioned.headers.get("cache-control")).toBe("public, max-age=60");
		const diagram = await media(doc?.images.find((i) => i.name === "diagram.svg")?.url ?? "");
		expect(diagram.headers.get("content-security-policy")).toBe("sandbox");
	});

	it("replaces an image uploaded again under the same name, with a new URL", async () => {
		const before = (await api<ApiDocument>("/document?path=gallery/sunrise")).body;
		expect((await upload(editor, published, "diagram.svg", svg(40, 10))).value?.ok).toBe(true);
		const after = (await api<ApiDocument>("/document?path=gallery/sunrise")).body;
		const url = (d?: ApiDocument) => d?.images.find((i) => i.name === "diagram.svg")?.url;
		expect(url(after)).not.toBe(url(before));
		expect(after?.images.find((i) => i.name === "diagram.svg")).toMatchObject({
			width: 40,
			height: 10,
		});
		expect(after?.images).toHaveLength(2);
	});

	it("tells the site when a published document's images change", async () => {
		const events = (await receivedWebhooks())
			.map((h) => JSON.parse(h.body) as { event: string; path: string })
			.filter((e) => e.path === "gallery/sunrise");
		expect(events.filter((e) => e.event === "document.updated").length).toBeGreaterThanOrEqual(3);
	});
});

describe("bad paths", () => {
	it("keeps a draft's images private, except for the dashboard and the API token", async () => {
		const res = await upload(editor, draft, "dot.png", png);
		expect(res.value?.ok).toBe(true);
		const url = "http://localhost:3100/media/gallery/sketch/dot.png";
		expect((await media(url)).status).toBe(404);
		const trusted = await media(url, { headers: { Authorization: `Bearer ${API_TOKEN}` } });
		expect(trusted.status).toBe(200);
		expect(trusted.headers.get("cache-control")).toBe("private, no-store");
		expect((await media(url, { headers: { cookie: editor.header() } })).status).toBe(200);
	});

	it("refuses files that aren't what their name says, and accounts without dashboard access", async () => {
		expect((await upload(editor, published, "photo.jpg", png)).value).toEqual({
			ok: false,
			error: "This is a PNG image: name it .png",
		});
		const text = new TextEncoder().encode("not an image");
		expect((await upload(editor, published, "notes.png", text)).value?.ok).toBe(false);
		expect((await upload(editor, published, "Bad Name.png", png)).value?.ok).toBe(false);
		const user = await signInAs("user");
		const res = await upload(user, published, "sneaky.png", png);
		expect(res.value).toBeUndefined();
		expect(await sql("select 1 from entries where slug = 'sneaky.png'")).toEqual([]);
		expect((await media("http://localhost:3100/media/gallery/sunrise/nope.png")).status).toBe(404);
	});

	it("deletes an image's file with it, and a document's images with the document", async () => {
		const [cover] = await sql<{ id: string }>(
			"select id from entries where path = 'gallery/sunrise/cover.png'",
		);
		expect(await objectExists(cover.id)).toBe(true);
		const res = await callServerFn<{ ok: boolean }>(editor, F.deleteDocumentImage, {
			id: cover.id,
		});
		expect(res.value?.ok).toBe(true);
		expect(await objectExists(cover.id)).toBe(false);
		expect((await media("http://localhost:3100/media/gallery/sunrise/cover.png")).status).toBe(404);

		const [dot] = await sql<{ id: string }>(
			"select id from entries where path = 'gallery/sketch/dot.png'",
		);
		const deleted = await callServerFn<{ ok: boolean }>(editor, F.deleteEntry, { id: draft });
		expect(deleted.value?.ok).toBe(true);
		expect(await sql("select 1 from entries where path like 'gallery/sketch%'")).toEqual([]);
		expect(await objectExists(dot.id)).toBe(false);
	});
});

afterAll(() => {
	expect(serverErrorsSince(logOffset)).toEqual([]);
});
