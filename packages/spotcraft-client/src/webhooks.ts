// Checking a webhook from Spotcraft: `X-Spotcraft-Signature` is `sha256=` plus the hex HMAC-SHA256 of
// the raw body with WEBHOOK_SECRET. Web Crypto, so it runs in Node, edge runtimes and workers.

export type WebhookEvent =
	| "document.published"
	| "document.updated"
	| "document.unpublished"
	| "document.deleted"
	| "document.moved"
	| "site.updated";

export type WebhookPayload = {
	event: WebhookEvent;
	/** The site's slug: one WEBHOOK_URL hears about every site on that Spotcraft. */
	site: string;
	/** The document's id (the site's for site.updated). */
	id: string;
	/** The document's path; "" for site.updated. */
	path: string;
	/** For document.moved: where it was. */
	previousPath?: string;
	/** When it happened (ISO 8601). */
	at: string;
};

const hex = (bytes: ArrayBuffer) =>
	[...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");

/** True when `signature` (the X-Spotcraft-Signature header) matches `body` and `secret`. */
export async function verifyWebhook(
	body: string,
	signature: string | null,
	secret: string,
): Promise<boolean> {
	if (!signature) return false;
	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const expected = `sha256=${hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)))}`;
	if (expected.length !== signature.length) return false;
	// Constant time: look at every character whatever the first difference.
	let difference = 0;
	for (let i = 0; i < expected.length; i++) {
		difference |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
	}
	return difference === 0;
}

/** The webhook in a request, or null when its signature isn't right. Reads the body. */
export async function readWebhook(
	request: Request,
	secret: string,
): Promise<WebhookPayload | null> {
	const body = await request.text();
	const ok = await verifyWebhook(body, request.headers.get("x-spotcraft-signature"), secret);
	return ok ? (JSON.parse(body) as WebhookPayload) : null;
}
