import { createFileRoute } from "@tanstack/react-router";
import { serveImage } from "#/server/media.server";

// The default site's images: /media/<path> (each site also has /<slug>/media/…). Public for
// published documents; see src/server/media.server.ts.

export const Route = createFileRoute("/media/$")({
	server: {
		handlers: {
			GET: ({ request, params }) => serveImage(request, params._splat ?? ""),
			HEAD: ({ request, params }) => serveImage(request, params._splat ?? ""),
		},
	},
});
