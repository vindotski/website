// The content item behind a page: its Spotcraft path and date (null for a
// draft). null when the page shows no project or post
export type ContentStatus = { path: string; date: string | null } | null;
