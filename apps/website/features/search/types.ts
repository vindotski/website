// One search result, as the API returns it and the dialog shows it
export type SearchResult = {
  url: string;
  title: string;
  // Null for an item's summary, which links to the page itself
  heading: string | null;
  // The content type's label: Projects, Blog
  type: string;
  snippet: string;
  // Spotcraft's 0–1 score: comparable within one search only
  score: number;
};
