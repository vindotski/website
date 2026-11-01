import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireDashboardAccess } from "./auth-middleware";
import {
	deleteEntry as deleteEntryServer,
	getEntry as getEntryServer,
	listCollections as listCollectionsServer,
	recentEntries as recentEntriesServer,
	setEntryStatus as setEntryStatusServer,
} from "./content.server";

// Content editing for admins and editors.
// Validators only bound sizes; the real rules run in content.server.ts and come back as
// returned field errors.

const uuid = z.uuid();

export const listCollections = createServerFn({ method: "GET" })
	.middleware([requireDashboardAccess])
	.handler(() => listCollectionsServer());

export const recentEntries = createServerFn({ method: "GET" })
	.middleware([requireDashboardAccess])
	.handler(() => recentEntriesServer(8));

export const getEntry = createServerFn({ method: "GET" })
	.middleware([requireDashboardAccess])
	// Any string: a malformed id in the URL is "not found", not an error.
	.validator(z.object({ id: z.string().max(64) }))
	.handler(({ data }) => getEntryServer(data.id));

export const setEntryStatus = createServerFn({ method: "POST" })
	.middleware([requireDashboardAccess])
	.validator(
		z.object({
			id: uuid,
			intent: z.enum(["publish", "unpublish"]),
			expectedUpdatedAt: z.string().max(40).optional(),
		}),
	)
	.handler(({ data, context }) => setEntryStatusServer({ ...data, userId: context.user.id }));

export const deleteEntry = createServerFn({ method: "POST" })
	.middleware([requireDashboardAccess])
	.validator(z.object({ id: uuid }))
	.handler(({ data }) => deleteEntryServer(data.id));
