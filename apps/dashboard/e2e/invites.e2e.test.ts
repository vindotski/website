import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { serverErrorsSince, serverLogOffset, signIn } from "./support/db";
import { E2E_DOMAIN, E2E_PASSWORD } from "./support/env";
import { F } from "./support/functions";
import { callServerFn, getPage, Jar } from "./support/http";
import { mailCount, mailIds, waitForLink } from "./support/mailpit";
import { account, signInAs } from "./support/world";

// An admin invites someone; they follow the email link (from Mailpit), set a password and are in.

type Result = { ok: boolean; error?: string; fieldErrors?: Record<string, string[]> };
const NEW = `new${E2E_DOMAIN}`;
let admin: Jar;
let logOffset = 0;

beforeAll(async () => {
	logOffset = serverLogOffset();
	admin = await signInAs("admin");
});

describe("happy path", () => {
	it("invites, accepts from the email, sets a password and signs in with the role", async () => {
		const seen = await mailIds(NEW);
		const invited = await callServerFn<Result>(admin, F.inviteUser, { email: NEW, role: "editor" });
		expect(invited.value).toEqual({ ok: true });

		// The link goes to Better Auth, which checks the token and sends the browser on with it.
		const link = await waitForLink(NEW, seen);
		const location = (await fetch(link, { redirect: "manual" })).headers.get("location") ?? "";
		const target = new URL(location, "http://x");
		expect(target.pathname).toBe("/accept-invite");
		const token = target.searchParams.get("token") ?? "";
		expect((await getPage(null, `/accept-invite?token=${token}`)).html).toContain("Welcome");

		const browser = new Jar();
		const set = await callServerFn(browser, F.setPasswordFromEmailLink, {
			token,
			newPassword: E2E_PASSWORD,
			confirmPassword: E2E_PASSWORD,
		});
		expect(set.redirect).toBe("/");
		expect(browser.hasSession()).toBe(true);
		const me = await callServerFn<{ role: string }>(browser, F.fetchUser, undefined, "GET");
		expect(me.value?.role).toBe("editor");

		// The link works once.
		const again = await callServerFn<Result>(new Jar(), F.setPasswordFromEmailLink, {
			token,
			newPassword: "another-password-1",
			confirmPassword: "another-password-1",
		});
		expect(again.value?.ok).toBe(false);
		expect((await signIn(NEW, E2E_PASSWORD)).hasSession()).toBe(true);
	});
});

describe("forgot password", () => {
	it("emails a reset link that sets a new password and signs in", async () => {
		const seen = await mailIds(NEW);
		const requested = await callServerFn<{ message: string }>(null, F.requestPasswordReset, {
			email: NEW,
		});
		expect(requested.value?.message).toMatch(/If an account exists/);

		const link = await waitForLink(NEW, seen);
		const location = (await fetch(link, { redirect: "manual" })).headers.get("location") ?? "";
		const target = new URL(location, "http://x");
		expect(target.pathname).toBe("/reset-password");
		const token = target.searchParams.get("token") ?? "";

		const browser = new Jar();
		const set = await callServerFn(browser, F.setPasswordFromEmailLink, {
			token,
			newPassword: "reset-password-1",
			confirmPassword: "reset-password-1",
		});
		expect(set.redirect).toBe("/");
		expect((await signIn(NEW, "reset-password-1")).hasSession()).toBe(true);
		expect((await signIn(NEW, E2E_PASSWORD)).hasSession()).toBe(false);
	});

	it("answers the same for an unknown email, and sends nothing", async () => {
		const ghost = `ghost${E2E_DOMAIN}`;
		const res = await callServerFn<{ message: string }>(null, F.requestPasswordReset, {
			email: ghost,
		});
		expect(res.value?.message).toMatch(/If an account exists/);
		expect(await mailCount(ghost)).toBe(0);
	});
});

describe("bad paths", () => {
	it("refuses inviting an email that already has an account", async () => {
		const res = await callServerFn<Result>(admin, F.inviteUser, {
			email: account("editor").email,
			role: "editor",
		});
		expect(res.value).toEqual({ ok: false, error: "This email already has an account." });
	});

	it("rejects made-up tokens, and shows the expired page for them", async () => {
		for (const token of ["garbage", ""]) {
			const browser = new Jar();
			const res = await callServerFn<Result>(browser, F.setPasswordFromEmailLink, {
				token,
				newPassword: E2E_PASSWORD,
				confirmPassword: E2E_PASSWORD,
			});
			expect(res.value?.ok, token).toBe(false);
			expect(browser.hasSession()).toBe(false);
		}
		expect((await getPage(null, "/accept-invite?token=garbage")).html).toContain(
			"This invite link doesn",
		);
		expect((await getPage(null, "/reset-password?token=garbage")).location).toMatch(
			/\/login\?error=link$/,
		);
	});
});

afterAll(() => {
	expect(serverErrorsSince(logOffset)).toEqual([]);
});
