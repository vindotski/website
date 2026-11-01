import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

function createDb() {
	const url = process.env.DATABASE_URL;
	if (!url) {
		throw new Error("Missing env var DATABASE_URL. Copy .env.example to .env.");
	}
	// Vercel Fluid guidance: short idle timeout, min 1, never max 1.
	// pg uses unnamed statements, so it's safe behind transaction-mode poolers (PgBouncer, Neon, …).
	const pool = new Pool({ connectionString: url, max: 5, min: 1, idleTimeoutMillis: 5_000 });
	// Closes idle connections before a Fluid instance suspends; no-op outside Vercel.
	attachDatabasePool(pool);
	return drizzle({ client: pool, schema, casing: "snake_case" });
}

type Db = ReturnType<typeof createDb>;

// Cache on globalThis so Vite HMR in dev doesn't open a new pool per reload.
const globalForDb = globalThis as typeof globalThis & { __spotcraftDb?: Db };

/** Server-only Drizzle client (postgres role — bypasses RLS; authorize in server functions). */
export function getDb() {
	globalForDb.__spotcraftDb ??= createDb();
	return globalForDb.__spotcraftDb;
}
