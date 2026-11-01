// `pnpm db:reset`: empty the local database and apply every migration again. Local only: refuses
// any DATABASE_URL that isn't on this machine.
import { execFileSync } from "node:child_process";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("Missing DATABASE_URL. Copy .env.example to .env.");
const host = new URL(url).hostname;
if (!["localhost", "127.0.0.1", "::1"].includes(host)) {
	throw new Error(`db:reset only runs against a local database, not ${host}.`);
}

const client = new pg.Client({ connectionString: url });
await client.connect();
await client.query(`
	drop schema if exists public cascade;
	drop schema if exists private cascade;
	drop schema if exists drizzle cascade;
	create schema public;
`);
await client.end();

execFileSync("pnpm", ["exec", "drizzle-kit", "migrate"], { stdio: "inherit" });
console.log("Local database reset: no site, no content, no accounts.");
