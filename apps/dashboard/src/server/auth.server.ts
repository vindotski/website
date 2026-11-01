import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "#/lib/db/client.server";
import { siteMembers } from "#/lib/db/schema";
import type { Role } from "#/lib/roles";
import { getAuth } from "./better-auth.server";
import { currentSiteId } from "./site.server";

export type CurrentUser = {
	id: string;
	email: string | null;
	role: Role;
};

/**
 * A user's role on this site: `superadmin` everywhere if their account says so (user.role, set
 * only by the server); otherwise their membership's role on the site; otherwise `user` (no
 * dashboard access). Both are read from the database on every request, so changes apply at once.
 */
export async function roleOf(userId: string, accountRole: unknown): Promise<Role> {
	if (accountRole === "superadmin") return "superadmin";
	const [member] = await getDb()
		.select({ role: siteMembers.role })
		.from(siteMembers)
		.where(and(eq(siteMembers.siteId, await currentSiteId()), eq(siteMembers.userId, userId)));
	return member?.role ?? "user";
}

/** The session from this request's cookies (Better Auth checks it against the database). */
export async function getSession() {
	return getAuth().api.getSession({ headers: getRequestHeaders() });
}

/** The signed-in user with their role on this site, or null. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
	const session = await getSession();
	if (!session) return null;
	return {
		id: session.user.id,
		email: session.user.email,
		role: await roleOf(session.user.id, session.user.role),
	};
}
