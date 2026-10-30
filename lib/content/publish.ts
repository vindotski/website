// Whether an item is public. No date = draft, a date after today = scheduled.
// The one rule for listings, pages, the sitemap, feeds and the search index.
// Kept free of Next.js imports so scripts can use it too

// ISO dates sort correctly as strings
export function isPublished(date: string | undefined, today: string) {
  return date !== undefined && date <= today;
}

// "2026-10-30". UTC, like current_date in the database, so pages and search
// agree on when a scheduled item goes live. Reads the clock, so under Cache
// Components call it only inside a cached function
export function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

// `next dev` shows drafts and scheduled items too; builds never do
export const showDrafts = process.env.NODE_ENV === "development";
