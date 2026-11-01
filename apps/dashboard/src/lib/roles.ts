/**
 * A user's role on a site, highest first: `superadmin` (user.role, every site), then their
 * membership's role on the site (`admin` or `editor`), else `user` (no dashboard access). See roleOf in src/server/auth.server.ts.
 */
export const ROLES = ["superadmin", "admin", "editor", "user"] as const;
export type Role = (typeof ROLES)[number];

/** The roles a site membership can have (site_members.role). */
export const SITE_ROLES = ["admin", "editor"] as const;
export type SiteRole = (typeof SITE_ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
	superadmin: "Superadmin",
	admin: "Admin",
	editor: "Editor",
	user: "No access",
};

/** Missing or unknown roles get the least privilege. */
export function parseRole(value: unknown): Role {
	return ROLES.includes(value as Role) ? (value as Role) : "user";
}

export function isSuperadmin(role: Role): boolean {
	return role === "superadmin";
}

const atLeast = (role: Role, floor: Role) => ROLES.indexOf(role) <= ROLES.indexOf(floor);

/** The dashboard: create, edit, rename, delete and publish documents. Editors and up. */
export function canUseDashboard(role: Role): boolean {
	return atLeast(role, "editor");
}

/** The site's team: site admins and superadmins. */
export function canManageUsers(role: Role): boolean {
	return atLeast(role, "admin");
}

/** Folders and their fields (_config.json). */
export function canManageContentTypes(role: Role): boolean {
	return atLeast(role, "admin");
}

/** Site settings (SEO, favicon). */
export function canManageSite(role: Role): boolean {
	return atLeast(role, "admin");
}

/** The roles this person may give others: a site admin can't hand out superadmin. */
export function assignableRoles(actor: Role): readonly Role[] {
	if (isSuperadmin(actor)) return ROLES;
	return canManageUsers(actor) ? ROLES.filter((r) => r !== "superadmin") : [];
}

/**
 * Whether `actor` may move someone from `from` to `to` (null: remove them from the site). Only a
 * superadmin can change a superadmin or make someone one.
 */
export function canChangeRole(actor: Role, from: Role, to: Role | null): boolean {
	if (!canManageUsers(actor)) return false;
	if (isSuperadmin(actor)) return true;
	return from !== "superadmin" && to !== "superadmin";
}

/** Where a signed-in user lands by default. */
export function homeFor(role: Role): "/" | "/account" {
	return canUseDashboard(role) ? "/" : "/account";
}
