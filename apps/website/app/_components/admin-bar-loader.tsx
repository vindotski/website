"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { hasSessionCookie } from "@/lib/signed-in-cookie";

// Loaded only with a session, so guests never download it
const AdminBar = dynamic(() => import("./admin-bar"), { ssr: false });

const subscribe = () => () => {};

// The admin toolbar for signed-in visitors. The script in the root layout
// marks <html> before the first paint; this checks again after client
// navigations, such as the one that follows logging in
export default function AdminBarLoader() {
  const pathname = usePathname();
  // Read on every render, and the path changing renders this again
  const signedIn = useSyncExternalStore(subscribe, hasSessionCookie, () => false);

  // From the cookie, not `signedIn`: hydration renders once with the server
  // snapshot, false, and that commit mustn't take the room away
  useEffect(() => {
    document.documentElement.toggleAttribute("data-signed-in", hasSessionCookie());
  }, [pathname]);

  return signedIn ? <AdminBar pathname={pathname} /> : null;
}
