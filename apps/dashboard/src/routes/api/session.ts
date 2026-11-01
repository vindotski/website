import { createFileRoute } from "@tanstack/react-router";
import { getAuth } from "#/server/better-auth.server";
import { clearTokenCookie, setTokenCookie } from "#/server/session-token.server";

// A fresh token for a frontend whose token ran out (@spotcraft/client's getSession calls it with
// the visitor's cookies): set as a cookie, and returned. 401, and the token cleared, once the
// session has ended (signed out, a password reset, or removed).
export const Route = createFileRoute("/api/session")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const headers = { "Cache-Control": "no-store" };
				const session = await getAuth().api.getSession({ headers: request.headers });
				if (!session) {
					clearTokenCookie();
					return Response.json({ token: null }, { status: 401, headers });
				}
				return Response.json({ token: await setTokenCookie(session.user) }, { headers });
			},
		},
	},
});
