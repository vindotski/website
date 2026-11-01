import { useForm } from "@tanstack/react-form";
import { useServerFn } from "@tanstack/react-start";
import { FormMessage, formError, TextField } from "#/components/form";
import { Button } from "#/components/ui/button";
import { CardContent, CardFooter } from "#/components/ui/card";
import { SOMETHING_WENT_WRONG, toFormErrors } from "#/lib/form";
import { onboardingSchema } from "#/lib/onboarding";
import { MAX_PASSWORD_LENGTH } from "#/lib/password";
import { completeOnboarding } from "#/server/onboarding.functions";

/** First run: creates the first superadmin, then signs them in. */
export function OnboardForm() {
	const completeFn = useServerFn(completeOnboarding);
	const form = useForm({
		defaultValues: { email: "", newPassword: "", confirmPassword: "" },
		validators: {
			onSubmit: onboardingSchema,
			onSubmitAsync: async ({ value }) => {
				try {
					// On success the server function signs in and redirects to the dashboard.
					const result = await completeFn({ data: value });
					return result && !result.ok ? toFormErrors(result.fieldErrors) : undefined;
				} catch {
					return { form: SOMETHING_WENT_WRONG };
				}
			},
		},
	});

	return (
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
							label="Your email"
							type="email"
							autoComplete="email"
							spellCheck={false}
						/>
					)}
				</form.Field>
				<form.Field name="newPassword">
					{(field) => (
						<TextField
							field={field}
							label="Password"
							type="password"
							autoComplete="new-password"
							maxLength={MAX_PASSWORD_LENGTH}
						/>
					)}
				</form.Field>
				<form.Field name="confirmPassword">
					{(field) => (
						<TextField
							field={field}
							label="Confirm password"
							type="password"
							autoComplete="new-password"
							maxLength={MAX_PASSWORD_LENGTH}
						/>
					)}
				</form.Field>
				<form.Subscribe selector={(s) => formError(s.errorMap.onSubmit)}>
					{(error) => <FormMessage errors={typeof error === "string" ? [error] : []} />}
				</form.Subscribe>
			</CardContent>
			<CardFooter>
				<form.Subscribe selector={(s) => s.isSubmitting}>
					{(pending) => (
						<Button type="submit" className="w-full" disabled={pending}>
							{pending ? "Creating…" : "Create admin and continue"}
						</Button>
					)}
				</form.Subscribe>
			</CardFooter>
		</form>
	);
}
