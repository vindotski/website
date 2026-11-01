import { readFileSync } from "node:fs";
import type { Role } from "../../src/lib/roles";
import { signIn } from "./db";
import { E2E_PASSWORD, WORLD_FILE } from "./env";

// The accounts global-setup created through the real app: one per role, all with E2E_PASSWORD.

export type World = { accounts: Record<Role, { id: string; email: string }> };

let world: World | undefined;

export function account(role: Role) {
	world ??= JSON.parse(readFileSync(WORLD_FILE, "utf8")) as World;
	return { ...world.accounts[role], password: E2E_PASSWORD };
}

/** A fresh browser signed in as that role's account. */
export function signInAs(role: Role) {
	const { email, password } = account(role);
	return signIn(email, password);
}
