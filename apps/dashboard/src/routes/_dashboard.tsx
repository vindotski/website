import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "#/components/shell/app-shell";
import { canUseDashboard } from "#/lib/roles";
import { setActiveSite } from "#/lib/site/active";
import { siteSlugInPath } from "#/lib/site/paths";
import { mySitesQuery, siteIdentityQuery } from "#/lib/site/queries";
import { dashboardGate } from "#/server/onboarding.functions";

// The dashboard (/<site>/… and /account): the authenticated app shell. This guard protects the
// UI only — server functions check the session themselves (see src/server/auth-middleware.ts).
export const Route = createFileRoute("/_dashboard")({
	beforeLoad: async ({ location, context, preload }) => {
		// Open the site the URL names first, so this guard's own call (and every loader after it)
		// is about that site: the user's role is per site. Not for a hover's preload.
		if (!preload) setActiveSite(siteSlugInPath(location.pathname), context.queryClient);
		// Setup comes before the session: a deleted account's token stays valid until it expires.
		const { needsOnboarding, site, siteMissing, user, origin } = await dashboardGate();
		if (needsOnboarding) throw redirect({ to: "/onboard" });
		if (!user) throw redirect({ to: "/login", search: { redirect: location.href } });
		// The shell needs a site; until one exists, the dashboard is the new-site screen.
		if (!site) throw redirect({ to: "/new-site" });
		return { user, site, siteMissing, origin };
	},
	// The top bar shows the site's name and the switcher its sites; load them here so they are in
	// the server-rendered page (and back right after a switch, which empties the cache).
	loader: async ({ context: { queryClient, user } }) => {
		await Promise.all([
			queryClient.ensureQueryData(mySitesQuery),
			canUseDashboard(user.role) && queryClient.ensureQueryData(siteIdentityQuery),
		]);
	},
	component: AppLayout,
});

function AppLayout() {
	const { user } = Route.useRouteContext();

	return (
		<AppShell user={user}>
			<Outlet />
		</AppShell>
	);
}
