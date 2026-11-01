import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { SetPasswordForm } from "#/components/auth/set-password-form";
import { AuthCard } from "#/components/auth-card";
import { CardContent } from "#/components/ui/card";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "#/lib/password";
import { checkEmailToken } from "#/server/password-reset.functions";

// Where an invite link lands, with `?token=` (or `?error=` from Better Auth when it's no good).
export const Route = createFileRoute("/accept-invite")({
	validateSearch: z.object({ token: z.string().max(256).optional().catch(undefined) }),
	beforeLoad: async ({ search }) => {
		const valid = search.token && (await checkEmailToken({ data: { token: search.token } })).valid;
		return { token: valid ? (search.token as string) : null };
	},
	head: () => ({ meta: [{ title: "Join Spotcraft" }] }),
	component: AcceptInvitePage,
});

function AcceptInvitePage() {
	const { token } = Route.useRouteContext();

	if (!token) {
		return (
			<AuthCard
				title="This invite link doesn't work"
				description="It may have expired or been used."
			>
				<CardContent className="grid gap-3 text-sm">
					<p>Ask an admin to resend your invite, then use the newest email.</p>
					<p>
						Already set a password?{" "}
						<Link to="/login" className="font-medium underline underline-offset-4">
							Sign in
						</Link>
					</p>
				</CardContent>
			</AuthCard>
		);
	}

	return (
		<AuthCard
			title="Welcome to Spotcraft"
			description={`Set a password to finish joining (${MIN_PASSWORD_LENGTH}–${MAX_PASSWORD_LENGTH} characters).`}
		>
			<SetPasswordForm token={token} submitLabel="Set password and continue" />
		</AuthCard>
	);
}
