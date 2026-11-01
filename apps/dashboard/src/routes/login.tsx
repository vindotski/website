import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";
import { Turnstile } from "#/components/auth/turnstile";
import { AuthCard } from "#/components/auth-card";
import { FormMessage, formError, TextField } from "#/components/form";
import { Button } from "#/components/ui/button";
import { CardContent, CardFooter } from "#/components/ui/card";
import { SOMETHING_WENT_WRONG } from "#/lib/form";
import { authPageOptions, signedInRedirect, signIn } from "#/server/auth.functions";
import { needsOnboarding } from "#/server/onboarding.functions";

export const Route = createFileRoute("/login")({
	validateSearch: z.object({
		// A path here, or a URL on one of your sites' frontends (others are ignored).
		redirect: z.string().optional(),
		// Set by /reset-password when an email link is invalid or expired.
		error: z.literal("link").optional().catch(undefined),
	}),
	beforeLoad: async ({ search }) => {
		if (await needsOnboarding()) throw redirect({ to: "/onboard" });
		const signedIn = await signedInRedirect({ data: { redirect: search.redirect } });
		if (signedIn) throw redirect({ href: signedIn });
	},
	loader: () => authPageOptions(),
	head: () => ({ meta: [{ title: "Sign in · Spotcraft" }] }),
	component: LoginPage,
});

function LoginPage() {
	const { redirect: redirectTo, error: linkError } = Route.useSearch();
	const { turnstileSiteKey } = Route.useLoaderData();
	const signInFn = useServerFn(signIn);
	const [turnstile, setTurnstile] = useState<string | null>(null);
	const [attempt, setAttempt] = useState(0);
	const form = useForm({
		defaultValues: { email: "", password: "" },
		validators: {
			onSubmitAsync: async ({ value }) => {
				try {
					// Back to this app: the server function throws a redirect, which useServerFn
					// follows. To a frontend: a full page load.
					const result = await signInFn({
						data: { ...value, redirect: redirectTo, turnstile: turnstile ?? undefined },
					});
					if (result?.redirectTo) {
						window.location.assign(result.redirectTo);
						return undefined;
					}
					setAttempt((n) => n + 1);
					return result?.error ? { form: result.error } : undefined;
				} catch {
					setAttempt((n) => n + 1);
					return { form: SOMETHING_WENT_WRONG };
				}
			},
		},
	});

	return (
		<AuthCard title="Sign in to Spotcraft" description="Use your work email and password.">
			<form
				onSubmit={(e) => {
					e.preventDefault();
					void form.handleSubmit();
				}}
			>
				<CardContent className="grid gap-4">
					{linkError === "link" && (
						<p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
							That link is invalid or has expired. Links work once, for an hour.{" "}
							<Link to="/forgot-password" className="font-medium underline underline-offset-4">
								Request a new one
							</Link>
							.
						</p>
					)}
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
					<form.Field name="password">
						{(field) => (
							<TextField
								field={field}
								label="Password"
								type="password"
								autoComplete="current-password"
								required
								labelAside={
									<Link
										to="/forgot-password"
										className="text-sm text-muted-foreground underline-offset-4 hover:underline"
									>
										Forgot password?
									</Link>
								}
							/>
						)}
					</form.Field>
					{turnstileSiteKey && (
						<Turnstile siteKey={turnstileSiteKey} attempt={attempt} onToken={setTurnstile} />
					)}
					<form.Subscribe selector={(s) => formError(s.errorMap.onSubmit)}>
						{(error) => <FormMessage errors={typeof error === "string" ? [error] : []} />}
					</form.Subscribe>
				</CardContent>
				<CardFooter>
					<form.Subscribe selector={(s) => s.isSubmitting}>
						{(pending) => (
							<Button
								type="submit"
								className="w-full"
								disabled={pending || (!!turnstileSiteKey && !turnstile)}
							>
								{pending ? "Signing in…" : "Sign in"}
							</Button>
						)}
					</form.Subscribe>
				</CardFooter>
			</form>
		</AuthCard>
	);
}
