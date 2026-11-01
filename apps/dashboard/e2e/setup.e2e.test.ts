import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { api } from "./support/api";
import { serverErrorsSince, serverLogOffset, sql } from "./support/db";
import { E2E_DOMAIN, E2E_PASSWORD } from "./support/env";
import { F } from "./support/functions";
import { callServerFn, getPage, Jar } from "./support/http";
import { account, signInAs } from "./support/world";

// Global setup went through onboarding and created the site; this checks what that left behind,
// and that setup can't be run twice.

let logOffset = 0;
beforeAll(() => {
	logOffset = serverLogOffset();
});

describe("after setup", () => {
	it("made the first account a superadmin", async () => {
		const [row] = await sql('select role, email_verified from "user" where id = $1', [
			account("superadmin").id,
		]);
		expect(row).toEqual({ role: "superadmin", email_verified: true });
	});

	it("created the site and its root folder", async () => {
		expect(await sql("select slug, name from sites")).toEqual([{ slug: "e2e", name: "E2E" }]);
		// Other suites may have added content by now; the root is the one row with path ''.
		expect(await sql("select kind from entries where path = ''")).toEqual([{ kind: "folder" }]);
		expect((await api<{ siteName: string }>("/site")).body?.siteName).toBe("E2E");
	});

	it("opens the dashboard for the superadmin, on the site", async () => {
		const superadmin = await signInAs("superadmin");
		expect((await getPage(superadmin, "/")).location).toMatch(/\/e2e$/);
		expect((await getPage(superadmin, "/e2e")).status).toBe(200);
	});
});

describe("setup can't run twice", () => {
	it("sends /onboard elsewhere; /new-site stays open to superadmins only", async () => {
		expect((await getPage(null, "/onboard")).location).toMatch(/\/login$/);
		expect((await getPage(await signInAs("superadmin"), "/new-site")).status).toBe(200);
		expect((await getPage(await signInAs("admin"), "/new-site")).location).toMatch(
			/^(https?:\/\/[^/]+)?\/$/,
		);
	});

	it("refuses a second onboarding, and creates no account", async () => {
		const res = await callServerFn(new Jar(), F.completeOnboarding, {
			email: `intruder${E2E_DOMAIN}`,
			newPassword: E2E_PASSWORD,
			confirmPassword: E2E_PASSWORD,
		});
		expect(res.redirect).toBe("/login");
		expect(await sql('select 1 from "user" where email = $1', [`intruder${E2E_DOMAIN}`])).toEqual(
			[],
		);
	});

	it("refuses a taken or reserved slug, and a site from anyone but a superadmin", async () => {
		const superadmin = await signInAs("superadmin");
		const taken = await callServerFn(superadmin, F.createSite, { name: "Again", slug: "e2e" });
		expect(taken.value).toEqual({
			ok: false,
			fieldErrors: { slug: ["Another site uses this slug"] },
		});
		const reserved = await callServerFn(superadmin, F.createSite, { name: "API", slug: "api" });
		expect(reserved.value).toEqual({
			ok: false,
			fieldErrors: { slug: ["Spotcraft uses this name itself: pick another"] },
		});
		const byAdmin = await callServerFn(await signInAs("admin"), F.createSite, {
			name: "Two",
			slug: "two",
		});
		expect(byAdmin.redirect).toBe("/");
		expect(await sql("select slug from sites where slug = 'two'")).toEqual([]);
	});
});

afterAll(() => {
	expect(serverErrorsSince(logOffset)).toEqual([]);
});
