import { createFileRoute } from "@tanstack/react-router";
import { serveImage } from "#/server/media.server";

// A site's images: /<slug>/media/<path>. See src/server/media.server.ts.
export const Route = createFileRoute("/$site/media/$")({
	server: {
		handlers: {
			GET: ({ request, params }) => serveImage(request, params._splat ?? ""),
			HEAD: ({ request, params }) => serveImage(request, params._splat ?? ""),
		},
	},
});
