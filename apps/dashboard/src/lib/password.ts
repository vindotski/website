import { z } from "zod";

/** Also Better Auth's minimum (src/server/better-auth.server.ts). */
export const MIN_PASSWORD_LENGTH = 8;
/** Better Auth's maximum too (src/server/better-auth.server.ts). */
export const MAX_PASSWORD_LENGTH = 72;

const newPasswordRule = z
	.string()
	.min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters`)
	.max(MAX_PASSWORD_LENGTH, `Use at most ${MAX_PASSWORD_LENGTH} characters`);

const passwordsMatch = {
	check: (v: { newPassword: string; confirmPassword: string }) =>
		v.confirmPassword === v.newPassword,
	options: { path: ["confirmPassword"], message: "Passwords don't match" },
};

export const changePasswordSchema = z
	.object({
		currentPassword: z.string().min(1, "Enter your current password"),
		newPassword: newPasswordRule,
		confirmPassword: z.string(),
	})
	.refine(passwordsMatch.check, passwordsMatch.options)
	.refine((v) => v.newPassword !== v.currentPassword, {
		path: ["newPassword"],
		message: "Choose a password different from your current one",
	});

export type ChangePasswordInput = z.input<typeof changePasswordSchema>;
export type ChangePasswordFieldErrors = Partial<Record<keyof ChangePasswordInput, string[]>>;

/** Field errors for display, or null when valid. Same rules on client and server. */
export function validateChangePassword(
	input: ChangePasswordInput,
): ChangePasswordFieldErrors | null {
	const result = changePasswordSchema.safeParse(input);
	return result.success ? null : z.flattenError(result.error).fieldErrors;
}

/** Setting a new password from a recovery link (no current password — the email link proves it). */
export const resetPasswordSchema = z
	.object({ newPassword: newPasswordRule, confirmPassword: z.string() })
	.refine(passwordsMatch.check, passwordsMatch.options);

export type ResetPasswordInput = z.input<typeof resetPasswordSchema>;
export type ResetPasswordFieldErrors = Partial<Record<keyof ResetPasswordInput, string[]>>;

export function validateResetPassword(input: ResetPasswordInput): ResetPasswordFieldErrors | null {
	const result = resetPasswordSchema.safeParse(input);
	return result.success ? null : z.flattenError(result.error).fieldErrors;
}
