import { createFileRoute } from "@tanstack/react-router";
import { getAuth } from "#/server/better-auth.server";
import { resolveRedirect } from "#/server/redirect.server";
import { clearTokenCookie } from "#/server/session-token.server";

// Sign out from a frontend: a link to /logout?redirect=<a page on your site>. Ends the session
// (here and on every frontend), then goes there (or to sign-in, for any other target). A GET, so
// a frontend can link to it: the worst another site can do with it is sign you out.
export const Route = createFileRoute("/logout")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				await getAuth()
					.api.signOut({ headers: request.headers })
					.catch(() => undefined);
				clearTokenCookie();
				const target = new URL(request.url).searchParams.get("redirect");
				return new Response(null, {
					status: 302,
					headers: {
						Location: await resolveRedirect(target, "/login"),
						"Cache-Control": "no-store",
					},
				});
			},
		},
	},
});
