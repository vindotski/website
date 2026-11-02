// @spotcraft/client: read a Spotcraft site's content from any frontend, and tell who of your
// team is visiting. MIT.
// https://github.com/vindotski/spotcraft/wiki/Reading-content

export { headingAnchors, type Section, sections } from "./body.js";
export {
	type ClientOptions,
	createClient,
	type DocumentHeading,
	type DocumentImage,
	type ListOptions,
	type RequestOptions,
	type SearchMode,
	type SearchOptions,
	type SearchResult,
	type Site,
	type SpotcraftClient,
	type SpotcraftDocument,
	SpotcraftError,
} from "./client.js";
export type { paths } from "./schema.js";
export {
	getSession,
	loginUrl,
	logoutUrl,
	SESSION_COOKIES,
	type SessionOptions,
	type SessionUser,
	TOKEN_COOKIE,
	verifySession,
} from "./session.js";
export { readWebhook, verifyWebhook, type WebhookEvent, type WebhookPayload } from "./webhooks.js";
