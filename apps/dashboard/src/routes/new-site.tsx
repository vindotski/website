import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AuthCard } from "#/components/auth-card";
import { NewSiteForm } from "#/components/site-settings/new-site-form";
import { Button } from "#/components/ui/button";
import { CardContent, CardFooter } from "#/components/ui/card";
import { isSuperadmin } from "#/lib/roles";
import { signOut } from "#/server/auth.functions";
import { dashboardGate } from "#/server/onboarding.functions";

// Creating a site: superadmins, any time (the switcher's "New site"); the dashboard sends here
// while there's no site at all. Outside the dashboard layout, whose shell needs a site.
export const Route = createFileRoute("/new-site")({
	beforeLoad: async ({ location }) => {
		const { needsOnboarding, hasSite, user } = await dashboardGate();
		if (needsOnboarding) throw redirect({ to: "/onboard" });
		if (!user) throw redirect({ to: "/login", search: { redirect: location.href } });
		if (hasSite && !isSuperadmin(user.role)) throw redirect({ to: "/" });
		return { user, firstSite: !hasSite };
	},
	head: ({ match }) => ({
		meta: [
			{ title: `${match.context.firstSite ? "Create your site" : "Create a site"} · Spotcraft` },
		],
	}),
	component: NewSitePage,
});

function NewSitePage() {
	const { user, firstSite } = Route.useRouteContext();
	const signOutFn = useServerFn(signOut);

	if (!isSuperadmin(user.role)) {
		return (
			<AuthCard title="Not set up yet" description="This site hasn't been created yet.">
				<CardContent>
					<p className="text-sm text-muted-foreground">Ask a superadmin to create it.</p>
				</CardContent>
				<CardFooter>
					<Button variant="outline" className="w-full" onClick={() => signOutFn()}>
						Sign out
					</Button>
				</CardFooter>
			</AuthCard>
		);
	}
	return (
		<AuthCard
			title={firstSite ? "Create your site" : "Create a site"}
			description={
				firstSite
					? "You can change everything else in Site settings later."
					: "It gets its own address: /<slug> for its dashboard, API and images."
			}
		>
			<NewSiteForm cancel={!firstSite} />
		</AuthCard>
	);
}
