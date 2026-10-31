import { GoogleAnalytics } from "@next/third-parties/google";
import { isProduction } from "@/lib/site";
import { CONSENT_KEY } from "@/lib/analytics";
import AnalyticsEvents from "./AnalyticsEvents";
import ConsentBanner from "./ConsentBanner";

// Google Analytics 4, on the live site only, with Consent Mode v2: nothing
// is stored until a visitor accepts in the banner, and only analytics is
// ever granted, never ads

const gaId = process.env.NEXT_PUBLIC_GA_ID;

export const analyticsEnabled = isProduction && Boolean(gaId);

// Runs first, as an inline script in the root layout's <head>: every consent
// signal starts denied, then a choice from an earlier visit is applied, so a
// returning visitor is counted from the first page view
export const consentScript = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent', 'default', {
  analytics_storage: 'denied',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied'
});
try {
  if (localStorage.getItem('${CONSENT_KEY}') === 'granted') {
    gtag('consent', 'update', { analytics_storage: 'granted' });
  }
} catch (e) {}
`;

// gtag.js, the consent banner and the contact click events, inside <body>
export default function Analytics() {
  if (!analyticsEnabled || !gaId) return null;
  return (
    <>
      <GoogleAnalytics gaId={gaId} />
      <ConsentBanner />
      <AnalyticsEvents />
    </>
  );
}
