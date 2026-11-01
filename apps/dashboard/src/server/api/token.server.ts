import { createHash, timingSafeEqual } from "node:crypto";
import { serverEnv } from "../env.server";

// The API token (SPOTCRAFT_API_TOKEN): sent by your frontend's server as `Authorization: Bearer …`
// to read drafts and search without the per-visitor limit. Server-only.

const digest = (value: string) => createHash("sha256").update(value).digest();

/**
 * Who's calling: "public" without an Authorization header, "trusted" with the right token, and
 * "invalid" with any other (refused, never quietly treated as public).
 */
export function apiTrust(request: Request): "public" | "trusted" | "invalid" {
	const header = request.headers.get("authorization");
	if (!header) return "public";
	const token = serverEnv().SPOTCRAFT_API_TOKEN;
	const given = header.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
	if (!token || !given) return "invalid";
	// Equal-length digests, compared in constant time.
	return timingSafeEqual(digest(given), digest(token)) ? "trusted" : "invalid";
}
