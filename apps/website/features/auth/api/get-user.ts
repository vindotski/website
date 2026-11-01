import { queryOptions, useQuery } from "@tanstack/react-query";
import type { QueryConfig } from "@/lib/react-query";
import { createClient } from "@/lib/supabase/client";

// The signed-in user's email, from the verified session token. Null without
// a session
export async function getUser() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error) throw error;
  return data ? { email: data.claims.email ?? null } : null;
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
