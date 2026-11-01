import { and, eq } from "drizzle-orm";
import { getDb } from "#/lib/db/client.server";
import { entries } from "#/lib/db/schema";
import type { ImageInfo } from "#/lib/images";
import { canUseDashboard } from "#/lib/roles";
import { imageKey } from "#/lib/storage";
import { apiTrust } from "./api/token.server";
import { getCurrentUser } from "./auth.server";
import { publicSite } from "./public.server";
import { getStorage } from "./storage.server";

// Serving an image from S3. Anyone may fetch the images of a published document; a draft's only
// someone signed in to the dashboard or holding the API token. A `?v=` matching the file's hash
// (the URLs the API gives out) is cached for a year; anything else for a minute. Docs: Images.

const notFound = () => new Response("Not found", { status: 404 });

export async function serveImage(request: Request, path: string) {
	const storage = await getStorage();
	if (!storage || !path) return notFound();
	const db = getDb();
	// The site in the path (/<slug>/media/…), else the default site's (/media/…).
	const siteId = (await publicSite())?.id;
	if (!siteId) return notFound();
	const [image] = await db
		.select({ id: entries.id, file: entries.file, parent: entries.parent })
		.from(entries)
		.where(and(eq(entries.siteId, siteId), eq(entries.path, path), eq(entries.kind, "image")));
	if (!image?.file) return notFound();

	const [parent] = image.parent
		? await db
				.select({ kind: entries.kind, status: entries.status })
				.from(entries)
				.where(eq(entries.id, image.parent))
		: [];
	const isPublic = parent?.kind !== "document" || parent.status === "published";
	if (!isPublic && !(await canSeeDrafts(request))) return notFound();

	const file = image.file as ImageInfo;
	const etag = `"${file.sha256}"`;
	const version = new URL(request.url).searchParams.get("v");
	const headers = new Headers({
		"Content-Type": file.mime,
		ETag: etag,
		"X-Content-Type-Options": "nosniff",
		"Cache-Control": !isPublic
			? "private, no-store"
			: version && file.sha256.startsWith(version)
				? "public, max-age=31536000, immutable"
				: "public, max-age=60",
		"Access-Control-Allow-Origin": "*",
	});
	// An SVG opened on its own can't run scripts.
	if (file.mime === "image/svg+xml") headers.set("Content-Security-Policy", "sandbox");
	if (request.headers.get("if-none-match") === etag) {
		return new Response(null, { status: 304, headers });
	}
	headers.set("Content-Length", String(file.bytes));
	if (request.method === "HEAD") return new Response(null, { headers });
	const object = await storage.get(imageKey(siteId, image.id));
	if (!object?.body) return notFound();
	return new Response(object.body, { headers });
}

async function canSeeDrafts(request: Request) {
	if (apiTrust(request) === "trusted") return true;
	const user = await getCurrentUser().catch(() => null);
	return !!user && canUseDashboard(user.role);
}
