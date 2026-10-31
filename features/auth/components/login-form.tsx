"use client";

import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
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

// Cloudflare Turnstile, checked by Supabase Auth before the password. Without
// a site key the form signs in as before; Supabase only asks for a token once
// CAPTCHA is turned on there, after the key is live
const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function LoginForm() {
  const router = useRouter();
  const [authError, setAuthError] = useState<string>();
  const [captchaToken, setCaptchaToken] = useState<string>();
  const turnstile = useRef<TurnstileInstance>(undefined);
  const waitingForCaptcha = Boolean(turnstileSiteKey) && !captchaToken;

  return (
    <Form
      schema={loginInputSchema}
      onSubmit={async (values) => {
        setAuthError(undefined);
        const supabase = createClient();
        const { error } = await supabase.auth.signInWithPassword({
          ...values,
          options: { captchaToken },
        });
        // Tokens work once, so every attempt needs a fresh one
        if (turnstileSiteKey) {
          setCaptchaToken(undefined);
          turnstile.current?.reset();
        }
        if (error) {
          setAuthError(
            error.code === "captcha_failed"
              ? "The human check didn't pass. Try again."
              : error.message,
          );
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
          {turnstileSiteKey && (
            <Field>
              {/* Usually invisible; shows a checkbox when Cloudflare is
                  unsure. Flexible, so it fills the narrow column */}
              <Turnstile
                ref={turnstile}
                siteKey={turnstileSiteKey}
                options={{ size: "flexible" }}
                onSuccess={setCaptchaToken}
                onExpire={() => setCaptchaToken(undefined)}
                onError={() => {
                  setCaptchaToken(undefined);
                  setAuthError("The human check failed. Reload and try again.");
                }}
              />
            </Field>
          )}
          <Field>
            <Button
              type="submit"
              disabled={isSubmitting || waitingForCaptcha}
              className="w-full"
            >
              {isSubmitting
                ? "Logging in…"
                : waitingForCaptcha
                  ? "Checking you're human…"
                  : "Log in"}
            </Button>
            <FieldError>{authError}</FieldError>
          </Field>
        </FieldGroup>
      )}
    </Form>
  );
}
