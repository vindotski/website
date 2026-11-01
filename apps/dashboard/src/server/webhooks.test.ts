import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { documentEvent, signature } from "./webhooks.server";

const doc = (status: "draft" | "published", path = "posts/a") => ({ status, path });

describe("documentEvent", () => {
	it("names what the site can see change", () => {
		expect(documentEvent(null, doc("published"))).toEqual({
			event: "document.published",
			path: "posts/a",
		});
		expect(documentEvent(doc("draft"), doc("published"))?.event).toBe("document.published");
		expect(documentEvent(doc("published"), doc("published"))?.event).toBe("document.updated");
		expect(documentEvent(doc("published"), doc("draft"))?.event).toBe("document.unpublished");
		expect(documentEvent(doc("published"), null)).toEqual({
			event: "document.deleted",
			path: "posts/a",
		});
		expect(documentEvent(doc("published", "posts/a"), doc("published", "posts/b"))).toEqual({
			event: "document.moved",
			path: "posts/b",
			previousPath: "posts/a",
		});
	});

	it("stays quiet about drafts", () => {
		expect(documentEvent(null, doc("draft"))).toBeNull();
		expect(documentEvent(doc("draft"), doc("draft", "posts/b"))).toBeNull();
		expect(documentEvent(doc("draft"), null)).toBeNull();
	});
});

describe("signature", () => {
	it("is the hex HMAC-SHA256 of the body", () => {
		const expected = createHmac("sha256", "secret").update('{"a":1}').digest("hex");
		expect(signature('{"a":1}', "secret")).toBe(`sha256=${expected}`);
	});
});
