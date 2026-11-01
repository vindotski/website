import { describe, expect, it } from "vitest";
import { validateOnboarding } from "./onboarding";

const valid = {
	email: "  me@example.com ",
	newPassword: "password123",
	confirmPassword: "password123",
};

describe("validateOnboarding", () => {
	it("accepts a valid account and trims the email", () => {
		const result = validateOnboarding(valid);
		expect(result.ok && result.value.email).toBe("me@example.com");
	});

	it("reports each problem by field", () => {
		const result = validateOnboarding({
			email: "not-an-email",
			newPassword: "short",
			confirmPassword: "other",
		});
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(Object.keys(result.fieldErrors).sort()).toEqual([
			"confirmPassword",
			"email",
			"newPassword",
		]);
	});

	it("requires a matching confirmation", () => {
		const result = validateOnboarding({ ...valid, confirmPassword: "password124" });
		expect(result.ok ? null : result.fieldErrors).toEqual({
			confirmPassword: ["Passwords don't match"],
		});
	});
});
