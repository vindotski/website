// Applies the migrations in drizzle/ to DATABASE_URL. The production image runs this (bundled as
// migrate.mjs) before the app starts; in development, `pnpm db:migrate` (drizzle-kit) does the same
// and records it in the same table.
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("Missing DATABASE_URL.");

const pool = new pg.Pool({ connectionString: url, max: 1 });
try {
	await migrate(drizzle({ client: pool }), {
		migrationsFolder: process.env.MIGRATIONS_FOLDER ?? "drizzle",
	});
	console.log("Migrations applied.");
} finally {
	await pool.end();
}
