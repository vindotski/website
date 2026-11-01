import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { jwt } from "better-auth/plugins";
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
// Signing in, out and resetting go through server functions (with Turnstile and rate limits), so
// Better Auth's own HTTP endpoints for them are off. Frontends get a signed token too
// (session-token.server.ts), with keys from the jwt plugin.

/** Where an invite link lands (the reset-password flow, with a welcome instead). */
export const INVITE_PATH = "/accept-invite";

/** How long a frontend's token lasts: how long a sign-out or revoked session takes to reach it. */
export const TOKEN_LIFETIME_SECONDS = 10 * 60;

/** Better Auth's HTTP endpoints that server functions replace (they'd skip Turnstile and limits). */
const SERVER_FUNCTION_PATHS = [
	"/sign-in/email",
	"/sign-up/email",
	"/request-password-reset",
	"/reset-password",
	"/change-password",
	"/token",
];

function createAuth() {
	const env = serverEnv();
	return betterAuth({
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.BETTER_AUTH_URL,
		database: drizzleAdapter(getDb(), { provider: "pg" }),
		disabledPaths: SERVER_FUNCTION_PATHS,
		// Opt-in: the session cookie on the whole domain, so a frontend's server receives it.
		advanced: env.AUTH_COOKIE_DOMAIN
			? { crossSubDomainCookies: { enabled: true, domain: env.AUTH_COOKIE_DOMAIN } }
			: undefined,
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
		plugins: [
			jwt({
				// ES256: every runtime's Web Crypto verifies it.
				jwks: { keyPairConfig: { alg: "ES256" } },
				// The issuer and audience come with each token (session-token.server.ts).
				jwt: { expirationTime: `${TOKEN_LIFETIME_SECONDS}s` },
				disableSettingJwtHeader: true,
			}),
			// Must be the last plugin: writes cookies through TanStack Start.
			tanstackStartCookies(),
		],
	});
}

type Auth = ReturnType<typeof createAuth>;
let auth: Auth | undefined;

/** Server-only Better Auth instance (created on first use, so env vars are read at runtime). */
export function getAuth() {
	auth ??= createAuth();
	return auth;
}
