import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

// Server-only variables, checked the first time the server needs them (a missing or malformed one
// fails loudly, naming it). Read at runtime, never at build time. See .env.example.

function load() {
	return createEnv({
		server: {
			DATABASE_URL: z.url(),
			BETTER_AUTH_SECRET: z.string().min(32, "Use at least 32 random characters"),
			/** Where this app is served; email links point there. */
			BETTER_AUTH_URL: z.url().optional(),
			SMTP_URL: z.url(),
			MAIL_FROM: z.string().default("Spotcraft <noreply@localhost>"),
			/** Search by meaning (/api/search searches by words without it). */
			OPENAI_API_KEY: z.string().optional(),
			/** Any OpenAI-compatible embeddings API. */
			OPENAI_BASE_URL: z.url().default("https://api.openai.com/v1"),
			/** For your frontend's server: drafts, and no search rate limit. Never send it to browsers. */
			SPOTCRAFT_API_TOKEN: z.string().min(32, "Use at least 32 random characters").optional(),
			/** Where content changes are POSTed, signed with WEBHOOK_SECRET. */
			WEBHOOK_URL: z.url().optional(),
			WEBHOOK_SECRET: z.string().min(16, "Use at least 16 random characters").optional(),
			/** Images: any S3-compatible bucket. Off without S3_BUCKET and S3_ENDPOINT. */
			S3_ENDPOINT: z.url().optional(),
			S3_BUCKET: z.string().optional(),
			S3_ACCESS_KEY_ID: z.string().optional(),
			S3_SECRET_ACCESS_KEY: z.string().optional(),
			S3_REGION: z.string().optional(),
		},
		runtimeEnv: process.env,
		emptyStringAsUndefined: true,
	});
}

let cached: ReturnType<typeof load> | undefined;

export function serverEnv() {
	cached ??= load();
	return cached;
}
