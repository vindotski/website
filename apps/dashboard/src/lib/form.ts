// Glue between our validation results and TanStack Form.

/** Messages from a field's errors: strings (from the server) or Standard Schema issues (Zod). */
export function messagesOf(errors: readonly unknown[]): string[] {
	return errors.flatMap((error) => {
		if (typeof error === "string") return [error];
		if (error && typeof error === "object" && "message" in error) return [String(error.message)];
		return [];
	});
}

/**
 * Server field errors (`{ email: ["…"] }`) as what an `onSubmitAsync` validator returns, so they
 * show under their fields like the browser's own checks.
 */
export function toFormErrors(fieldErrors: Partial<Record<string, string[] | undefined>>) {
	const fields: Record<string, string> = {};
	for (const [key, messages] of Object.entries(fieldErrors)) {
		if (messages?.length) fields[key] = messages[0];
	}
	return { fields };
}

export const SOMETHING_WENT_WRONG = "Something went wrong. Try again.";
