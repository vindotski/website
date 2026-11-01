import { describe, expect, it } from "vitest";
import {
	MAX_PASSWORD_LENGTH,
	MIN_PASSWORD_LENGTH,
	validateChangePassword,
	validateResetPassword,
} from "./password";

const valid = {
	currentPassword: "old-password",
	newPassword: "new-password-123",
	confirmPassword: "new-password-123",
};

describe("validateChangePassword", () => {
	it("accepts a valid change", () => {
		expect(validateChangePassword(valid)).toBeNull();
	});

	it("requires the current password", () => {
		expect(
			validateChangePassword({ ...valid, currentPassword: "" })?.currentPassword,
		).toBeDefined();
	});

	it("enforces length bounds on the new password", () => {
		const short = "a".repeat(MIN_PASSWORD_LENGTH - 1);
		const long = "a".repeat(MAX_PASSWORD_LENGTH + 1);
		expect(
			validateChangePassword({ ...valid, newPassword: short, confirmPassword: short })?.newPassword,
		).toBeDefined();
		expect(
			validateChangePassword({ ...valid, newPassword: long, confirmPassword: long })?.newPassword,
		).toBeDefined();
	});

	it("requires a matching confirmation", () => {
		expect(
			validateChangePassword({ ...valid, confirmPassword: "something-else" })?.confirmPassword,
		).toEqual(["Passwords don't match"]);
	});

	it("rejects reusing the current password", () => {
		expect(
			validateChangePassword({
				currentPassword: "same-password",
				newPassword: "same-password",
				confirmPassword: "same-password",
			})?.newPassword,
		).toBeDefined();
	});
});

describe("validateResetPassword", () => {
	it("accepts a valid new password", () => {
		expect(
			validateResetPassword({ newPassword: "new-password-1", confirmPassword: "new-password-1" }),
		).toBeNull();
	});

	it("enforces length and matching", () => {
		expect(
			validateResetPassword({ newPassword: "short", confirmPassword: "short" })?.newPassword,
		).toBeDefined();
		expect(
			validateResetPassword({ newPassword: "new-password-1", confirmPassword: "other-pass-1" })
				?.confirmPassword,
		).toEqual(["Passwords don't match"]);
	});
});
