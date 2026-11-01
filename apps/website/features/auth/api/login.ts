import { useMutation } from "@tanstack/react-query";
import type { MutationConfig } from "@/lib/react-query";
import { createClient } from "@/lib/supabase/client";

export type LoginInput = {
  email: string;
  password: string;
  // From Turnstile; Supabase Auth checks it before the password
  captchaToken?: string;
};

// Throws Supabase's AuthError, whose `code` says why (captcha_failed, …)
export async function login({ email, password, captchaToken }: LoginInput) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
    options: { captchaToken },
  });
  if (error) throw error;
  return data;
}

type UseLoginOptions = {
  mutationConfig?: MutationConfig<typeof login>;
};

export function useLogin({ mutationConfig }: UseLoginOptions = {}) {
  return useMutation({
    ...mutationConfig,
    mutationFn: login,
  });
}
