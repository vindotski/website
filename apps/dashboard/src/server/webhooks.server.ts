import { createHmac } from "node:crypto";
import { serverEnv } from "./env.server";
import { currentSite } from "./site.server";

// Tells your frontend what changed, so it can revalidate or rebuild: a signed POST to WEBHOOK_URL
// after the change is committed. In the background, retried a few times; a save never waits on it
// or fails because of it. Server-only. Docs: Reading content from your site (Webhooks).

export type WebhookEvent =
	| "document.published"
	| "document.updated"
	| "document.unpublished"
	| "document.deleted"
	| "document.moved"
	| "site.updated";

export type WebhookPayload = {
	event: WebhookEvent;
	/** The site's slug: one WEBHOOK_URL hears about every site. */
	site: string;
	/** The document's id (the site's for site.updated). */
	id: string;
	/** The document's path; "" for site.updated. */
	path: string;
	previousPath?: string;
	/** When it happened (ISO 8601). */
	at: string;
};

const RETRY_DELAYS_MS = [1_000, 5_000];

export const signature = (body: string, secret: string) =>
	`sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;

async function deliver(url: string, secret: string, payload: WebhookPayload) {
	const body = JSON.stringify(payload);
	const headers = {
		"Content-Type": "application/json",
		"User-Agent": "Spotcraft",
		"X-Spotcraft-Event": payload.event,
		"X-Spotcraft-Signature": signature(body, secret),
	};
	for (let attempt = 0; ; attempt++) {
		let failure: unknown;
		try {
			const res = await fetch(url, {
				method: "POST",
				headers,
				body,
				signal: AbortSignal.timeout(10_000),
			});
			if (res.ok) return;
			failure = new Error(`HTTP ${res.status}`);
			// A 4xx won't get better by retrying (except a timeout or a rate limit).
			if (res.status < 500 && res.status !== 408 && res.status !== 429) throw failure;
		} catch (error) {
			if (error === failure) throw error;
			failure = error; // network error or timeout: retry
		}
		if (attempt >= RETRY_DELAYS_MS.length) throw failure;
		await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
	}
}

/** Sends `event` to WEBHOOK_URL, if one is set. Never throws: failures are logged. */
export function emitWebhook(event: Omit<WebhookPayload, "site" | "at">) {
	const { WEBHOOK_URL: url, WEBHOOK_SECRET: secret } = serverEnv();
	if (!url) return;
	const at = new Date().toISOString();
	const log = (message: string) =>
		console.error(
			"[webhook] failed",
			JSON.stringify({ event: event.event, path: event.path, message }),
		);
	if (!secret) {
		log("WEBHOOK_URL is set but WEBHOOK_SECRET isn't: nothing sent");
		return;
	}
	void currentSite()
		.then((site) => {
			if (!site) throw new Error("no site for this request");
			return deliver(url, secret, { ...event, site: site.slug, at });
		})
		.catch((error: unknown) => log(String(error)));
}

/** The event for a document that went from `before` to `after` (null: didn't exist / deleted). */
export function documentEvent(
	before: { status: string | null; path: string } | null,
	after: { status: string | null; path: string } | null,
): { event: WebhookEvent; path: string; previousPath?: string } | null {
	const was = before?.status === "published";
	const is = after?.status === "published";
	if (!was && !is) return null; // drafts are invisible to the site
	if (!after) return { event: "document.deleted", path: before?.path ?? "" };
	if (!was) return { event: "document.published", path: after.path };
	if (!is) return { event: "document.unpublished", path: after.path };
	if (before && before.path !== after.path) {
		return { event: "document.moved", path: after.path, previousPath: before.path };
	}
	return { event: "document.updated", path: after.path };
}
