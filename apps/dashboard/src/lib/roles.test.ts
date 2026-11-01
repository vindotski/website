import { describe, expect, it } from "vitest";
import {
	assignableRoles,
	canChangeRole,
	canManageContentTypes,
	canManageSite,
	canManageUsers,
	canUseDashboard,
	homeFor,
	isSuperadmin,
	parseRole,
	ROLES,
	type Role,
} from "./roles";

/** Which roles pass a check, highest first. */
const passing = (check: (role: Role) => boolean) => ROLES.filter(check);

describe("roles", () => {
	it("are ordered from most to least access", () => {
		expect(ROLES).toEqual(["superadmin", "admin", "editor", "user"]);
	});

	it("parses known roles and falls back to least privilege", () => {
		for (const role of ROLES) expect(parseRole(role)).toBe(role);
		expect(parseRole(undefined)).toBe("user");
		expect(parseRole("owner")).toBe("user");
		expect(parseRole({ role: "superadmin" })).toBe("user");
	});

	it("grants each ability from its floor up", () => {
		expect(passing(canUseDashboard)).toEqual(["superadmin", "admin", "editor"]);
		expect(passing(canManageSite)).toEqual(["superadmin", "admin"]);
		expect(passing(canManageUsers)).toEqual(["superadmin", "admin"]);
		expect(passing(canManageContentTypes)).toEqual(["superadmin", "admin"]);
		expect(passing(isSuperadmin)).toEqual(["superadmin"]);
	});

	it("lets only a superadmin hand out superadmin", () => {
		expect(assignableRoles("superadmin")).toEqual(ROLES);
		expect(assignableRoles("admin")).toEqual(["admin", "editor", "user"]);
		for (const role of ["editor", "user"] as const) {
			expect(assignableRoles(role)).toEqual([]);
		}
	});

	it("keeps superadmins out of a site admin's reach", () => {
		// actor, from, to (null: remove from the site)
		const cases: [Role, Role, Role | null, boolean][] = [
			["superadmin", "superadmin", "admin", true],
			["superadmin", "editor", "superadmin", true],
			["admin", "editor", "user", true],
			["admin", "editor", null, true],
			["admin", "editor", "admin", true],
			["admin", "superadmin", "admin", false],
			["admin", "superadmin", null, false],
			["admin", "editor", "superadmin", false],
			["editor", "user", "editor", false],
			["user", "user", "editor", false],
		];
		for (const [actor, from, to, allowed] of cases) {
			expect(canChangeRole(actor, from, to), `${actor}: ${from} → ${to}`).toBe(allowed);
		}
	});

	it("sends roles without dashboard access to their account page", () => {
		expect(homeFor("editor")).toBe("/");
		expect(homeFor("user")).toBe("/account");
	});
});
