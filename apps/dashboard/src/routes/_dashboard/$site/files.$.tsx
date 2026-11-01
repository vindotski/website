import { createFileRoute } from "@tanstack/react-router";
import { FileDetail, loadFiles } from "#/components/content/files-page";
import { Skeleton } from "#/components/ui/skeleton";

// /files/<path>: the file the section layout shows beside its folder (nothing for a folder).
export const Route = createFileRoute("/_dashboard/$site/files/$")({
	loaderDeps: ({ search }) => search,
	loader: ({ context: { queryClient, user }, params, deps }) =>
		loadFiles(queryClient, user, params._splat ?? "", deps),
	head: ({ params }) => ({ meta: [{ title: `${params._splat} · Spotcraft` }] }),
	component: FileAtPath,
	pendingComponent: () => (
		<div className="grid gap-3 p-4">
			<Skeleton className="h-10 rounded-md" />
			<Skeleton className="h-64 rounded-md" />
		</div>
	),
});

function FileAtPath() {
	const { user } = Route.useRouteContext();
	const { _splat } = Route.useParams();
	return (
		<FileDetail user={user} path={(_splat ?? "").replace(/\/$/, "")} search={Route.useSearch()} />
	);
}
