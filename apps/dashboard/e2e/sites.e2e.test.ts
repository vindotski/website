import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { api } from "./support/api";
import { serverErrorsSince, serverLogOffset, sql } from "./support/db";
import { F } from "./support/functions";
import { callServerFn, getPage, type Jar } from "./support/http";
import { receivedWebhooks } from "./support/webhook-stub";
import { signInAs } from "./support/world";

// More than one site: each has its own base URL (/<slug>/…), content, team and webhooks; /api is
// the default site's.

type Site = { slug: string; name: string; isDefault: boolean };
type Saved = { ok: true; id: string; path: string } | { ok: false };

let superadmin: Jar;
let editor: Jar;
let logOffset = 0;

beforeAll(async () => {
	logOffset = serverLogOffset();
	superadmin = await signInAs("superadmin");
	editor = await signInAs("editor");
	const created = await callServerFn(superadmin, F.createSite, { name: "Second", slug: "second" });
	expect(created.redirect).toBe("/second");
	const folder = await callServerFn<{ ok: boolean }>(
		superadmin,
		F.createContentType,
		{ slug: "notes", fields: [] },
		"POST",
		{ site: "second" },
	);
	expect(folder.value?.ok).toBe(true);
	const saved = await callServerFn<Saved>(
		superadmin,
		F.saveEntryFile,
		{
			collection: "notes",
			slug: "hello",
			text: '---\ntitle: Hello\nstatus: published\npublished_at: "2026-10-01T00:00:00.000Z"\n---\nHi.\n',
		},
		"POST",
		{ site: "second" },
	);
	expect(saved.value?.ok).toBe(true);
});

describe("a second site", () => {
	it("has its own API; /api stays the default site's", async () => {
		const [{ name }] = await sql<{ name: string }>("select name from sites where slug = 'e2e'");
		expect((await api<{ siteName: string }>("/site", {}, "/second/api")).body?.siteName).toBe(
			"Second",
		);
		expect((await api<{ siteName: string }>("/site", {}, "/e2e/api")).body?.siteName).toBe(name);
		expect((await api<{ siteName: string }>("/site")).body?.siteName).toBe(name);
		const notes = await api<{ path: string }[]>("/content?folder=notes", {}, "/second/api");
		expect(notes.body?.map((d) => d.path)).toEqual(["notes/hello"]);
		const elsewhere = await api<{ path: string }[]>("/content?folder=notes");
		expect(elsewhere.body ?? []).toEqual([]);
	});

	it("names itself in webhooks", async () => {
		for (let i = 0; i < 50; i++) {
			const hook = (await receivedWebhooks())
				.map((h) => JSON.parse(h.body) as { site: string; path: string })
				.find((h) => h.path === "notes/hello");
			if (hook) return expect(hook.site).toBe("second");
			await new Promise((r) => setTimeout(r, 100));
		}
		throw new Error("no webhook for notes/hello");
	});

	it("is listed for superadmins, not for another site's editor", async () => {
		const mine = await callServerFn<Site[]>(superadmin, F.mySites, undefined, "GET");
		expect(mine.value?.map((s) => s.slug).sort()).toEqual(["e2e", "second"]);
		const theirs = await callServerFn<Site[]>(editor, F.mySites, undefined, "GET");
		expect(theirs.value?.map((s) => s.slug)).toEqual(["e2e"]);
	});

	it("keeps another site's editor out", async () => {
		const files = await callServerFn(editor, F.listFiles, undefined, "GET", { site: "second" });
		expect(files.value).toBeUndefined();
		expect(files.redirect).toBeDefined();
		const save = await callServerFn(
			editor,
			F.saveEntryFile,
			{ collection: "notes", slug: "x", text: "---\ntitle: X\n---\n" },
			"POST",
			{ site: "second" },
		);
		expect(save.redirect).toBeDefined();
		expect(await sql("select 1 from entries where path = 'notes/x'")).toEqual([]);
	});

	it("opens the dashboard at /<slug>, and 404s for a site that doesn't exist", async () => {
		expect((await getPage(superadmin, "/second/files")).status).toBe(200);
		expect((await getPage(superadmin, "/nope/files")).status).toBe(404);
		expect((await api("/site", {}, "/nope/api")).status).toBe(404);
	});
});

describe("the default site", () => {
	it("moves /api when a superadmin changes it, and only a superadmin can", async () => {
		const byEditor = await callServerFn(editor, F.makeDefault, undefined, "POST", {
			site: "second",
		});
		expect(byEditor.redirect).toBeDefined();
		const changed = await callServerFn(superadmin, F.makeDefault, undefined, "POST", {
			site: "second",
		});
		expect(changed.value).toEqual({ ok: true });
		expect((await api<{ siteName: string }>("/site")).body?.siteName).toBe("Second");
		await callServerFn(superadmin, F.makeDefault, undefined, "POST", { site: "e2e" });
		expect((await api<{ siteName: string }>("/site")).body?.siteName).not.toBe("Second");
	});
});

afterAll(async () => {
	await callServerFn(superadmin, F.makeDefault, undefined, "POST", { site: "e2e" });
	await sql("delete from sites where slug = 'second'");
	expect(serverErrorsSince(logOffset)).toEqual([]);
});
