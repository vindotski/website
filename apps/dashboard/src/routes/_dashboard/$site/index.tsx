import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { RoleNotice } from "#/components/layouts/role-notice";
import { ScreenHeader } from "#/components/layouts/screen-header";
import { StatusDot } from "#/components/layouts/status-dot";
import { useSite } from "#/hooks/use-site";
import { counts } from "#/lib/files/folders";
import { filesQuery, recentEntriesQuery } from "#/lib/files/queries";
import { canUseDashboard } from "#/lib/roles";

export const Route = createFileRoute("/_dashboard/$site/")({
	loader: async ({ context: { queryClient, user } }) => {
		if (!canUseDashboard(user.role)) return;
		await Promise.all([
			queryClient.ensureQueryData(recentEntriesQuery),
			queryClient.ensureQueryData(filesQuery),
		]);
	},
	head: () => ({ meta: [{ title: "Home · Spotcraft" }] }),
	component: HomePage,
});

function HomePage() {
	const { user } = Route.useRouteContext();
	if (!canUseDashboard(user.role)) {
		return (
			<>
				<ScreenHeader title="Home" />
				<RoleNotice>You don't have access to this site yet. Ask an admin to add you.</RoleNotice>
			</>
		);
	}
	return <Home />;
}

/** Home: what changed lately, one tap back into it. */
function Home() {
	const site = useSite();
	const { data: recent } = useSuspenseQuery(recentEntriesQuery);
	const { data: rows } = useSuspenseQuery(filesQuery);
	const { published, draft } = counts(rows);
	return (
		<>
			<ScreenHeader title="Home" />
			<section aria-labelledby="recent" className="grid">
				<h2
					id="recent"
					className="px-4 pt-4 pb-2 font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
				>
					Recent
				</h2>
				{recent.length ? (
					<ul>
						{recent.map((doc) => (
							<li key={doc.id}>
								<Link
									to="/$site/files/$"
									params={{ site, _splat: doc.path }}
									className="flex min-h-12 items-center gap-3 border-b px-4 py-2 text-sm hover:bg-muted/60"
								>
									<StatusDot status={doc.status} />
									<span className="grid min-w-0 flex-1">
										<span className="truncate">{doc.title}</span>
										<span className="truncate font-mono text-xs text-muted-foreground">
											{doc.path}
										</span>
									</span>
									<ChevronRight className="size-4 text-muted-foreground" />
								</Link>
							</li>
						))}
					</ul>
				) : (
					<p className="px-4 text-sm text-muted-foreground">
						Nothing yet.{" "}
						<Link to="/$site/files" params={{ site }} className="text-primary underline">
							Add your first file
						</Link>
						.
					</p>
				)}
				<p className="px-4 py-4 font-mono text-xs text-muted-foreground">
					{published} published · {draft} {draft === 1 ? "draft" : "drafts"}
				</p>
			</section>
		</>
	);
}
