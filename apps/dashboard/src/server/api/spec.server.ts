// The OpenAPI spec's description of the public API: served at /api/openapi.json (src/routes/api/$.ts)
// and written by `pnpm openapi` for @spotcraft/client.

export const API_TITLE = "Spotcraft public API";

export const specInfo = {
	title: API_TITLE,
	version: "1",
	description:
		"Read-only: the site's settings, its published documents, and search. A frontend's server can send `Authorization: Bearer <SPOTCRAFT_API_TOKEN>` to read drafts.",
};
