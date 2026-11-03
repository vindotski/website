import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

// Vercel Web Analytics and Speed Insights: cookieless, so no consent banner.
// Both report only from Vercel deployments
export default function VercelInsights() {
  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
