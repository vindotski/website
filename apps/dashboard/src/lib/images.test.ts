import { describe, expect, it } from "vitest";
import { inspectImage } from "./images";

// A 1×1 PNG and a 3×2 SVG.
const png = Uint8Array.from(
	atob(
		"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
	),
	(c) => c.charCodeAt(0),
);
const svg = new TextEncoder().encode(
	'<svg xmlns="http://www.w3.org/2000/svg" width="3" height="2"/>',
);

describe("inspectImage", () => {
	it("reads the real type and size from the bytes", () => {
		const result = inspectImage(png, "dot.png");
		expect(result).toMatchObject({
			ok: true,
			info: { mime: "image/png", width: 1, height: 1, bytes: png.length },
		});
		expect(result.ok && result.info.sha256).toMatch(/^[0-9a-f]{64}$/);
		expect(inspectImage(svg, "logo.svg")).toMatchObject({
			ok: true,
			info: { mime: "image/svg+xml", width: 3, height: 2 },
		});
	});

	it("refuses a name that doesn't match the bytes, a bad name, or not an image", () => {
		expect(inspectImage(png, "dot.jpg")).toEqual({
			ok: false,
			error: "This is a PNG image: name it .png",
		});
		expect(inspectImage(png, "Dot Photo.png").ok).toBe(false);
		expect(inspectImage(new TextEncoder().encode("hello"), "note.png")).toMatchObject({
			ok: false,
		});
	});
});
