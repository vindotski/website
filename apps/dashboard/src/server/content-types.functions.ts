import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSiteAdmin } from "./auth-middleware";
import {
	createContentType as createServer,
	deleteContentType as deleteServer,
	getContentType as getServer,
	saveContentType as saveServer,
} from "./content-types.server";

// Folder configs — admins only. Validators bound sizes; the config itself is checked against the
// field-definition schema in content-types.server.ts. `slug` is the folder's path.

const slug = z.string().max(500);

const values = z.object({
	slug: z.string().max(500),
	fields: z.array(z.unknown()).max(500),
});

const change = z.object({
	slug,
	expectedUpdatedAt: z.string().max(40),
	values,
});

export const getContentType = createServerFn({ method: "GET" })
	.middleware([requireSiteAdmin])
	.validator(z.object({ slug }))
	.handler(({ data }) => getServer(data.slug));

export const createContentType = createServerFn({ method: "POST" })
	.middleware([requireSiteAdmin])
	.validator(values)
	.handler(({ data }) => createServer(data));

export const saveContentType = createServerFn({ method: "POST" })
	.middleware([requireSiteAdmin])
	.validator(change)
	.handler(({ data }) => saveServer(data));

export const deleteContentType = createServerFn({ method: "POST" })
	.middleware([requireSiteAdmin])
	.validator(z.object({ slug }))
	.handler(({ data }) => deleteServer(data.slug));
