// Creates an account with a password, without email: for scripts, local development and
// recovering access. Usage: pnpm account:create <email> --password <password> [--superadmin]
// [--if-missing]. With --if-missing, an existing account is left as it is. It prints "created" or
// "exists". See docs: Team and roles. Plain Node (type stripping).
import { parseArgs } from "node:util";
import { hashPassword } from "better-auth/crypto";
import pg from "pg";

const { values, positionals } = parseArgs({
	allowPositionals: true,
	options: {
		password: { type: "string" },
		superadmin: { type: "boolean" },
		"if-missing": { type: "boolean" },
	},
});
const email = positionals[0]?.trim().toLowerCase();
if (!email || !/^[^\s@]+@[^\s@]+$/.test(email) || !values.password) {
	console.error(
		"Usage: pnpm account:create <email> --password <password> [--superadmin] [--if-missing]",
	);
	process.exit(1);
}
if (values.password.length < 8) {
	console.error("Use a password of at least 8 characters.");
	process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
	const { rows } = await client.query('select id from "user" where email = $1', [email]);
	if (rows.length) {
		if (!values["if-missing"]) {
			console.error(`${email} already has an account.`);
			process.exit(1);
		}
		console.log("exists");
	} else {
		const id = crypto.randomUUID();
		await client.query("begin");
		await client.query(
			'insert into "user" (id, name, email, email_verified, role) values ($1, $2, $2, true, $3)',
			[id, email, values.superadmin ? "superadmin" : null],
		);
		await client.query(
			"insert into account (id, account_id, provider_id, user_id, password) values ($1, $2, 'credential', $2, $3)",
			[crypto.randomUUID(), id, await hashPassword(values.password)],
		);
		await client.query("commit");
		console.log("created");
	}
} catch (error) {
	await client.query("rollback").catch(() => {});
	throw error;
} finally {
	await client.end();
}
