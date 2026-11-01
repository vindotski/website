import { resolve } from "node:path";

/** e2e server port — not 3000, so `pnpm dev` can keep running. Allow-listed in config.toml. */
export const E2E_PORT = 3100;
export const BASE_URL = `http://localhost:${E2E_PORT}`;
export const MAILPIT_URL = "http://127.0.0.1:8025/api/v1";
/** Server stdout/stderr, written by global-setup; CI uploads it when a run fails. */
export const SERVER_LOG = resolve("e2e/.artifacts/server.log");
/** The accounts global-setup created, one per role (see support/world.ts). */
export const WORLD_FILE = resolve("e2e/.artifacts/world.json");

/** Every e2e account's email ends with this. */
export const E2E_DOMAIN = "@e2e.test";
export const E2E_PASSWORD = "e2e-password-1";

/** The e2e server's image bucket (SeaweedFS from `pnpm db:start`), apart from the dev one. */
export const E2E_S3 = {
	S3_ENDPOINT: "http://127.0.0.1:8333",
	S3_BUCKET: "spotcraft-e2e",
	S3_ACCESS_KEY_ID: "e2e",
	S3_SECRET_ACCESS_KEY: "e2e",
	S3_REGION: "auto",
};

/**
 * The e2e database: the local one's name plus `_test`, so the suites never touch your dev data.
 * Created and migrated by global-setup.
 */
export function testDatabaseUrl(url = process.env.DATABASE_URL ?? "") {
	const parsed = new URL(url);
	parsed.pathname = `${parsed.pathname.replace(/_test$/, "")}_test`;
	return parsed.toString();
}
