"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

// A Supabase session cookie: sb-<ref>-auth-token, split into .0, .1… when
// large. Readable here, since @supabase/ssr cookies aren't httpOnly
const sessionCookie = /(?:^|;\s*)sb-[^=]+-auth-token(?:\.\d+)?=/;

// Sign-ups are off, so a session means it's me: my own visits stay out of the
// data. Before launch that also keeps "/" meaning the teaser, since only a
// session sees the real home there. Login pages are never counted
function keep<T extends { url: string }>(event: T): T | null {
  if (sessionCookie.test(document.cookie)) return null;
  if (new URL(event.url).pathname.startsWith("/auth")) return null;
  return event;
}

// Vercel Web Analytics and Speed Insights: cookieless, so no consent banner.
// Both report only from Vercel deployments. A client component, since
// beforeSend is a function
export default function VercelInsights() {
  return (
    <>
      <Analytics beforeSend={(event: BeforeSendEvent) => keep(event)} />
      <SpeedInsights beforeSend={keep} />
    </>
  );
}
