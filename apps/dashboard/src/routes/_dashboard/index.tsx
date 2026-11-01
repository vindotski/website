import { createFileRoute, redirect } from "@tanstack/react-router";

// / opens your last site, or the default one.
export const Route = createFileRoute("/_dashboard/")({
	beforeLoad: ({ context }) => {
		throw redirect({ to: "/$site", params: { site: context.site.slug } });
	},
});
