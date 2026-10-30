import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// For Route Handlers that read the search index. Uses the secret key, which
// bypasses RLS and reaches tables no visitor can, so it must never leave the
// server: no NEXT_PUBLIC_ prefix, and `server-only` fails the build if a
// Client Component imports this. There's no user session to keep, so one
// per request is cheap
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
