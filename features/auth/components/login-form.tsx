"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

const loginInputSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

// Back to where the guard sent them from. Same-origin only, so a crafted link
// can't send someone to another site after they log in. Read on submit rather
// than with useSearchParams, so the form needs no Suspense and prerenders
function getRedirectPath() {
  const redirectTo = new URLSearchParams(window.location.search).get(
    "redirectTo",
  );
  if (!redirectTo) return "/";
  const url = new URL(redirectTo, window.location.origin);
  if (url.origin !== window.location.origin) return "/";
  return url.pathname + url.search + url.hash;
}

export function LoginForm() {
  const router = useRouter();
  const [authError, setAuthError] = useState<string>();

  return (
    <Form
      schema={loginInputSchema}
      onSubmit={async (values) => {
        setAuthError(undefined);
        const supabase = createClient();
        const { error } = await supabase.auth.signInWithPassword(values);
        if (error) {
          setAuthError(error.message);
          return;
        }
        router.replace(getRedirectPath());
      }}
    >
      {({ register, formState: { errors, isSubmitting } }) => (
        <FieldGroup>
          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor="email">Email address</FieldLabel>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
            <FieldError errors={[errors.email]} />
          </Field>
          <Field data-invalid={!!errors.password}>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              {...register("password")}
            />
            <FieldError errors={[errors.password]} />
          </Field>
          <Field>
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Logging in…" : "Log in"}
            </Button>
            <FieldError>{authError}</FieldError>
          </Field>
        </FieldGroup>
      )}
    </Form>
  );
}
