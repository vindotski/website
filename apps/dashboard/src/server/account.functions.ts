import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { type ChangePasswordFieldErrors, validateChangePassword } from "#/lib/password";
import { requireUser } from "./auth-middleware";
import { getAuth } from "./better-auth.server";

type ChangePasswordResult = { ok: true } | { ok: false; fieldErrors: ChangePasswordFieldErrors };

// Bounds only — the real rules run in the handler so failures come back as field errors
// instead of a thrown (logged, masked) validation error.
const bounded = z.string().max(200);

export const changePassword = createServerFn({ method: "POST" })
	.middleware([requireUser])
	.validator(z.object({ currentPassword: bounded, newPassword: bounded, confirmPassword: bounded }))
	.handler(async ({ data }): Promise<ChangePasswordResult> => {
		const fieldErrors = validateChangePassword(data);
		if (fieldErrors) return { ok: false, fieldErrors };
		try {
			// Checks the current password (a live session alone isn't enough), and ends every other
			// session; this one stays signed in.
			await getAuth().api.changePassword({
				body: {
					currentPassword: data.currentPassword,
					newPassword: data.newPassword,
					revokeOtherSessions: true,
				},
				headers: getRequestHeaders(),
			});
		} catch {
			return { ok: false, fieldErrors: { currentPassword: ["Current password is incorrect"] } };
		}
		return { ok: true };
	});
