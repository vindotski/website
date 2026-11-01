"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLogout } from "../api/logout";

// A full load of /, where a guest gets the teaser. Not router.refresh(): it
// clears the client cache only for the current route, so prefetched pages
// rendered for the session would still open
export default function LogoutButton(
  props: Omit<React.ComponentProps<typeof Button>, "onClick">,
) {
  const logout = useLogout({
    mutationConfig: {
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- see above
      onSuccess: () => window.location.assign("/"),
    },
  });

  return (
    <Button
      {...props}
      onClick={() => logout.mutate()}
      disabled={logout.isPending}
    >
      <LogOut data-icon="inline-start" />
      {logout.isPending ? "Logging out…" : "Log out"}
    </Button>
  );
}
