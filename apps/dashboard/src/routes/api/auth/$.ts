import { createFileRoute } from "@tanstack/react-router";
import { getAuth } from "#/server/better-auth.server";

// Better Auth's own endpoints (/api/auth/*): the reset-password links in emails land here first.
export const Route = createFileRoute("/api/auth/$")({
	server: {
		handlers: {
			GET: ({ request }) => getAuth().handler(request),
			POST: ({ request }) => getAuth().handler(request),
		},
	},
});
