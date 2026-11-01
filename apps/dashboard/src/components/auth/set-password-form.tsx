import { useForm } from "@tanstack/react-form";
import { useServerFn } from "@tanstack/react-start";
import { FormMessage, formError, TextField } from "#/components/form";
import { Button } from "#/components/ui/button";
import { CardContent, CardFooter } from "#/components/ui/card";
import { SOMETHING_WENT_WRONG, toFormErrors } from "#/lib/form";
import { MAX_PASSWORD_LENGTH, resetPasswordSchema } from "#/lib/password";
import { setPasswordFromEmailLink } from "#/server/password-reset.functions";

/** New password + confirmation, from a reset or invite link's token. Signs in and redirects on success. */
export function SetPasswordForm({ token, submitLabel }: { token: string; submitLabel: string }) {
	const setPasswordFn = useServerFn(setPasswordFromEmailLink);
	const form = useForm({
		defaultValues: { newPassword: "", confirmPassword: "" },
		validators: {
			onSubmit: resetPasswordSchema,
			onSubmitAsync: async ({ value }) => {
				try {
					// On success the server function signs in and redirects (the dashboard decides where to).
					const result = await setPasswordFn({ data: { ...value, token } });
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
				<form.Field name="newPassword">
					{(field) => (
						<TextField
							field={field}
							label="New password"
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
							label="Confirm new password"
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
							{pending ? "Saving…" : submitLabel}
						</Button>
					)}
				</form.Subscribe>
			</CardFooter>
		</form>
	);
}
