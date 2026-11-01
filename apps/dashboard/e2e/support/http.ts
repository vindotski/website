import { fromCrossJSON, toJSONAsync } from "seroval";
import { BASE_URL } from "./env";
import { type ServerFnRef, serverFnId } from "./server-fns";

/** Minimal browser-like cookie jar (one per simulated browser). */
export class Jar {
	readonly cookies = new Map<string, string>();

	header() {
		return [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
	}

	absorb(res: Response) {
		for (const cookie of res.headers.getSetCookie()) {
			const [pair, ...attrs] = cookie.split(";");
			const eq = pair.indexOf("=");
			const name = pair.slice(0, eq).trim();
			const value = pair.slice(eq + 1);
			const expired = attrs.some((a) => /^\s*max-age=0\s*$/i.test(a));
			if (expired || value === "") this.cookies.delete(name);
			else this.cookies.set(name, value);
		}
	}

	/** Better Auth's session cookie (`better-auth.session_token`, `__Secure-` prefixed on HTTPS). */
	sessionCookieName() {
		return [...this.cookies.keys()].find((k) => /better-auth\.session_token$/.test(k));
	}

	hasSession() {
		return this.sessionCookieName() !== undefined;
	}
}

export type ServerFnResponse<T = unknown> = {
	status: number;
	headers: Headers;
	/** Decoded return value (seroval cross-JSON `{ result }`), when the function returned. */
	value: T | undefined;
	/** Target when the function threw `redirect()`. */
	redirect: string | undefined;
	raw: string;
};

/** Where a server function call comes from, like a browser would say. */
export type CallFrom = {
	/** The dashboard's x-spotcraft-site header; without it, the default site. */
	site?: string;
	/** `Origin`: the app's own by default (the dashboard's pages), null for none. */
	origin?: string | null;
	/** `Sec-Fetch-Site`, which browsers send and which wins over `Origin`. */
	fetchSite?: string;
};

/** Call a server function the way the client stub does (POST: seroval body; GET: no payload). */
export async function callServerFn<T = unknown>(
	jar: Jar | null,
	ref: ServerFnRef,
	data?: unknown,
	method: "GET" | "POST" = "POST",
	{ site, origin = BASE_URL, fetchSite }: CallFrom = {},
): Promise<ServerFnResponse<T>> {
	const headers: Record<string, string> = { "x-tsr-serverFn": "true", accept: "application/json" };
	if (site) headers["x-spotcraft-site"] = site;
	if (origin) headers.origin = origin;
	if (fetchSite) headers["sec-fetch-site"] = fetchSite;
	if (jar?.cookies.size) headers.cookie = jar.header();
	const init: RequestInit = { method, headers, redirect: "manual" };
	let url = `${BASE_URL}/_serverFn/${serverFnId(ref.file, ref.name)}`;
	if (method === "POST" && data instanceof FormData) {
		// Like the client stub: the form as multipart (fetch sets the boundary).
		init.body = data;
	} else if (method === "POST") {
		headers["content-type"] = "application/json";
		init.body = JSON.stringify(await toJSONAsync({ data }));
	} else if (data !== undefined) {
		// GET input travels as a seroval-encoded `payload` query parameter, like the client stub.
		url += `?${new URLSearchParams({ payload: JSON.stringify(await toJSONAsync({ data })) })}`;
	}
	const res = await fetch(url, init);
	jar?.absorb(res);
	const raw = await res.text();

	let value: T | undefined;
	let redirect: string | undefined;
	if (res.headers.get("x-tss-serialized")) {
		value = (fromCrossJSON(JSON.parse(raw), { refs: new Map() }) as { result: T }).result;
	} else if (raw.startsWith("{")) {
		const body = JSON.parse(raw) as { isSerializedRedirect?: boolean; href?: string };
		if (body.isSerializedRedirect) redirect = body.href;
	}
	return { status: res.status, headers: res.headers, value, redirect, raw };
}

/** Plain page/route request (no redirect following), like a browser navigation. */
export async function getPage(jar: Jar | null, pathOrUrl: string) {
	const url = pathOrUrl.startsWith("http") ? pathOrUrl : BASE_URL + pathOrUrl;
	const res = await fetch(url, {
		redirect: "manual",
		headers: jar?.cookies.size ? { cookie: jar.header() } : {},
	});
	jar?.absorb(res);
	return { status: res.status, location: res.headers.get("location"), html: await res.text() };
}
