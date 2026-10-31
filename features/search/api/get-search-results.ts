import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { QueryConfig } from "@/lib/react-query";
import type { SearchResult } from "../types";

// The browser's side of search: calls /api/search, which runs searchContent
// in ./search.ts on the server

export async function getSearchResults({
  query,
  limit,
  signal,
}: {
  query: string;
  limit: number;
  signal?: AbortSignal;
}): Promise<SearchResult[]> {
  const data = await api.get<{ results: SearchResult[] }>("/api/search", {
    params: { q: query, limit },
    signal,
  });
  return data.results;
}

// Keyed case-insensitively, so "Pixi" reuses the results for "pixi". Never
// stale: each search embeds the query on the server, and the index only
// changes on deploy. The signal cancels a search a newer query replaced
export function getSearchResultsQueryOptions({
  query,
  limit,
}: {
  query: string;
  limit: number;
}) {
  return queryOptions({
    queryKey: ["search", { query: query.toLowerCase(), limit }],
    queryFn: ({ signal }) => getSearchResults({ query, limit, signal }),
    staleTime: Infinity,
  });
}

type UseSearchResultsOptions = {
  query: string;
  limit: number;
  queryConfig?: QueryConfig<typeof getSearchResultsQueryOptions>;
};

export function useSearchResults({
  query,
  limit,
  queryConfig,
}: UseSearchResultsOptions) {
  return useQuery({
    ...getSearchResultsQueryOptions({ query, limit }),
    ...queryConfig,
  });
}
