import { createFileRoute, notFound, Outlet } from "@tanstack/react-router";

// One site's dashboard: /<slug>/…. The dashboard's guard (_dashboard.tsx) already opened it and
// resolved the user's role there; a slug that names no site is a 404.
export const Route = createFileRoute("/_dashboard/$site")({
	beforeLoad: ({ context }) => {
		if (context.siteMissing) throw notFound();
	},
	component: Outlet,
});
