import { createFileRoute, redirect } from "@tanstack/react-router";
import { dashboardGate } from "#/server/onboarding.functions";

// /settings/… from before sites had their own paths: the same page on your last (or the default) site.
export const Route = createFileRoute("/settings/$")({
	beforeLoad: async ({ location }) => {
		const { site } = await dashboardGate();
		throw redirect({ href: site ? `/${site.slug}${location.href}` : "/" });
	},
});
