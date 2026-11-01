import { createFileRoute } from "@tanstack/react-router";
import { RoleNotice } from "#/components/layouts/role-notice";
import { InviteForm } from "#/components/users/users";
import { canManageUsers } from "#/lib/roles";

export const Route = createFileRoute("/_dashboard/$site/settings/users/new")({
	head: () => ({ meta: [{ title: "Invite · Spotcraft" }] }),
	component: InvitePage,
});

function InvitePage() {
	const { user } = Route.useRouteContext();
	return canManageUsers(user.role) ? (
		<InviteForm actorRole={user.role} />
	) : (
		<RoleNotice>Only admins can invite people.</RoleNotice>
	);
}
