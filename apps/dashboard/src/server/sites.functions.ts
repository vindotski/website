import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { isSuperadmin } from "#/lib/roles";
import { type NewSiteFieldErrors, validateNewSite } from "#/lib/site/new-site";
import { requireSuperadmin, requireUser } from "./auth-middleware";
import {
	createSite as createSiteRow,
	currentSiteId,
	makeDefaultSite,
	sitesFor,
} from "./site.server";

type CreateSiteResult = { ok: false; fieldErrors: NewSiteFieldErrors };

/** Creates a site (superadmins only), then opens it. The first site becomes the default. */
export const createSite = createServerFn({ method: "POST" })
	.middleware([requireSuperadmin])
	.validator(z.object({ name: z.string().max(200), slug: z.string().max(200) }))
	.handler(async ({ data, context }): Promise<CreateSiteResult> => {
		const checked = validateNewSite(data);
		if (!checked.ok) return { ok: false, fieldErrors: checked.fieldErrors };
		const created = await createSiteRow({ ...checked.value, userId: context.user.id });
		if (!created.ok) return created;
		throw redirect({ to: "/$site", params: { site: created.slug } });
	});

/** Makes this site the default (superadmins only): the one the bare /api and /media serve. */
export const makeDefault = createServerFn({ method: "POST" })
	.middleware([requireSuperadmin])
	.handler(async () => {
		await makeDefaultSite(await currentSiteId());
		return { ok: true as const };
	});

/** The sites you work on, for the switcher: every site for a superadmin. */
export const mySites = createServerFn({ method: "GET" })
	.middleware([requireUser])
	.handler(async ({ context }) =>
		(await sitesFor(context.user.id, isSuperadmin(context.user.role))).map((s) => ({
			slug: s.slug,
			name: s.name,
			isDefault: s.isDefault,
		})),
	);
