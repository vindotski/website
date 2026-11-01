import "server-only";
import { createClient } from "@spotcraft/client";

// Spotcraft, where the content lives. The token unlocks drafts and lifts the
// search rate limit, so it must never leave the server: no NEXT_PUBLIC_
// prefix, and `server-only` fails the build if a Client Component imports
// this. SPOTCRAFT_URL includes the site (…/vinski)
export const cms = createClient({
  url: process.env.SPOTCRAFT_URL!,
  token: process.env.SPOTCRAFT_API_TOKEN,
});
