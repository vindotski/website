import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { AccountList } from "#/components/account/account-list";
import { MasterDetail } from "#/components/layouts/master-detail";

// The Account section root (from the avatar menu): its list, and the picked page beside it.
export const Route = createFileRoute("/_dashboard/account")({
	head: () => ({ meta: [{ title: "Account · Spotcraft" }] }),
	component: AccountLayout,
});

function AccountLayout() {
	const { user } = Route.useRouteContext();
	const pathname = useLocation({ select: (l) => l.pathname });
	return (
		<MasterDetail
			id="account"
			master={<AccountList user={user} />}
			detail={/^\/account\/?$/.test(pathname) ? undefined : <Outlet />}
			empty={<p>Pick a setting.</p>}
		/>
	);
}
