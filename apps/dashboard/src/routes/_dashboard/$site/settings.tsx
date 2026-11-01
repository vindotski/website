import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { MasterDetail } from "#/components/layouts/master-detail";
import { SettingsList } from "#/components/settings-list";
import { UsersMaster, usersQuery } from "#/components/users/users";
import { canManageUsers } from "#/lib/roles";
import { withoutSite } from "#/lib/site/paths";

// The Settings section root. Its list is Settings (Site, Users), or the people once
// you're in Users; child routes render the picked item beside (or after) it.
const inUsers = (pathname: string) => /^\/settings\/users(\/|$)/.test(pathname);
const isList = (pathname: string) => /^\/settings(\/users)?\/?$/.test(pathname);

export const Route = createFileRoute("/_dashboard/$site/settings")({
	loader: async ({ context: { queryClient, user }, location }) => {
		if (inUsers(withoutSite(location.pathname)) && canManageUsers(user.role)) {
			await queryClient.ensureQueryData(usersQuery);
		}
	},
	head: () => ({ meta: [{ title: "Settings · Spotcraft" }] }),
	component: SettingsLayout,
});

function SettingsLayout() {
	const { user } = Route.useRouteContext();
	const pathname = useLocation({ select: (l) => withoutSite(l.pathname) });
	const users = inUsers(pathname);
	return (
		<MasterDetail
			id={users ? "users" : "settings"}
			master={users ? <UsersMaster user={user} /> : <SettingsList />}
			detail={isList(pathname) ? undefined : <Outlet />}
			empty={<p>{users ? "Select someone, or invite someone new." : "Pick a setting."}</p>}
		/>
	);
}
