import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { clientIp } from "#/lib/client-ip";
import { serverEnv } from "../env.server";
import { publicSite } from "../public.server";
import { siteSlugInPath } from "../site.server";
import { type ApiContext, router } from "./router.server";
import { specInfo } from "./spec.server";
import { apiTrust } from "./token.server";

// The public read API over HTTP, for every site: /<slug>/api/… (and the default site at /api/…).
// Each site's spec is at …/api/openapi.json, with a reference page at …/api/docs. The routes are
// src/routes/api/$.ts and src/routes/$site/api/$.ts. Better Auth's /api/auth/* is its own route.

let handler: OpenAPIHandler<ApiContext> | undefined;

function getHandler() {
	handler ??= new OpenAPIHandler(router, {
		plugins: [
			new OpenAPIReferencePlugin({
				schemaConverters: [new ZodToJsonSchemaConverter()],
				specPath: "/openapi.json",
				docsPath: "/docs",
				docsTitle: "Spotcraft API",
				specGenerateOptions: { info: specInfo },
			}),
		],
	});
	return handler;
}

const notFound = (message: string) =>
	Response.json({ code: "NOT_FOUND", status: 404, message }, { status: 404 });

async function handle({ request }: { request: Request }) {
	const trust = apiTrust(request);
	if (trust === "invalid") {
		return Response.json(
			{ code: "UNAUTHORIZED", status: 401, message: "That API token isn't valid." },
			{ status: 401, headers: { "Cache-Control": "no-store" } },
		);
	}
	const site = await publicSite();
	if (!site) return notFound("There's no such site here.");
	const slug = siteSlugInPath(new URL(request.url).pathname);
	const base = serverEnv().BETTER_AUTH_URL?.replace(/\/$/, "") ?? new URL(request.url).origin;
	const trusted = trust === "trusted";
	const { matched, response } = await getHandler().handle(request, {
		prefix: slug ? `/${slug}/api` : "/api",
		// Image URLs always name the site, so they keep working if the default changes.
		context: { ip: clientIp(request), trusted, origin: `${base}/${site.slug}` },
	});
	if (!matched) return new Response("Not found", { status: 404 });
	if (trusted) {
		// Possibly drafts, for one caller: never stored by a browser or a CDN.
		response.headers.set("Cache-Control", "private, no-store");
	} else if (request.method === "GET" && response.ok) {
		// Public and the same for everyone: browsers and CDNs may cache it briefly.
		response.headers.set("Cache-Control", "public, max-age=60, stale-while-revalidate=600");
	}
	response.headers.set("Access-Control-Allow-Origin", "*");
	return response;
}

/** The API is read-only: anything but GET is refused outright (not left to the app's pages). */
const readOnly = () =>
	new Response("This API is read-only.", { status: 405, headers: { Allow: "GET, HEAD" } });

export const apiHandlers = {
	GET: handle,
	HEAD: handle,
	POST: readOnly,
	PUT: readOnly,
	PATCH: readOnly,
	DELETE: readOnly,
};
