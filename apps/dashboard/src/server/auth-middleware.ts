import { redirect } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";
import { canManageSite, canUseDashboard, homeFor, isSuperadmin } from "#/lib/roles";
import { getCurrentUser } from "./auth.server";

/**
 * Server function guard. Route guards only protect UI — every server function that returns or
 * mutates private data must check the session itself, since its endpoint is callable directly.
 */
export const requireUser = createMiddleware({ type: "function" }).server(async ({ next }) => {
	const user = await getCurrentUser();
	if (!user) throw redirect({ to: "/login" });
	return next({ context: { user } });
});

/** Dashboard data and content changes: editors and up. Roles are read fresh per request. */
export const requireDashboardAccess = createMiddleware({ type: "function" })
	.middleware([requireUser])
	.server(async ({ next, context }) => {
		if (!canUseDashboard(context.user.role)) throw redirect({ to: homeFor(context.user.role) });
		return next();
	});

/** Site settings, folders' fields and the site's team: site admins and superadmins. */
export const requireSiteAdmin = createMiddleware({ type: "function" }).server(async ({ next }) => {
	const user = await getCurrentUser();
	if (!user) throw redirect({ to: "/login" });
	if (!canManageSite(user.role)) throw redirect({ to: homeFor(user.role) });
	return next({ context: { user } });
});

/** Creating sites and granting superadmin: superadmins only. */
export const requireSuperadmin = createMiddleware({ type: "function" }).server(async ({ next }) => {
	const user = await getCurrentUser();
	if (!user) throw redirect({ to: "/login" });
	if (!isSuperadmin(user.role)) throw redirect({ to: homeFor(user.role) });
	return next({ context: { user } });
});
