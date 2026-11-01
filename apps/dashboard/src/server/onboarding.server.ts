import { sql } from "drizzle-orm";
import { getDb } from "#/lib/db/client.server";
import { createAccount } from "./users.server";

// First run: until a superadmin exists, /onboard lets the first visitor create one. The site comes
// next (/new-site, createSite in site.server.ts).

// Any constant: serializes concurrent onboarding submits (pg_advisory_xact_lock).
const ONBOARDING_LOCK = 7_301_001;

async function queryHasSuperadmin(db: Pick<ReturnType<typeof getDb>, "execute">) {
	const result = await db.execute<{ exists: boolean }>(
		sql`select exists (select 1 from "user" where role = 'superadmin') as exists`,
	);
	return result.rows[0]?.exists === true;
}

// Not cached: accounts can be deleted outside the app (Studio, SQL), and then setup should open
// again. It's one query, run by /onboard, /login and the dashboard guard.
export async function hasSuperadmin(): Promise<boolean> {
	return queryHasSuperadmin(getDb());
}

export type FirstAdminResult =
	| { ok: true }
	| { ok: false; taken: true }
	| { ok: false; error: string };

/** Creates the first superadmin (email confirmed) — only while there's none. */
export async function createFirstSuperadmin(input: {
	email: string;
	password: string;
}): Promise<FirstAdminResult> {
	return getDb().transaction(async (tx) => {
		await tx.execute(sql`select pg_advisory_xact_lock(${ONBOARDING_LOCK})`);
		if (await queryHasSuperadmin(tx)) return { ok: false, taken: true } as const;
		const created = await createAccount({ ...input, role: "superadmin" });
		// An existing account isn't promoted: nothing here proves the visitor owns it.
		if (!created)
			return { ok: false, error: "An account with this email already exists." } as const;
		return { ok: true } as const;
	});
}
