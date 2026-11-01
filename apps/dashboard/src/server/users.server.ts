import { generateRandomString } from "better-auth/crypto";
import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "#/lib/db/client.server";
import { siteMembers, user } from "#/lib/db/schema";
import type { Role, SiteRole } from "#/lib/roles";
import { getAuth, INVITE_PATH } from "./better-auth.server";
import { currentSiteId } from "./site.server";

// The team of this site: superadmins (user.role = 'superadmin', every site), members of this site
// with their role (site_members.role) and accounts with no access yet. Roles are derived the same
// way as for the signed-in user (roleOf in auth.server.ts).

export type AppUser = {
	id: string;
	email: string;
	role: Role;
	status: "invited" | "active";
	invitedAt: string | null;
	lastSignInAt: string | null;
};

type UserRow = typeof user.$inferSelect;

function toAppUser(row: UserRow, siteRole: SiteRole | undefined, lastSignIn?: Date): AppUser {
	return {
		id: row.id,
		email: row.email,
		role: row.role === "superadmin" ? "superadmin" : (siteRole ?? "user"),
		// Invited and hasn't followed the link yet (following it verifies the email).
		status: row.emailVerified ? "active" : "invited",
		invitedAt: row.emailVerified ? null : row.createdAt.toISOString(),
		lastSignInAt: lastSignIn?.toISOString() ?? null,
	};
}

/** These users' roles on this site, and which of them are members of any site. */
async function memberships(userIds: string[]) {
	if (!userIds.length) return { here: new Map<string, SiteRole>(), anywhere: new Set<string>() };
	const site = await currentSiteId();
	const rows = await getDb()
		.select({ userId: siteMembers.userId, siteId: siteMembers.siteId, role: siteMembers.role })
		.from(siteMembers)
		.where(inArray(siteMembers.userId, userIds));
	return {
		here: new Map(rows.filter((r) => r.siteId === site).map((r) => [r.userId, r.role])),
		anywhere: new Set(rows.map((r) => r.userId)),
	};
}

/** When each user last signed in (their newest session). */
async function lastSignIns(userIds: string[]) {
	const context = await getAuth().$context;
	const result = new Map<string, Date>();
	for (const id of userIds) {
		const sessions = await context.internalAdapter.listSessions(id);
		const newest = sessions.map((s) => s.createdAt).sort((a, b) => +b - +a)[0];
		if (newest) result.set(id, newest);
	}
	return result;
}

/** This site's team: superadmins, its members, and accounts that belong to no site. */
export async function listAppUsers(): Promise<AppUser[]> {
	const rows = await getDb().select().from(user).orderBy(asc(user.email));
	const ids = rows.map((u) => u.id);
	const [{ here, anywhere }, signIns] = await Promise.all([memberships(ids), lastSignIns(ids)]);
	return rows
		.filter((u) => u.role === "superadmin" || here.has(u.id) || !anywhere.has(u.id))
		.map((u) => toAppUser(u, here.get(u.id), signIns.get(u.id)));
}

export async function findAppUser(userId: string): Promise<AppUser | null> {
	const [row] = await getDb().select().from(user).where(eq(user.id, userId));
	if (!row) return null;
	const [{ here }, signIns] = await Promise.all([memberships([userId]), lastSignIns([userId])]);
	return toAppUser(row, here.get(userId), signIns.get(userId));
}

/** Error message if this change would leave Spotcraft without a superadmin, otherwise null. */
export async function lastSuperadminError(
	target: AppUser,
	nextRole: Role | null,
): Promise<string | null> {
	if (target.role !== "superadmin" || nextRole === "superadmin") return null;
	const superadmins = (await listAppUsers()).filter(
		(u) => u.role === "superadmin" && u.status === "active",
	);
	return superadmins.length <= 1 && superadmins[0]?.id === target.id
		? "Spotcraft needs at least one superadmin. Make someone else superadmin first."
		: null;
}

/**
 * Gives someone a role on this site: superadmin sets the account flag (every site, no membership
 * needed); admin or editor clears it and sets their membership's role; user clears it and
 * ends their membership here.
 */
export async function setRole(userId: string, role: Role): Promise<void> {
	const db = getDb();
	await db
		.update(user)
		.set({ role: role === "superadmin" ? "superadmin" : null })
		.where(eq(user.id, userId));
	const siteId = await currentSiteId();
	if (role === "admin" || role === "editor") {
		await db
			.insert(siteMembers)
			.values({ siteId, userId, role })
			.onConflictDoUpdate({ target: [siteMembers.siteId, siteMembers.userId], set: { role } });
	} else if (role === "user") {
		await db
			.delete(siteMembers)
			.where(and(eq(siteMembers.siteId, siteId), eq(siteMembers.userId, userId)));
	}
}

/**
 * Creates an account with a password (the first superadmin) or without one (an invite: a random,
 * never-shared password until they set their own). Null if the email is taken.
 */
export async function createAccount(input: {
	email: string;
	password?: string;
	role?: "superadmin";
}): Promise<{ id: string } | null> {
	const context = await getAuth().$context;
	if (await context.internalAdapter.findUserByEmail(input.email)) return null;
	const created = await context.internalAdapter.createUser(
		{
			email: input.email,
			name: input.email,
			emailVerified: !!input.password,
			role: input.role ?? null,
		},
		// Created by the server for someone (onboarding or an invite), never by sign-up.
		{ method: "admin" },
	);
	await context.internalAdapter.linkAccount({
		userId: created.id,
		providerId: "credential",
		accountId: created.id,
		password: await context.password.hash(input.password ?? generateRandomString(32)),
	});
	return { id: created.id };
}

/** Emails an invite: a link to set their password, landing on /accept-invite. */
export async function sendInvite(email: string) {
	await getAuth().api.requestPasswordReset({ body: { email, redirectTo: INVITE_PATH } });
}

/**
 * Takes someone off this site: ends their membership and superadmin flag. The account itself is
 * deleted (its sessions with it) when it belongs to no other site.
 */
export async function removeFromSite(userId: string): Promise<void> {
	await setRole(userId, "user");
	const { anywhere } = await memberships([userId]);
	if (anywhere.has(userId)) return;
	await (await getAuth().$context).internalAdapter.deleteUser(userId);
}
