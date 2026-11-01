import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { eq } from "drizzle-orm";
import { getDb } from "#/lib/db/client.server";
import { user } from "#/lib/db/schema";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "#/lib/password";
import { serverEnv } from "./env.server";
import { sendMail } from "./mail.server";

// Accounts and sessions (Better Auth), in our own Postgres. Invite-only: nobody signs up; the
// first account comes from onboarding, everyone else from an invite (users.server.ts). Both
// invites and password resets are reset-password links; the link's destination tells them apart.

/** Where an invite link lands (the reset-password flow, with a welcome instead). */
export const INVITE_PATH = "/accept-invite";

function createAuth() {
	return betterAuth({
		secret: serverEnv().BETTER_AUTH_SECRET,
		baseURL: serverEnv().BETTER_AUTH_URL,
		database: drizzleAdapter(getDb(), { provider: "pg" }),
		user: {
			additionalFields: {
				// 'superadmin' or null — set by the server only (onboarding, the Users page).
				role: { type: "string", required: false, input: false },
			},
		},
		emailAndPassword: {
			enabled: true,
			disableSignUp: true,
			minPasswordLength: MIN_PASSWORD_LENGTH,
			maxPasswordLength: MAX_PASSWORD_LENGTH,
			// Every other session ends when a password is reset.
			revokeSessionsOnPasswordReset: true,
			// An hour: long enough to find an invite in the inbox.
			resetPasswordTokenExpiresIn: 60 * 60,
			sendResetPassword: async ({ user: to, url }) => {
				const invite = new URL(url).searchParams.get("callbackURL")?.includes(INVITE_PATH);
				await sendMail(
					invite
						? {
								to: to.email,
								subject: "You're invited to Spotcraft",
								text: `You've been invited to Spotcraft. Set your password to join:\n\n${url}\n\nThe link works once, for an hour.`,
							}
						: {
								to: to.email,
								subject: "Reset your Spotcraft password",
								text: `Set a new password:\n\n${url}\n\nThe link works once, for an hour. If you didn't ask for it, ignore this email.`,
							},
				);
			},
			// Following an email link proves the address (it also turns an invite into an account).
			onPasswordReset: async ({ user: reset }) => {
				await getDb().update(user).set({ emailVerified: true }).where(eq(user.id, reset.id));
			},
		},
		// Must be the last plugin: writes cookies through TanStack Start.
		plugins: [tanstackStartCookies()],
	});
}

type Auth = ReturnType<typeof createAuth>;
let auth: Auth | undefined;

/** Server-only Better Auth instance (created on first use, so env vars are read at runtime). */
export function getAuth() {
	auth ??= createAuth();
	return auth;
}
