import { useForm } from "@tanstack/react-form";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { FormMessage, TextField } from "#/components/form";
import { ScreenHeader } from "#/components/layouts/screen-header";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { SOMETHING_WENT_WRONG, toFormErrors } from "#/lib/form";
import { changePasswordSchema, MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "#/lib/password";
import { changePassword } from "#/server/account.functions";

/** Account → Password. */
export function PasswordPage() {
	return (
		<>
			<ScreenHeader title="Password" back={{ to: "/account", label: "Back to Account" }} />
			<div className="grid max-w-2xl gap-4 p-4 md:p-6">
				<ChangePasswordCard />
			</div>
		</>
	);
}

function ChangePasswordCard() {
	const changePasswordFn = useServerFn(changePassword);
	const [saved, setSaved] = useState(false);
	const form = useForm({
		defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
		validators: {
			// Same rules as the server, for instant feedback; the server re-checks everything.
			onSubmit: changePasswordSchema,
			onSubmitAsync: async ({ value }) => {
				setSaved(false);
				try {
					const result = await changePasswordFn({ data: value });
					return result.ok ? undefined : toFormErrors(result.fieldErrors);
				} catch {
					return { form: SOMETHING_WENT_WRONG };
				}
			},
		},
		onSubmit: () => {
			form.reset();
			setSaved(true);
		},
	});

	const passwordField = (
		name: "currentPassword" | "newPassword" | "confirmPassword",
		label: string,
		autoComplete: string,
	) => (
		<form.Field name={name}>
			{(field) => (
				<TextField
					field={field}
					label={label}
					type="password"
					autoComplete={autoComplete}
					maxLength={MAX_PASSWORD_LENGTH}
				/>
			)}
		</form.Field>
	);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Change password</CardTitle>
				<CardDescription>
					{MIN_PASSWORD_LENGTH}–{MAX_PASSWORD_LENGTH} characters. Changing it signs you out on other
					devices.
				</CardDescription>
			</CardHeader>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					void form.handleSubmit();
				}}
			>
				<CardContent className="grid gap-4">
					{passwordField("currentPassword", "Current password", "current-password")}
					{passwordField("newPassword", "New password", "new-password")}
					{passwordField("confirmPassword", "Confirm new password", "new-password")}
					<form.Subscribe selector={(s) => s.errorMap.onSubmit}>
						{(error) =>
							typeof error === "string" ? (
								<FormMessage errors={[error]} />
							) : (
								<p aria-live="polite" className="min-h-5 text-sm">
									{saved && "Password updated."}
								</p>
							)
						}
					</form.Subscribe>
				</CardContent>
				<CardFooter>
					<form.Subscribe selector={(s) => s.isSubmitting}>
						{(pending) => (
							<Button type="submit" disabled={pending}>
								{pending ? "Updating…" : "Update password"}
							</Button>
						)}
					</form.Subscribe>
				</CardFooter>
			</form>
		</Card>
	);
}
