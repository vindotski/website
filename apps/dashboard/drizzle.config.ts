import { defineConfig } from "drizzle-kit";

// drizzle-kit runs outside Vite, so load .env ourselves (Node built-in, no dotenv).
try {
	process.loadEnvFile();
} catch {
	// No .env file — rely on the ambient environment (e.g. CI).
}

// Drizzle owns the schema and the migrations: generate with `pnpm db:generate`, apply with
// `pnpm db:migrate` (or `pnpm db:reset` to start over).
export default defineConfig({
	dialect: "postgresql",
	schema: "./src/lib/db/schema.ts",
	out: "./drizzle",
	casing: "snake_case",
	schemaFilter: ["public"],
	dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
