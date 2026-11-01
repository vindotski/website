import { getRequest } from "@tanstack/react-start/server";
import { asc, eq, sql } from "drizzle-orm";
import { SLUG } from "#/lib/content/fields";
import { getDb } from "#/lib/db/client.server";
import { siteMembers, sites } from "#/lib/db/schema";
import { siteSlugInPath } from "#/lib/site/paths";

// Which site a request is for. A site lives at its own path: `/<slug>/…` for the dashboard, its
// API and its images, so a page or API request names it in its URL. Server functions are called
// at Spotcraft's own path, so the dashboard sends the site in a header (SITE_HEADER, see
// src/start.ts). Without either: the last site you opened (SITE_COOKIE), then the default site.
// Naming a site grants nothing: access is checked per site (roleOf in auth.server.ts).

export const SITE_HEADER = "x-spotcraft-site";
export const SITE_COOKIE = "spotcraft_site";

export type SiteRef = { id: string; slug: string; name: string; isDefault: boolean };

export { siteSlugInPath };

const columns = { id: sites.id, slug: sites.slug, name: sites.name, isDefault: sites.isDefault };

export async function siteBySlug(slug: string): Promise<SiteRef | null> {
	const [site] = await getDb().select(columns).from(sites).where(eq(sites.slug, slug));
	return site ?? null;
}

/** The default site (the bare /api and /media), or null before there's any site. */
export async function defaultSite(): Promise<SiteRef | null> {
	const [site] = await getDb()
		.select(columns)
		.from(sites)
		.orderBy(sql`${sites.isDefault} desc`, asc(sites.createdAt))
		.limit(1);
	return site ?? null;
}

/** Every site, default first, then by name. */
export async function allSites(): Promise<SiteRef[]> {
	return getDb().select(columns).from(sites).orderBy(sql`${sites.isDefault} desc`, asc(sites.name));
}

function cookieValue(request: Request, name: string) {
	const cookie = request.headers.get("cookie") ?? "";
	const match = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
	return match ? decodeURIComponent(match[1]) : null;
}

/** The slug this request names, if any: header, then path, then your last site's cookie. */
export function requestedSlug(request: Request): string | null {
	const header = request.headers.get(SITE_HEADER);
	if (header && SLUG.test(header)) return header;
	const inPath = siteSlugInPath(new URL(request.url).pathname);
	if (inPath) return inPath;
	const cookie = cookieValue(request, SITE_COOKIE);
	return cookie && SLUG.test(cookie) ? cookie : null;
}

// One lookup per request, however often it's asked.
const resolved = new WeakMap<Request, Promise<SiteRef | null>>();

/** The site this request is for (the one it names, else the default), or null if there's none. */
export function currentSite(): Promise<SiteRef | null> {
	let request: Request;
	try {
		request = getRequest();
	} catch {
		return defaultSite(); // outside a request
	}
	let site = resolved.get(request);
	if (!site) {
		const slug = requestedSlug(request);
		site = (slug ? siteBySlug(slug) : Promise.resolve(null)).then(
			async (named) => named ?? defaultSite(),
		);
		resolved.set(request, site);
	}
	return site;
}

/** Whether this request names a site (header or path) that doesn't exist. */
export async function namedSiteMissing(): Promise<boolean> {
	let request: Request;
	try {
		request = getRequest();
	} catch {
		return false;
	}
	const header = request.headers.get(SITE_HEADER);
	const slug =
		(header && SLUG.test(header) ? header : null) ?? siteSlugInPath(new URL(request.url).pathname);
	return slug !== null && (await siteBySlug(slug)) === null;
}

export async function currentSiteId(): Promise<string> {
	const site = await currentSite();
	if (!site) throw new Error("There's no site yet.");
	return site.id;
}

/** The sites someone works on: superadmins every site, others the ones they're a member of. */
export async function sitesFor(userId: string, superadmin: boolean): Promise<SiteRef[]> {
	if (superadmin) return allSites();
	return getDb()
		.select(columns)
		.from(sites)
		.innerJoin(siteMembers, eq(siteMembers.siteId, sites.id))
		.where(eq(siteMembers.userId, userId))
		.orderBy(sql`${sites.isDefault} desc`, asc(sites.name));
}

/** Whether any site exists yet (a new install has none until /new-site). */
export async function hasSite(): Promise<boolean> {
	return (await defaultSite()) !== null;
}

// Any constant: serializes concurrent createSite calls (pg_advisory_xact_lock).
const CREATE_SITE_LOCK = 7_301_002;

export type CreateSiteResult =
	| { ok: true; slug: string }
	| { ok: false; fieldErrors: Partial<Record<"name" | "slug", string[]>> };

/**
 * Creates a site (its root folder comes from the create_site_root trigger). The first one becomes
 * the default.
 */
export async function createSite(input: {
	name: string;
	slug: string;
	userId: string;
}): Promise<CreateSiteResult> {
	return getDb().transaction(async (tx): Promise<CreateSiteResult> => {
		await tx.execute(sql`select pg_advisory_xact_lock(${CREATE_SITE_LOCK})`);
		const [taken] = await tx.select({ id: sites.id }).from(sites).where(eq(sites.slug, input.slug));
		if (taken) return { ok: false, fieldErrors: { slug: ["Another site uses this slug"] } };
		const [anyDefault] = await tx
			.select({ id: sites.id })
			.from(sites)
			.where(eq(sites.isDefault, true));
		await tx.insert(sites).values({
			name: input.name,
			slug: input.slug,
			isDefault: !anyDefault,
			updatedBy: input.userId,
		});
		return { ok: true, slug: input.slug };
	});
}

/** Makes `siteId` the default site (what the bare /api and /media serve). */
export async function makeDefaultSite(siteId: string) {
	await getDb().transaction(async (tx) => {
		await tx.update(sites).set({ isDefault: false }).where(eq(sites.isDefault, true));
		await tx.update(sites).set({ isDefault: true }).where(eq(sites.id, siteId));
	});
}
