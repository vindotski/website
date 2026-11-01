import { readFileSync } from "node:fs";
import { hashPassword } from "better-auth/crypto";
import pg from "pg";
import { SERVER_LOG } from "./env";
import { callServerFn, Jar } from "./http";
import { fn } from "./server-fns";

/** Run SQL on the e2e database (support/load-env.ts points DATABASE_URL at it). */
export async function sql<T extends Record<string, unknown>>(text: string, values: unknown[] = []) {
	const url = process.env.DATABASE_URL ?? "";
	if (!["localhost", "127.0.0.1"].includes(new URL(url).hostname)) {
		throw new Error(`e2e only runs against a local database, not ${url}`);
	}
	const client = new pg.Client({ connectionString: url });
	await client.connect();
	try {
		return (await client.query<T>(text, values)).rows;
	} finally {
		await client.end();
	}
}

/**
 * Empty the e2e database, like a fresh `db:reset` without migrating again: no site (its entries
 * and members go with it) and no accounts. Your dev database isn't touched.
 */
export async function resetDatabase() {
	await sql('truncate table "user", session, account, verification, sites cascade');
}

/** An account with a password, made directly (Better Auth's own hashing), as an admin would. */
export async function createAccount(email: string, password: string) {
	const id = crypto.randomUUID();
	await sql('insert into "user" (id, name, email, email_verified) values ($1, $2, $2, true)', [
		id,
		email,
	]);
	await sql(
		"insert into account (id, account_id, provider_id, user_id, password) values ($1, $2, 'credential', $2, $3)",
		[crypto.randomUUID(), id, await hashPassword(password)],
	);
	return id;
}

export async function userIdByEmail(email: string) {
	const [row] = await sql<{ id: string }>('select id from "user" where email = $1', [email]);
	return row?.id;
}

export const signInFn = fn("src/server/auth.functions.ts", "signIn");

/** Sign in through the app's own server function; returns the browser jar. */
export async function signIn(email: string, password: string) {
	const jar = new Jar();
	await callServerFn(jar, signInFn, { email, password });
	return jar;
}

/** Offset into the server log; pair with `serverErrorsSince` to scope the check to one suite. */
export function serverLogOffset() {
	return readFileSync(SERVER_LOG, "utf8").length;
}

/**
 * `[server-fn] failed`, `[search] failed` (a background index sync) and `[webhook] failed` lines logged since
 * `offset` — expected outcomes must never appear here.
 */
export function serverErrorsSince(offset: number) {
	return readFileSync(SERVER_LOG, "utf8")
		.slice(offset)
		.split("\n")
		.filter((line) => /\[(server-fn|search|webhook|images)\] failed/.test(line));
}
