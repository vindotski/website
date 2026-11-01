import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireDashboardAccess } from "./auth-middleware";
import {
	listFiles as listServer,
	readEntryFile,
	renameEntryFile,
	saveEntryFile as saveServer,
} from "./files.server";

// Content as files: everyone on the site reads, editors and up write (config files: admins only).
// Docs: Files, export and import.

export const listFiles = createServerFn({ method: "GET" })
	.middleware([requireDashboardAccess])
	// Which folders have a config is listed for every role; reading one stays admin-only.
	.handler(() => listServer(true));

export const readEntrySource = createServerFn({ method: "GET" })
	.middleware([requireDashboardAccess])
	.validator(z.object({ id: z.string().max(64) }))
	.handler(
		async ({ data }) =>
			(await readEntryFile(data.id)) ?? { ok: false as const, error: "No such file." },
	);

export const saveEntryFile = createServerFn({ method: "POST" })
	.middleware([requireDashboardAccess])
	.validator(
		z.object({
			collection: z.string().max(500),
			entryId: z.uuid().optional(),
			slug: z.string().max(200).optional(),
			text: z.string().max(600_000),
			expectedUpdatedAt: z.string().max(40).optional(),
		}),
	)
	.handler(({ data, context }) => saveServer({ ...data, userId: context.user.id }));

export const renameEntry = createServerFn({ method: "POST" })
	.middleware([requireDashboardAccess])
	.validator(
		z.object({
			id: z.uuid(),
			slug: z.string().max(200),
			expectedUpdatedAt: z.string().max(40).optional(),
		}),
	)
	.handler(({ data, context }) => renameEntryFile({ ...data, userId: context.user.id }));
