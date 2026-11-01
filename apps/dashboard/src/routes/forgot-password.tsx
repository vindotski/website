import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Turnstile } from "#/components/auth/turnstile";
import { AuthCard } from "#/components/auth-card";
import { TextField } from "#/components/form";
import { Button } from "#/components/ui/button";
import { CardContent, CardFooter } from "#/components/ui/card";
import { SOMETHING_WENT_WRONG } from "#/lib/form";
import { authPageOptions, fetchUser } from "#/server/auth.functions";
import { requestPasswordReset } from "#/server/password-reset.functions";

export const Route = createFileRoute("/forgot-password")({
	beforeLoad: async () => {
		// Signed-in users change their password on /account (with their current password).
		if (await fetchUser()) throw redirect({ to: "/account" });
	},
	loader: () => authPageOptions(),
	head: () => ({ meta: [{ title: "Reset password · Spotcraft" }] }),
	component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
	const { turnstileSiteKey } = Route.useLoaderData();
	const requestResetFn = useServerFn(requestPasswordReset);
	const [message, setMessage] = useState<string | null>(null);
	const [turnstile, setTurnstile] = useState<string | null>(null);
	const [attempt, setAttempt] = useState(0);
	const form = useForm({
		defaultValues: { email: "" },
		onSubmit: async ({ value }) => {
			try {
				const result = await requestResetFn({
					data: { ...value, turnstile: turnstile ?? undefined },
				});
				setMessage(
					result.sent ? `${result.message} The link works once, for an hour.` : result.message,
				);
			} catch {
				setMessage(SOMETHING_WENT_WRONG);
			}
			setAttempt((n) => n + 1);
		},
	});

	return (
		<AuthCard
			title="Reset your password"
			description="We'll email you a link to set a new password."
		>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					void form.handleSubmit();
				}}
			>
				<CardContent className="grid gap-4">
					<form.Field name="email">
						{(field) => (
							<TextField
								field={field}
								label="Email"
								type="email"
								autoComplete="email"
								spellCheck={false}
								required
								autoFocus
							/>
						)}
					</form.Field>
					{turnstileSiteKey && (
						<Turnstile siteKey={turnstileSiteKey} attempt={attempt} onToken={setTurnstile} />
					)}
					<p aria-live="polite" className="min-h-5 text-sm">
						{message}
					</p>
				</CardContent>
				<CardFooter className="flex-col gap-3">
					<form.Subscribe selector={(s) => s.isSubmitting}>
						{(pending) => (
							<Button
								type="submit"
								className="w-full"
								disabled={pending || (!!turnstileSiteKey && !turnstile)}
							>
								{pending ? "Sending…" : "Send reset link"}
							</Button>
						)}
					</form.Subscribe>
					<Link
						to="/login"
						className="text-sm text-muted-foreground underline-offset-4 hover:underline"
					>
						Back to sign in
					</Link>
				</CardFooter>
			</form>
		</AuthCard>
	);
}
