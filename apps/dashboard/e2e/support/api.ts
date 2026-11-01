import { BASE_URL } from "./env";

// What any frontend can do: the public read API, no session. `/api` is the default site's; a site's
// own is at `/<slug>/api` (`base`).

export async function api<T = unknown>(path: string, init?: RequestInit, base = "/api") {
	const res = await fetch(`${BASE_URL}${base}${path}`, init);
	const text = await res.text();
	let body: T | undefined;
	try {
		body = JSON.parse(text) as T;
	} catch {
		body = undefined;
	}
	return { status: res.status, headers: res.headers, body };
}
