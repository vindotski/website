import type { ImageInfo } from "../images.ts";
import { isLocalImage } from "../images.ts";

// Turning a document's own images into absolute URLs for the public API: an `image` field's `src`
// and a Markdown image's URL name a file next to the document (`cover.png`); frontends get
// `<site URL>/media/<path>?v=<hash>` with the image's size. Other URLs are left alone. Pure.
// Docs: Images.

export type PublicImage = {
	path: string;
	name: string;
	url: string;
	mime: string;
	width: number;
	height: number;
	bytes: number;
};

export function publicImage(
	origin: string,
	image: { path: string; name: string; file: ImageInfo },
) {
	return {
		path: image.path,
		name: image.name,
		url: `${origin}/media/${image.path}?v=${image.file.sha256.slice(0, 12)}`,
		mime: image.file.mime,
		width: image.file.width,
		height: image.file.height,
		bytes: image.file.bytes,
	} satisfies PublicImage;
}

const isObject = (v: unknown): v is Record<string, unknown> =>
	typeof v === "object" && v !== null && !Array.isArray(v);

/** Field values with every `{ src: "cover.png", alt }` of a known image given its URL and size. */
export function resolveImageFields(value: unknown, images: Map<string, PublicImage>): unknown {
	if (Array.isArray(value)) return value.map((v) => resolveImageFields(v, images));
	if (!isObject(value)) return value;
	const own =
		typeof value.src === "string" && isLocalImage(value.src) ? images.get(value.src) : undefined;
	const resolved = Object.fromEntries(
		Object.entries(value).map(([k, v]) => [k, resolveImageFields(v, images)]),
	);
	return own
		? { ...resolved, src: own.url, width: own.width, height: own.height, mime: own.mime }
		: resolved;
}

/**
 * A copy of the body with local images' URLs made absolute; image nodes also get their size as
 * `data.hProperties` (so mdast-util-to-hast renders `<img width height>`).
 */
export function resolveBodyImages<T>(body: T, images: Map<string, PublicImage>): T {
	const walk = (node: unknown): unknown => {
		if (Array.isArray(node)) return node.map(walk);
		if (!isObject(node)) return node;
		const copy = Object.fromEntries(Object.entries(node).map(([k, v]) => [k, walk(v)]));
		const image =
			(node.type === "image" || node.type === "definition") &&
			typeof node.url === "string" &&
			isLocalImage(node.url)
				? images.get(node.url)
				: undefined;
		if (!image) return copy;
		copy.url = image.url;
		if (node.type === "image") {
			const data = isObject(node.data) ? node.data : {};
			const props = isObject(data.hProperties) ? data.hProperties : {};
			copy.data = { ...data, hProperties: { ...props, width: image.width, height: image.height } };
		}
		return copy;
	};
	return walk(body) as T;
}
