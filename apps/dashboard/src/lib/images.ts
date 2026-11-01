import { createHash } from "node:crypto";
import { imageSize } from "image-size";
import { IMAGE_SLUG } from "./content/fields.ts";

// Checking an uploaded image: its real type (from its bytes, not its name), its size in pixels,
// and its hash (which versions its URL). Shared by the server and scripts (Node type stripping:
// relative imports with extensions). Docs: Images.

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const MIME = {
	png: "image/png",
	jpg: "image/jpeg",
	gif: "image/gif",
	webp: "image/webp",
	avif: "image/avif",
	svg: "image/svg+xml",
} as const;

export type ImageMime = (typeof MIME)[keyof typeof MIME];

/** What's stored about an image (`entries.file`). */
export type ImageInfo = {
	mime: ImageMime;
	bytes: number;
	width: number;
	height: number;
	/** Hex SHA-256 of the bytes: a new upload means a new URL. */
	sha256: string;
};

/** The file name's type, as a key of MIME (`photo.jpeg` → jpg). */
const typeOfName = (name: string) => {
	const ext = name.slice(name.lastIndexOf(".") + 1);
	return ext === "jpeg" ? "jpg" : ext;
};

/** Checks an image's name and bytes. The name must be a slug with an image extension. */
export function inspectImage(
	bytes: Uint8Array,
	name: string,
): { ok: true; info: ImageInfo } | { ok: false; error: string } {
	if (!IMAGE_SLUG.test(name)) {
		return {
			ok: false,
			error:
				"Use a name like cover.png: lowercase letters, digits and hyphens, then .png, .jpg, .webp, .avif, .gif or .svg",
		};
	}
	if (bytes.length > MAX_IMAGE_BYTES) return { ok: false, error: "Images can be up to 10 MB" };
	let size: ReturnType<typeof imageSize>;
	try {
		size = imageSize(bytes);
	} catch {
		return { ok: false, error: "This isn't an image Spotcraft can read" };
	}
	const type = size.type && size.type in MIME ? (size.type as keyof typeof MIME) : null;
	if (!type) return { ok: false, error: "Use a PNG, JPEG, WebP, AVIF, GIF or SVG image" };
	if (type !== typeOfName(name)) {
		return { ok: false, error: `This is a ${type.toUpperCase()} image: name it .${type}` };
	}
	if (!size.width || !size.height) return { ok: false, error: "This image has no size" };
	return {
		ok: true,
		info: {
			mime: MIME[type],
			bytes: bytes.length,
			width: size.width,
			height: size.height,
			sha256: createHash("sha256").update(bytes).digest("hex"),
		},
	};
}

/** True for a `src` (or Markdown image URL) that names a file next to the document. */
export const isLocalImage = (src: string) => IMAGE_SLUG.test(src);
