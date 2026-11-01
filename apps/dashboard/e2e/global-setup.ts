import { type ChildProcess, execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, openSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import pg from "pg";
import type { Role } from "../src/lib/roles";
import { createAccount, resetDatabase, userIdByEmail } from "./support/db";
import { STUB_URL, startEmbeddingsStub } from "./support/embeddings-stub";
import {
	BASE_URL,
	E2E_DOMAIN,
	E2E_PASSWORD,
	E2E_PORT,
	E2E_S3,
	SERVER_LOG,
	testDatabaseUrl,
	WORLD_FILE,
} from "./support/env";
import { F } from "./support/functions";
import { callServerFn, Jar } from "./support/http";
import { clearInbox } from "./support/mailpit";
import { API_TOKEN, startWebhookStub, WEBHOOK_SECRET, WEBHOOK_URL } from "./support/webhook-stub";
import type { World } from "./support/world";

// Empties the e2e database (its own, beside your dev one), runs the production build (.output)
// as a real server, and sets up the world through the app itself: onboarding (superadmin), the
// site, one account per role.
// Search embeds through a local stub (support/embeddings-stub.ts), never OpenAI, and webhooks go
// to another (support/webhook-stub.ts). The server has an API token (API_TOKEN).

let server: ChildProcess | undefined;

async function waitForServer(timeoutMs = 30_000) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		try {
			const res = await fetch(`${BASE_URL}/login`, { redirect: "manual" });
			if (res.status < 500) return;
		} catch {
			// not listening yet
		}
		await new Promise((r) => setTimeout(r, 250));
	}
	throw new Error(`e2e server didn't come up on ${BASE_URL} (see ${SERVER_LOG})`);
}

function expectOk(label: string, res: { value?: unknown; redirect?: string }, redirect?: string) {
	const ok = redirect
		? res.redirect === redirect
		: (res.value as { ok?: boolean } | undefined)?.ok === true;
	if (!ok)
		throw new Error(`e2e setup: ${label} failed: ${JSON.stringify(res.value ?? res.redirect)}`);
}

async function bootstrap(): Promise<World> {
	const superadmin = new Jar();
	const email = (name: string) => `${name}${E2E_DOMAIN}`;
	expectOk(
		"onboarding",
		await callServerFn(superadmin, F.completeOnboarding, {
			email: email("super"),
			newPassword: E2E_PASSWORD,
			confirmPassword: E2E_PASSWORD,
		}),
		"/",
	);
	expectOk(
		"create site",
		await callServerFn(superadmin, F.createSite, { name: "E2E", slug: "e2e" }),
		"/e2e",
	);

	const accounts = {} as World["accounts"];
	accounts.superadmin = { id: (await userIdByEmail(email("super"))) ?? "", email: email("super") };
	for (const role of ["admin", "editor", "user"] as const satisfies Role[]) {
		const id = await createAccount(email(role), E2E_PASSWORD);
		accounts[role] = { id, email: email(role) };
		if (role !== "user") {
			expectOk(`make ${role}`, await callServerFn(superadmin, F.changeRole, { userId: id, role }));
		}
	}
	return { accounts };
}

/** Creates the database in `url` if it doesn't exist, through the server's `postgres` database. */
async function ensureDatabase(url: string) {
	const target = new URL(url);
	const name = target.pathname.slice(1);
	if (!["localhost", "127.0.0.1"].includes(target.hostname)) {
		throw new Error(`e2e only runs against a local database, not ${target.hostname}`);
	}
	target.pathname = "/postgres";
	const client = new pg.Client({ connectionString: target.toString() });
	await client.connect();
	try {
		const { rows } = await client.query("select 1 from pg_database where datname = $1", [name]);
		if (!rows.length) await client.query(`create database "${name.replace(/"/g, "")}"`);
	} finally {
		await client.end();
	}
}

export default async function setup() {
	if (!existsSync(".output/server/index.mjs")) {
		throw new Error("No production build found — run `pnpm build` (or `pnpm test:e2e`).");
	}
	if (!existsSync(".env")) {
		throw new Error("No .env — copy .env.example and start the stack (`pnpm db:start`).");
	}
	process.loadEnvFile(".env");
	// The suites' own database, created and migrated here: your dev data stays as it is.
	process.env.DATABASE_URL = testDatabaseUrl();
	await ensureDatabase(process.env.DATABASE_URL);
	execFileSync("node", ["scripts/migrate.ts"], { env: process.env, stdio: "inherit" });
	const alreadyRunning = await fetch(`${BASE_URL}/login`).then(
		() => true,
		() => false,
	);
	if (alreadyRunning) throw new Error(`Port ${E2E_PORT} is already in use.`);

	console.log("e2e: emptying the e2e database (sites, content and accounts)…");
	await resetDatabase();
	await clearInbox();

	const stub = await startEmbeddingsStub();
	const hooks = await startWebhookStub();
	mkdirSync(dirname(SERVER_LOG), { recursive: true });
	const log = openSync(SERVER_LOG, "w");
	server = spawn("node", ["--env-file=.env", ".output/server/index.mjs"], {
		// Email links must point at this server, not the dev server's BETTER_AUTH_URL.
		env: {
			...process.env,
			PORT: String(E2E_PORT),
			BETTER_AUTH_URL: BASE_URL,
			OPENAI_API_KEY: "e2e",
			OPENAI_BASE_URL: STUB_URL,
			SPOTCRAFT_API_TOKEN: API_TOKEN,
			WEBHOOK_URL,
			WEBHOOK_SECRET,
			...E2E_S3,
		},
		stdio: ["ignore", log, log],
	});
	await waitForServer();
	try {
		writeFileSync(WORLD_FILE, JSON.stringify(await bootstrap(), null, 2));
	} catch (error) {
		server.kill("SIGKILL");
		stub.close();
		hooks.close();
		// Print it here: Vitest fails to print errors thrown in global setup (source maps).
		console.error("e2e setup failed:", error);
		throw error;
	}

	return async () => {
		stub.close();
		hooks.close();
		if (!server || server.exitCode !== null) return;
		const exited = new Promise((r) => server?.once("exit", r));
		server.kill("SIGTERM");
		await Promise.race([exited, new Promise((r) => setTimeout(r, 6_000))]);
		if (server.exitCode === null) server.kill("SIGKILL");
	};
}
