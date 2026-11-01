"use client";

import { logoutUrl } from "@spotcraft/client";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

// Spotcraft signs out everywhere (the dashboard too), then sends a full load
// of /, where a guest gets the teaser. A full load, not router.refresh(): that
// clears the client cache only for the current route, so prefetched pages
// rendered for the session would still open. SPOTCRAFT_URL is inlined by
// next.config.ts
export default function LogoutButton(
  props: Omit<React.ComponentProps<typeof Button>, "onClick">,
) {
  return (
    <Button
      {...props}
      onClick={() =>
        window.location.assign(
          logoutUrl(new URL("/", window.location.href).href, {
            url: process.env.SPOTCRAFT_URL!,
          }),
        )
      }
    >
      <LogOut data-icon="inline-start" />
      Log out
    </Button>
  );
}
