// Query keys shared across components. Everything the dashboard reads about the site's content
// (and its settings) lives under CONTENT_KEY, so one invalidation after a write refreshes it all.
export const CONTENT_KEY = ["content"] as const;
