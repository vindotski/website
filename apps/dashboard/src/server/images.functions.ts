import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { MAX_IMAGE_BYTES } from "#/lib/images";
import { requireDashboardAccess } from "./auth-middleware";
import {
	deleteImage as deleteImageServer,
	imagesOf,
	uploadImage as uploadImageServer,
} from "./images.server";
import { imagesEnabled } from "./storage.server";

// A document's images, for admins and editors. The real checks (type, size, name) run in
// images.server.ts and come back as a returned error.

/** Whether images are on, and the document's images. */
export const listDocumentImages = createServerFn({ method: "GET" })
	.middleware([requireDashboardAccess])
	.validator(z.object({ documentId: z.uuid() }))
	.handler(async ({ data }) => ({
		enabled: imagesEnabled(),
		images: imagesEnabled() ? await imagesOf([data.documentId]) : [],
	}));

/** FormData: `documentId`, and `file` (its name is the image's name, like cover.png). */
export const uploadDocumentImage = createServerFn({ method: "POST" })
	.middleware([requireDashboardAccess])
	.validator((data: unknown) => {
		if (!(data instanceof FormData)) throw new Error("Expected FormData");
		const documentId = z.uuid().parse(data.get("documentId"));
		const file = data.get("file");
		if (!(file instanceof File)) throw new Error("Expected a file");
		return { documentId, file };
	})
	.handler(async ({ data, context }) => {
		// Checked again on the bytes; this avoids reading a huge upload at all.
		if (data.file.size > MAX_IMAGE_BYTES) {
			return { ok: false as const, error: "Images can be up to 10 MB" };
		}
		return uploadImageServer({
			documentId: data.documentId,
			name: data.file.name.toLowerCase(),
			bytes: new Uint8Array(await data.file.arrayBuffer()),
			userId: context.user.id,
		});
	});

export const deleteDocumentImage = createServerFn({ method: "POST" })
	.middleware([requireDashboardAccess])
	.validator(z.object({ id: z.uuid() }))
	.handler(({ data }) => deleteImageServer(data.id));
