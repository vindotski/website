import { createFileRoute } from "@tanstack/react-router";
import { SiteSettingsPanel } from "#/components/site-settings/site-form";
import { Skeleton } from "#/components/ui/skeleton";
import { canManageSite } from "#/lib/roles";
import { siteSettingsQuery } from "#/lib/site/queries";

export const Route = createFileRoute("/_dashboard/$site/settings/site")({
	// Every role sees the page; only admins load (and can save) the settings.
	loader: async ({ context: { queryClient, user } }) => {
		if (canManageSite(user.role)) await queryClient.ensureQueryData(siteSettingsQuery);
	},
	head: () => ({ meta: [{ title: "Site settings · Spotcraft" }] }),
	component: SiteSettingsPage,
	pendingComponent: () => (
		<div className="grid gap-4 p-6">
			<Skeleton className="h-8 w-64" />
			<Skeleton className="h-96" />
		</div>
	),
});

function SiteSettingsPage() {
	const { user } = Route.useRouteContext();
	return <SiteSettingsPanel user={user} />;
}
