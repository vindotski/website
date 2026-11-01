import { describe, expect, it } from "vitest";
import { type PublicImage, publicImage, resolveBodyImages, resolveImageFields } from "./media";

const cover: PublicImage = publicImage("https://cms.example.com", {
	path: "posts/hello/cover.png",
	name: "cover.png",
	file: { mime: "image/png", bytes: 10, width: 1200, height: 630, sha256: "abcdef1234567890ff" },
});
const images = new Map([["cover.png", cover]]);

describe("image URLs", () => {
	it("versions a URL by the file's hash", () => {
		expect(cover.url).toBe("https://cms.example.com/media/posts/hello/cover.png?v=abcdef123456");
	});

	it("resolves image fields, at any depth, that name the document's images", () => {
		expect(
			resolveImageFields(
				{
					image: { src: "cover.png", alt: "A cover" },
					gallery: [{ src: "cover.png", alt: "" }],
					other: { src: "https://elsewhere.example/x.png", alt: "" },
					missing: { src: "nope.png", alt: "" },
				},
				images,
			),
		).toEqual({
			image: { src: cover.url, alt: "A cover", width: 1200, height: 630, mime: "image/png" },
			gallery: [{ src: cover.url, alt: "", width: 1200, height: 630, mime: "image/png" }],
			other: { src: "https://elsewhere.example/x.png", alt: "" },
			missing: { src: "nope.png", alt: "" },
		});
	});

	it("rewrites the body's own images, with their size for <img>", () => {
		const body = {
			type: "root",
			children: [
				{ type: "paragraph", children: [{ type: "image", url: "cover.png", alt: "A" }] },
				{ type: "definition", identifier: "c", url: "cover.png" },
				{ type: "paragraph", children: [{ type: "image", url: "/elsewhere.png", alt: "" }] },
			],
		};
		const resolved = resolveBodyImages(body, images);
		expect(resolved.children[0]).toEqual({
			type: "paragraph",
			children: [
				{
					type: "image",
					url: cover.url,
					alt: "A",
					data: { hProperties: { width: 1200, height: 630 } },
				},
			],
		});
		expect(resolved.children[1]).toMatchObject({ url: cover.url });
		expect(resolved.children[2]).toEqual(body.children[2]);
		// The stored body isn't touched.
		expect(body.children[0]).toEqual({
			type: "paragraph",
			children: [{ type: "image", url: "cover.png", alt: "A" }],
		});
	});
});
