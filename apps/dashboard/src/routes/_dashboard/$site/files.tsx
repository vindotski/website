import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { FilesSection, filesSearch } from "#/components/content/files-page";
import { pathOfFiles } from "#/lib/files/activity";
import { filesQuery } from "#/lib/files/queries";
import { canUseDashboard } from "#/lib/roles";
import { withoutSite } from "#/lib/site/paths";

// The Files section root: the folder list stays mounted while child routes swap the open file.
export const Route = createFileRoute("/_dashboard/$site/files")({
	validateSearch: filesSearch,
	loader: async ({ context: { queryClient, user } }) => {
		if (canUseDashboard(user.role)) await queryClient.ensureQueryData(filesQuery);
	},
	head: () => ({ meta: [{ title: "Files · Spotcraft" }] }),
	component: FilesLayout,
});

function FilesLayout() {
	const { user } = Route.useRouteContext();
	const pathname = useLocation({ select: (l) => withoutSite(l.pathname) });
	return (
		<FilesSection
			user={user}
			path={pathOfFiles(pathname)}
			search={Route.useSearch()}
			detail={<Outlet />}
		/>
	);
}
