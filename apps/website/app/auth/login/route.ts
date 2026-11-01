import { loginUrl } from "@spotcraft/client";
import { NextResponse, type NextRequest } from "next/server";

// Signing in happens on Spotcraft (with Turnstile), which sends you back to
// the homepage. Spotcraft only sends you back to a site's own address, so this
// origin must be it: https://www.vin.ski, or http://localhost:3001 locally
export function GET(request: NextRequest) {
  const home = new URL("/", request.url).href;
  return NextResponse.redirect(
    loginUrl(home, { url: process.env.SPOTCRAFT_URL! }),
  );
}
