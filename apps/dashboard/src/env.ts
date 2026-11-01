import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

// Variables the browser may see (VITE_*, inlined at build time). Server-only ones are in
// src/server/env.server.ts. Every variable is described in .env.example.
export const env = createEnv({
	clientPrefix: "VITE_",
	client: {
		/** The "Source code" link (AGPL §13): forks point it at their own repository. */
		VITE_SPOTCRAFT_SOURCE_URL: z.url().default("https://github.com/vindotski/spotcraft"),
	},
	runtimeEnv: import.meta.env,
	emptyStringAsUndefined: true,
});

/** Where this version's source is published (the "Source code" link). */
export const sourceUrl = env.VITE_SPOTCRAFT_SOURCE_URL;
