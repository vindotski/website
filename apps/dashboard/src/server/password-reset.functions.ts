import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { type ResetPasswordFieldErrors, validateResetPassword } from "#/lib/password";
import { getAuth } from "./better-auth.server";

// Email links: a password reset and an invite are both a reset-password token. The link goes to
// Better Auth (/api/auth/reset-password/<token>), which checks the token and sends the browser on
// to /reset-password or /accept-invite with `?token=`.

const RESET_SENT_MESSAGE =
	"If an account exists for that email, we've sent a link to reset your password.";

export const requestPasswordReset = createServerFn({ method: "POST" })
	.validator(z.object({ email: z.string().trim().max(320) }))
	.handler(async ({ data }) => {
		try {
			await getAuth().api.requestPasswordReset({
				body: { email: data.email, redirectTo: "/reset-password" },
				headers: getRequestHeaders(),
			});
		} catch {
			// Malformed email and the like: same answer, so it doesn't reveal anything.
		}
		// Same answer whether or not the account exists.
		return { message: RESET_SENT_MESSAGE };
	});

const token = z.string().max(256);

/** Whether a reset or invite token is still good (the page shows "expired" otherwise). */
export const checkEmailToken = createServerFn({ method: "GET" })
	.validator(z.object({ token }))
	.handler(async ({ data }) => {
		const context = await getAuth().$context;
		const found = await context.internalAdapter.findVerificationValue(
			`reset-password:${data.token}`,
		);
		return { valid: !!found && found.expiresAt > new Date() };
	});

type SetPasswordResult = { ok: false; fieldErrors: ResetPasswordFieldErrors };

const bounded = z.string().max(200);

/**
 * Set a password from an email link (reset or invite), then sign in with it. Every other session
 * of the account ends.
 */
export const setPasswordFromEmailLink = createServerFn({ method: "POST" })
	.validator(z.object({ token, newPassword: bounded, confirmPassword: bounded }))
	.handler(async ({ data }): Promise<SetPasswordResult> => {
		const fieldErrors = validateResetPassword(data);
		if (fieldErrors) return { ok: false, fieldErrors };

		const auth = getAuth();
		const context = await auth.$context;
		const found = await context.internalAdapter.findVerificationValue(
			`reset-password:${data.token}`,
		);
		const account = found && (await context.internalAdapter.findUserById(found.value));
		const expired = {
			ok: false as const,
			fieldErrors: { newPassword: ["This link has expired. Request a new one."] },
		};
		if (!found || !account || found.expiresAt < new Date()) return expired;

		try {
			await auth.api.resetPassword({ body: { token: data.token, newPassword: data.newPassword } });
		} catch {
			return expired;
		}
		await auth.api.signInEmail({
			body: { email: account.email, password: data.newPassword },
			headers: getRequestHeaders(),
		});
		throw redirect({ to: "/" });
	});
