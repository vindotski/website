import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequest, getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { clientIp } from "#/lib/client-ip";
import { type ResetPasswordFieldErrors, validateResetPassword } from "#/lib/password";
import { createRateLimit } from "#/lib/rate-limit";
import { getAuth } from "./better-auth.server";
import { setTokenCookie } from "./session-token.server";
import { verifyTurnstile } from "./turnstile.server";

// Email links: a password reset and an invite are both a reset-password token. The link goes to
// Better Auth (/api/auth/reset-password/<token>), which checks the token and sends the browser on
// to /reset-password or /accept-invite with `?token=`.

const RESET_SENT_MESSAGE =
	"If an account exists for that email, we've sent a link to reset your password.";

// Per instance (src/lib/rate-limit.ts): each request sends an email.
const requestsFromIp = createRateLimit({ limit: 5, windowMs: 15 * 60_000 });

/** `sent`: false when the request was refused (too many, or Turnstile), which says nothing about the account. */
export const requestPasswordReset = createServerFn({ method: "POST" })
	.validator(
		z.object({ email: z.string().trim().max(320), turnstile: z.string().max(4096).optional() }),
	)
	.handler(async ({ data }) => {
		const ip = clientIp(getRequest());
		if (!requestsFromIp(ip)) {
			return { sent: false, message: "Too many requests. Try again in a few minutes." };
		}
		if (!(await verifyTurnstile(data.turnstile, ip))) {
			return { sent: false, message: "Couldn't confirm you're not a bot. Try again." };
		}
		try {
			await getAuth().api.requestPasswordReset({
				body: { email: data.email, redirectTo: "/reset-password" },
				headers: getRequestHeaders(),
			});
		} catch {
			// Malformed email and the like: same answer, so it doesn't reveal anything.
		}
		// Same answer whether or not the account exists.
		return { sent: true, message: RESET_SENT_MESSAGE };
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
		const signedIn = await auth.api.signInEmail({
			body: { email: account.email, password: data.newPassword },
			headers: getRequestHeaders(),
		});
		await setTokenCookie(signedIn.user);
		throw redirect({ to: "/" });
	});
