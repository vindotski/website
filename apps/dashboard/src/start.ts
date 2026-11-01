import { isNotFound, isRedirect } from "@tanstack/react-router";
import { createCsrfMiddleware, createMiddleware, createStart } from "@tanstack/react-start";
import { activeSite } from "./lib/site/active";

// Flatten an error and its `cause` chain (Drizzle wraps driver errors as DrizzleQueryError,
// so the useful part — e.g. pg's ENOTFOUND / 28P01 — lives in `cause`).
function describeError(error: unknown, depth = 0): Record<string, unknown> {
	if (!(error instanceof Error) || depth > 3) return { value: String(error) };
	const { code, errno, syscall, hostname, address, port } = error as Error &
		Record<string, unknown>;
	return {
		name: error.name,
		message: error.message,
		...Object.fromEntries(
			Object.entries({ code, errno, syscall, hostname, address, port }).filter(
				([, v]) => v !== undefined,
			),
		),
		...(error.cause ? { cause: describeError(error.cause, depth + 1) } : {}),
	};
}

// Every server function: log the full error server-side, and in production rethrow a generic error
// so internals (SQL, hosts) never reach the browser.
const serverErrorBoundary = createMiddleware({ type: "function" }).server(async ({ next }) => {
	try {
		return await next();
	} catch (error) {
		// Control flow, not failures (e.g. redirect to /login) — pass through untouched.
		if (isRedirect(error) || isNotFound(error)) throw error;
		console.error("[server-fn] failed", JSON.stringify(describeError(error)));
		if (import.meta.env.PROD) throw new Error("Internal server error");
		throw error;
	}
});

// Every server function call from the browser names the dashboard's current site (server
// functions live at Spotcraft's own path, not the site's). The server checks access per site.
const siteHeader = createMiddleware({ type: "function" }).client(async ({ next }) => {
	const site = activeSite();
	return next(site ? { headers: { "x-spotcraft-site": site } } : undefined);
});

// Server functions answer the dashboard's own pages only. The session cookie is SameSite=Lax,
// which still lets a same-site page (a frontend at blog.example.com beside cms.example.com) call
// them as you: the browser's Sec-Fetch-Site, else Origin or Referer, must say same-origin.
// BETTER_AUTH_URL's origin counts too (behind a proxy, request.url is the internal address).
// The public API (/api, CORS *) and Better Auth's /api/auth/* (its own checks) aren't server
// functions, so they aren't affected.
const csrf = createCsrfMiddleware({
	filter: (ctx) => ctx.handlerType === "serverFn",
	origin: (origin, { request }) => {
		const allowed = [new URL(request.url).origin];
		if (process.env.BETTER_AUTH_URL) allowed.push(new URL(process.env.BETTER_AUTH_URL).origin);
		return allowed.includes(origin);
	},
});

export const startInstance = createStart(() => ({
	requestMiddleware: [csrf],
	functionMiddleware: [siteHeader, serverErrorBoundary],
}));
