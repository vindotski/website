import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { AuthCard } from "#/components/auth-card";
import { FormMessage, TextField } from "#/components/form";
import { Button } from "#/components/ui/button";
import { CardContent, CardFooter } from "#/components/ui/card";
import { SOMETHING_WENT_WRONG } from "#/lib/form";
import { safeRedirect } from "#/lib/safe-redirect";
import { fetchUser, signIn } from "#/server/auth.functions";
import { needsOnboarding } from "#/server/onboarding.functions";

export const Route = createFileRoute("/login")({
	validateSearch: z.object({
		redirect: z.string().optional(),
		// Set by /reset-password when an email link is invalid or expired.
		error: z.literal("link").optional().catch(undefined),
	}),
	beforeLoad: async ({ search }) => {
		if (await needsOnboarding()) throw redirect({ to: "/onboard" });
		if (await fetchUser()) throw redirect({ href: safeRedirect(search.redirect) });
	},
	head: () => ({ meta: [{ title: "Sign in · Spotcraft" }] }),
	component: LoginPage,
});

function LoginPage() {
	const { redirect: redirectTo, error: linkError } = Route.useSearch();
	const signInFn = useServerFn(signIn);
	const form = useForm({
		defaultValues: { email: "", password: "" },
		validators: {
			onSubmitAsync: async ({ value }) => {
				try {
					// On success the server function throws a redirect, which useServerFn follows.
					const result = await signInFn({ data: { ...value, redirect: redirectTo } });
					return result?.error ? { form: result.error } : undefined;
				} catch {
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
					<form.Subscribe selector={(s) => s.errorMap.onSubmit}>
						{(error) => <FormMessage errors={typeof error === "string" ? [error] : []} />}
					</form.Subscribe>
				</CardContent>
				<CardFooter>
					<form.Subscribe selector={(s) => s.isSubmitting}>
						{(pending) => (
							<Button type="submit" className="w-full" disabled={pending}>
								{pending ? "Signing in…" : "Sign in"}
							</Button>
						)}
					</form.Subscribe>
				</CardFooter>
			</form>
		</AuthCard>
	);
}
