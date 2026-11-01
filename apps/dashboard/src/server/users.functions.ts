import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { assignableRoles, canChangeRole, ROLES } from "#/lib/roles";
import { requireSiteAdmin } from "./auth-middleware";
import {
	createAccount,
	findAppUser,
	lastSuperadminError,
	listAppUsers,
	removeFromSite,
	sendInvite,
	setRole,
} from "./users.server";

// The site's team, for site admins and superadmins (requireSiteAdmin); only a superadmin can make
// or change a superadmin. Expected failures are returned, not thrown (thrown errors are logged and
// masked).

type ActionResult = { ok: true } | { ok: false; error: string };
type InviteResult =
	| { ok: true }
	| { ok: false; error?: string; fieldErrors?: { email?: string[]; role?: string[] } };

const SUPERADMIN_ONLY = "Only a superadmin can do that.";

const id = z.string().max(64);
const roleField = z.string().max(32);

const inviteSchema = z.object({
	email: z.email("Enter a valid email address").max(320),
	role: z.enum(ROLES, { error: "Choose a role" }),
});

/** Email can fail (provider down or misconfigured): an expected outcome, said plainly. */
async function trySendInvite(email: string): Promise<string | null> {
	try {
		await sendInvite(email);
		return null;
	} catch {
		return "Couldn't send the invite email. Check the email settings (SMTP_URL) and try again.";
	}
}

export const listUsers = createServerFn({ method: "GET" })
	.middleware([requireSiteAdmin])
	.handler(async ({ context }) => ({
		users: await listAppUsers(),
		currentUserId: context.user.id,
		currentRole: context.user.role,
	}));

export const inviteUser = createServerFn({ method: "POST" })
	.middleware([requireSiteAdmin])
	.validator(z.object({ email: z.string().trim().max(320), role: roleField }))
	.handler(async ({ data, context }): Promise<InviteResult> => {
		const parsed = inviteSchema.safeParse(data);
		if (!parsed.success)
			return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
		if (!assignableRoles(context.user.role).includes(parsed.data.role)) {
			return { ok: false, fieldErrors: { role: [SUPERADMIN_ONLY] } };
		}

		const created = await createAccount({ email: parsed.data.email });
		if (!created) return { ok: false, error: "This email already has an account." };
		// The role applies as soon as they set their password.
		await setRole(created.id, parsed.data.role);
		const emailError = await trySendInvite(parsed.data.email);
		return emailError ? { ok: false, error: emailError } : { ok: true };
	});

export const resendInvite = createServerFn({ method: "POST" })
	.middleware([requireSiteAdmin])
	.validator(z.object({ userId: id }))
	.handler(async ({ data }): Promise<ActionResult> => {
		const target = await findAppUser(data.userId);
		if (!target || target.status !== "invited") {
			return { ok: false, error: "Only pending invites can be resent." };
		}
		const emailError = await trySendInvite(target.email);
		return emailError ? { ok: false, error: emailError } : { ok: true };
	});

export const changeRole = createServerFn({ method: "POST" })
	.middleware([requireSiteAdmin])
	.validator(z.object({ userId: id, role: roleField }))
	.handler(async ({ data, context }): Promise<ActionResult> => {
		const role = z.enum(ROLES).safeParse(data.role);
		if (!role.success) return { ok: false, error: "Unknown role." };
		if (data.userId === context.user.id) {
			return { ok: false, error: "You can't change your own role." };
		}
		const target = await findAppUser(data.userId);
		if (!target) return { ok: false, error: "User not found." };
		if (!canChangeRole(context.user.role, target.role, role.data)) {
			return { ok: false, error: SUPERADMIN_ONLY };
		}
		const lastSuperadmin = await lastSuperadminError(target, role.data);
		if (lastSuperadmin) return { ok: false, error: lastSuperadmin };

		await setRole(target.id, role.data);
		return { ok: true };
	});

export const removeUser = createServerFn({ method: "POST" })
	.middleware([requireSiteAdmin])
	.validator(z.object({ userId: id }))
	.handler(async ({ data, context }): Promise<ActionResult> => {
		if (data.userId === context.user.id) {
			return { ok: false, error: "You can't remove yourself." };
		}
		const target = await findAppUser(data.userId);
		if (!target) return { ok: false, error: "User not found." };
		if (!canChangeRole(context.user.role, target.role, null)) {
			return { ok: false, error: SUPERADMIN_ONLY };
		}
		const lastSuperadmin = await lastSuperadminError(target, null);
		if (lastSuperadmin) return { ok: false, error: lastSuperadmin };

		await removeFromSite(target.id);
		return { ok: true };
	});
