import { useMutation } from "@tanstack/react-query";
import type { MutationConfig } from "@/lib/react-query";
import { createClient } from "@/lib/supabase/client";

// Ends the session here and on Supabase, and clears the session cookie
export async function logout() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

type UseLogoutOptions = {
  mutationConfig?: MutationConfig<typeof logout>;
};

export function useLogout({ mutationConfig }: UseLogoutOptions = {}) {
  return useMutation({
    ...mutationConfig,
    mutationFn: logout,
  });
}
