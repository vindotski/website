import { testDatabaseUrl } from "./env";

// Vitest doesn't put .env into process.env; the e2e helpers need DATABASE_URL: the e2e database.
process.loadEnvFile(".env");
process.env.DATABASE_URL = testDatabaseUrl();
