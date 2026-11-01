import { createFileRoute, redirect } from "@tanstack/react-router";
import { OnboardForm } from "#/components/auth/onboard-form";
import { AuthCard } from "#/components/auth-card";
import { needsOnboarding } from "#/server/onboarding.functions";

// First run: open only while there's no admin (then it's the sign-in page's job). The site is
// created next, at /new-site.
export const Route = createFileRoute("/onboard")({
	beforeLoad: async () => {
		if (!(await needsOnboarding())) throw redirect({ to: "/login" });
	},
	head: () => ({ meta: [{ title: "Set up · Spotcraft" }] }),
	component: OnboardPage,
});

function OnboardPage() {
	return (
		<AuthCard title="Create the admin account" description="You'll set up your site next.">
			<OnboardForm />
		</AuthCard>
	);
}
