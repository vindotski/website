import { NextResponse } from "next/server";
import { currentUser } from "@/features/auth/utils/current-user";

// The admin toolbar's account email. The browser can't read Spotcraft's
// token, so it asks here. Guests never get here (the proxy 404s it)
//
//   GET /api/me   { email } or { email: null }
export async function GET() {
  const user = await currentUser();
  return NextResponse.json(
    { email: user?.email ?? null },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
