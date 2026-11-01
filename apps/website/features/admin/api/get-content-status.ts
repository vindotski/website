import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { QueryConfig } from "@/lib/react-query";
import type { ContentStatus } from "../types";

// The admin toolbar's side: calls /api/admin/content-status for the page
// being shown

export async function getContentStatus({
  pathname,
  signal,
}: {
  pathname: string;
  signal?: AbortSignal;
}): Promise<ContentStatus> {
  const data = await api.get<{ item: ContentStatus }>(
    "/api/admin/content-status",
    { params: { pathname }, signal },
  );
  return data.item;
}

export function getContentStatusQueryOptions(pathname: string) {
  return queryOptions({
    queryKey: ["content-status", pathname],
    queryFn: ({ signal }) => getContentStatus({ pathname, signal }),
  });
}

type UseContentStatusOptions = {
  pathname: string;
  queryConfig?: QueryConfig<typeof getContentStatusQueryOptions>;
};

export function useContentStatus({
  pathname,
  queryConfig,
}: UseContentStatusOptions) {
  return useQuery({
    ...getContentStatusQueryOptions(pathname),
    ...queryConfig,
  });
}
