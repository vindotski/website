import { z } from "zod";
import { resetPasswordSchema } from "#/lib/password";

/** The /onboard form: the first admin's email and password. */
export const onboardingSchema = z
	.object({
		email: z.string().trim().max(320).pipe(z.email("Enter an email address")),
	})
	.and(resetPasswordSchema);

export type OnboardingInput = z.input<typeof onboardingSchema>;
export type OnboardingFieldErrors = Partial<Record<keyof OnboardingInput, string[]>>;

/** Same rules on client and server. */
export function validateOnboarding(input: OnboardingInput) {
	const result = onboardingSchema.safeParse(input);
	return result.success
		? { ok: true as const, value: result.data }
		: {
				ok: false as const,
				fieldErrors: z.flattenError(result.error).fieldErrors as OnboardingFieldErrors,
			};
}
