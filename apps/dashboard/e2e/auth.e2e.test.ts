import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { api } from "./support/api";
import { serverErrorsSince, serverLogOffset, sql } from "./support/db";
import { F } from "./support/functions";
import { callServerFn, getPage, Jar } from "./support/http";
import { account } from "./support/world";

let logOffset = 0;
beforeAll(() => {
	logOffset = serverLogOffset();
});

const editor = () => account("editor");

describe("signing in", () => {
	it("signs in, lands on the page asked for, and signs out", async () => {
		const jar = new Jar();
		const res = await callServerFn(jar, F.signIn, { ...editor(), redirect: "/e2e/files" });
		expect(res.redirect).toBe("/e2e/files");
		expect(jar.hasSession()).toBe(true);
		expect((await getPage(jar, "/e2e/files")).status).toBe(200);
		// A link from before sites had their own paths still lands there.
		expect((await getPage(jar, "/files/posts")).location).toMatch(/\/e2e\/files\/posts$/);

		expect((await callServerFn(jar, F.signOut)).redirect).toBe("/login");
		expect(jar.hasSession()).toBe(false);
		expect((await getPage(jar, "/")).location).toMatch(/\/login\?redirect=/);
	});

	it("answers a wrong password with one generic message and no session", async () => {
		const jar = new Jar();
		const res = await callServerFn(jar, F.signIn, { email: editor().email, password: "wrong-one" });
		expect(res.value).toEqual({ error: "Invalid email or password" });
		expect(jar.hasSession()).toBe(false);
	});

	it("never redirects off-site after signing in", async () => {
		for (const redirect of ["//evil.example", "https://evil.example/x", "/\\evil.example"]) {
			const res = await callServerFn(new Jar(), F.signIn, { ...editor(), redirect });
			expect(res.redirect, redirect).toBe("/");
		}
	});
});

describe("signed out", () => {
	it("sends pages to sign in, remembering where you were going", async () => {
		const page = await getPage(null, "/e2e/files/posts");
		expect(page.status).toBe(307);
		expect(page.location).toMatch(/\/login\?redirect=%2Fe2e%2Ffiles%2Fposts$/);
	});

	it("protects the data endpoints, not just the pages", async () => {
		expect((await callServerFn(null, F.listFiles, undefined, "GET")).redirect).toBe("/login");
		expect((await callServerFn(null, F.fetchUser, undefined, "GET")).value).toBeNull();
	});

	it("rejects a tampered or made-up session cookie", async () => {
		const jar = new Jar();
		await callServerFn(jar, F.signIn, editor());
		const name = jar.sessionCookieName() ?? "";
		const value = decodeURIComponent(jar.cookies.get(name) ?? "");
		// The cookie is `<token>.<signature>`: change the token and the signature no longer fits.
		const [token, signature] = value.split(".");
		for (const forgedValue of [
			`${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}.${signature}`,
			`made-up-token.${signature}`,
			"made-up-token",
		]) {
			const forged = new Jar();
			forged.cookies.set(name, encodeURIComponent(forgedValue));
			expect((await callServerFn(forged, F.fetchUser, undefined, "GET")).value).toBeNull();
			expect((await getPage(forged, "/")).location).toMatch(/\/login/);
		}
	});
});

describe("from another origin", () => {
	it("refuses server functions unless the browser says same-origin", async () => {
		const jar = new Jar();
		await callServerFn(jar, F.signIn, editor());
		const save = { collection: "posts", slug: "csrf", text: "---\ntitle: CSRF\n---\n" };
		for (const from of [
			{ origin: "https://evil.example" },
			{ origin: "https://evil.example", fetchSite: "cross-site" },
			{ origin: null, fetchSite: "same-site" }, // a sibling subdomain, like blog.example.com
			{ origin: null }, // no Origin, Sec-Fetch-Site or Referer: not a browser page
		]) {
			const res = await callServerFn(jar, F.saveEntryFile, save, "POST", from);
			expect(res.status, JSON.stringify(from)).toBe(403);
			const read = await callServerFn(jar, F.listFiles, undefined, "GET", from);
			expect(read.status, JSON.stringify(from)).toBe(403);
		}
		expect(await sql("select 1 from entries where path = 'posts/csrf'")).toEqual([]);
		const same = await callServerFn(jar, F.listFiles, undefined, "GET", {
			fetchSite: "same-origin",
		});
		expect(Array.isArray(same.value)).toBe(true);
	});

	it("leaves the public API open to every origin", async () => {
		const res = await api("/site", { headers: { Origin: "https://evil.example" } });
		expect(res.status).toBe(200);
		expect(res.headers.get("access-control-allow-origin")).toBe("*");
	});
});

afterAll(() => {
	expect(serverErrorsSince(logOffset)).toEqual([]);
});
