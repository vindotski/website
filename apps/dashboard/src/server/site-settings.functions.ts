import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireDashboardAccess, requireSiteAdmin } from "./auth-middleware";
import {
	getSiteSettings as getServer,
	getSiteIdentity,
	saveSiteSettings as saveServer,
} from "./site-settings.server";

// Site settings — admins only (the name and address: any dashboard role). Values are checked in
// src/lib/site/settings.ts.

/** The site's name and address, for the top bar: admins and editors. */
export const siteIdentity = createServerFn({ method: "GET" })
	.middleware([requireDashboardAccess])
	.handler(() => getSiteIdentity());

export const getSiteSettings = createServerFn({ method: "GET" })
	.middleware([requireSiteAdmin])
	.handler(() => getServer());

const value = z.union([z.string().max(5_000), z.null()]).optional();

export const saveSiteSettings = createServerFn({ method: "POST" })
	.middleware([requireSiteAdmin])
	.validator(
		z.object({
			expectedUpdatedAt: z.string().max(40),
			values: z.object({ siteName: value, siteUrl: value }),
		}),
	)
	.handler(({ data, context }) => saveServer({ ...data, userId: context.user.id }));
