import { defineConfig } from "vitest/config";

// End-to-end suites against the production build + local Postgres + Mailpit (see e2e/).
// Run with `pnpm test:e2e` (builds first). Unit tests live in vitest.config.ts.
export default defineConfig({
	test: {
		environment: "node",
		include: ["e2e/**/*.e2e.test.ts"],
		globalSetup: ["e2e/global-setup.ts"],
		setupFiles: ["e2e/support/load-env.ts"],
		// Suites share the dev admin and the Mailpit inbox.
		fileParallelism: false,
		testTimeout: 30_000,
		hookTimeout: 60_000,
	},
});
