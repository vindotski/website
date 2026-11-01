import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { SetPasswordForm } from "#/components/auth/set-password-form";
import { AuthCard } from "#/components/auth-card";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "#/lib/password";
import { checkEmailToken } from "#/server/password-reset.functions";

// Where a reset link lands, with `?token=` (or `?error=` from Better Auth when it's no good).
export const Route = createFileRoute("/reset-password")({
	validateSearch: z.object({ token: z.string().max(256).optional().catch(undefined) }),
	beforeLoad: async ({ search }) => {
		const valid = search.token && (await checkEmailToken({ data: { token: search.token } })).valid;
		if (!valid) throw redirect({ to: "/login", search: { error: "link" } });
		return { token: search.token as string };
	},
	head: () => ({ meta: [{ title: "Set a new password · Spotcraft" }] }),
	component: ResetPasswordPage,
});

function ResetPasswordPage() {
	const { token } = Route.useRouteContext();
	return (
		<AuthCard
			title="Set a new password"
			description={`${MIN_PASSWORD_LENGTH}–${MAX_PASSWORD_LENGTH} characters. Other devices will be signed out.`}
		>
			<SetPasswordForm token={token} submitLabel="Save new password" />
		</AuthCard>
	);
}
