import { createFileRoute } from "@tanstack/react-router";
import { RoleNotice } from "#/components/layouts/role-notice";
import { UserDetail } from "#/components/users/users";
import { canManageUsers } from "#/lib/roles";

export const Route = createFileRoute("/_dashboard/$site/settings/users/$userId")({
	head: () => ({ meta: [{ title: "User · Spotcraft" }] }),
	component: UserPage,
});

function UserPage() {
	const { user } = Route.useRouteContext();
	const { userId } = Route.useParams();
	return canManageUsers(user.role) ? (
		<UserDetail key={userId} userId={userId} />
	) : (
		<RoleNotice>Only admins can see and manage the team.</RoleNotice>
	);
}
