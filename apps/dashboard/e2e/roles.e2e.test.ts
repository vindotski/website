import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Role } from "../src/lib/roles";
import { serverErrorsSince, serverLogOffset } from "./support/db";
import { F } from "./support/functions";
import { callServerFn, getPage, type Jar } from "./support/http";
import { account, signInAs } from "./support/world";

// What each role can and can't do, checked at the endpoints (route guards only protect pages).

type Result = { ok?: boolean; error?: string; fieldErrors?: Record<string, string[]> };
const jars = {} as Record<Role, Jar>;
let logOffset = 0;

beforeAll(async () => {
	logOffset = serverLogOffset();
	for (const role of ["superadmin", "admin", "editor", "user"] as const) {
		jars[role] = await signInAs(role);
	}
});

/** A save that passes the role check fails later, on its content: that's the role passing. */
const saveNothing = (jar: Jar) =>
	callServerFn<Result>(jar, F.saveEntryFile, { collection: "nope", slug: "x", text: "---\n---\n" });

describe("happy paths", () => {
	it("lets editors and up browse files; no-access accounts get the notice page", async () => {
		for (const role of ["superadmin", "admin", "editor"] as const) {
			const res = await callServerFn<unknown[]>(jars[role], F.listFiles, undefined, "GET");
			expect(Array.isArray(res.value), role).toBe(true);
		}
		expect((await getPage(jars.user, "/e2e/files")).status).toBe(200);
	});

	it("lets editors and up change documents", async () => {
		for (const role of ["superadmin", "admin", "editor"] as const) {
			const res = await saveNothing(jars[role]);
			expect(res.redirect, role).toBeUndefined();
			expect(res.value?.ok, role).toBe(false);
		}
	});

	it("lets a site admin manage the team below superadmin", async () => {
		const editorId = account("editor").id;
		for (const role of ["user", "editor"] as const) {
			const res = await callServerFn<Result>(jars.admin, F.changeRole, { userId: editorId, role });
			expect(res.value).toEqual({ ok: true });
		}
	});

	it("lets a superadmin make and unmake superadmins", async () => {
		const adminId = account("admin").id;
		for (const role of ["superadmin", "admin"] as const) {
			const res = await callServerFn<Result>(jars.superadmin, F.changeRole, {
				userId: adminId,
				role,
			});
			expect(res.value).toEqual({ ok: true });
		}
	});
});

describe("bad paths", () => {
	it("keeps no-access accounts from changing content", async () => {
		for (const role of ["user"] as const) {
			expect((await saveNothing(jars[role])).redirect, role).toMatch(/^\/(account)?$/);
			const status = await callServerFn(jars[role], F.setEntryStatus, {
				id: crypto.randomUUID(),
				intent: "publish",
			});
			expect(status.redirect, role).toMatch(/^\/(account)?$/);
		}
	});

	it("keeps editors from folders, settings and the team", async () => {
		const folder = await callServerFn(jars.editor, F.createContentType, {
			slug: "talks",
			fields: [],
		});
		expect(folder.redirect).toBe("/");
		const team = await callServerFn(jars.editor, F.changeRole, {
			userId: account("user").id,
			role: "editor",
		});
		expect(team.redirect).toBe("/");
		expect((await callServerFn(jars.editor, F.getSiteSettings, undefined, "GET")).redirect).toBe(
			"/",
		);
	});

	it("keeps a site admin away from superadmin", async () => {
		const superId = account("superadmin").id;
		const promote = await callServerFn<Result>(jars.admin, F.changeRole, {
			userId: account("user").id,
			role: "superadmin",
		});
		expect(promote.value).toEqual({ ok: false, error: "Only a superadmin can do that." });
		const demote = await callServerFn<Result>(jars.admin, F.changeRole, {
			userId: superId,
			role: "editor",
		});
		expect(demote.value).toEqual({ ok: false, error: "Only a superadmin can do that." });
		const remove = await callServerFn<Result>(jars.admin, F.removeUser, { userId: superId });
		expect(remove.value).toEqual({ ok: false, error: "Only a superadmin can do that." });
	});

	it("refuses changing your own role", async () => {
		const res = await callServerFn<Result>(jars.superadmin, F.changeRole, {
			userId: account("superadmin").id,
			role: "admin",
		});
		expect(res.value).toEqual({ ok: false, error: "You can't change your own role." });
	});
});

afterAll(() => {
	expect(serverErrorsSince(logOffset)).toEqual([]);
});
