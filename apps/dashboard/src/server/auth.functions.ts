import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { safeRedirect } from "#/lib/safe-redirect";
import { getCurrentUser } from "./auth.server";
import { getAuth } from "./better-auth.server";

export const fetchUser = createServerFn({ method: "GET" }).handler(() => getCurrentUser());

// Bounds only: a malformed email is a normal failed sign-in ("Invalid email or password"), not a
// validation exception (those get logged as server errors and surface as "Something went wrong").
const signInSchema = z.object({
	email: z.string().trim().max(320),
	password: z.string().max(200),
	redirect: z.string().max(2048).optional(),
});

export const signIn = createServerFn({ method: "POST" })
	.validator(signInSchema)
	.handler(async ({ data }) => {
		try {
			// Sets the session cookie (tanstackStartCookies).
			await getAuth().api.signInEmail({
				body: { email: data.email, password: data.password },
				headers: getRequestHeaders(),
			});
		} catch {
			// Expected outcome, not an exception: return it (thrown errors are logged and masked).
			// One generic message so the response doesn't reveal which emails have accounts.
			return { error: "Invalid email or password" };
		}
		throw redirect({ href: safeRedirect(data.redirect) });
	});

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
	await getAuth()
		.api.signOut({ headers: getRequestHeaders() })
		.catch(() => undefined);
	throw redirect({ to: "/login" });
});
