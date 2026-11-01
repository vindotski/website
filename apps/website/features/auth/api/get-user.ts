import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { QueryConfig } from "@/lib/react-query";

// The signed-in user's email, as the proxy checked it (/api/me). Null without
// a session
export async function getUser() {
  const { email } = await api.get<{ email: string | null }>("/api/me");
  return email ? { email } : null;
}

export function getUserQueryOptions() {
  return queryOptions({
    queryKey: ["user"],
    queryFn: getUser,
  });
}

type UseUserOptions = {
  queryConfig?: QueryConfig<typeof getUserQueryOptions>;
};

export function useUser({ queryConfig }: UseUserOptions = {}) {
  return useQuery({
    ...getUserQueryOptions(),
    ...queryConfig,
  });
}
