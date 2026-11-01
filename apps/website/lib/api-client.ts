// Fetch for this site's own API routes. Throws ApiError on a non-2xx answer,
// so a query lands in its error state and callers can read the status

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type RequestOptions = {
  // Repeated keys take an array: { type: ["posts", "projects"] }
  params?: Record<string, string | number | string[] | undefined>;
  signal?: AbortSignal;
};

function toSearchParams(params: RequestOptions["params"] = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    for (const item of Array.isArray(value) ? value : [value]) {
      search.append(key, String(item));
    }
  }
  return search;
}

async function request<T>(method: string, url: string, options: RequestOptions) {
  const search = toSearchParams(options.params).toString();
  const response = await fetch(search ? `${url}?${search}` : url, {
    method,
    headers: { Accept: "application/json" },
    signal: options.signal,
  });
  if (!response.ok) {
    // The routes answer { error } on failure
    const body = await response.json().catch(() => null);
    throw new ApiError(
      response.status,
      body?.error ?? `${method} ${url} answered ${response.status}`,
    );
  }
  return (await response.json()) as T;
}

export const api = {
  get: <T>(url: string, options: RequestOptions = {}) =>
    request<T>("GET", url, options),
};
