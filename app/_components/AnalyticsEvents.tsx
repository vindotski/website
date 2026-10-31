"use client";

import { track } from "@vercel/analytics";
import { useEffect } from "react";

// One listener for the whole page: a click on anything marked
// data-analytics-event (ButtonLink's `event`) sends a contact_click with that
// method. Capture phase, so it still fires when a link handles the click
// itself, like ScrollLink scrolling instead of navigating. No personal data:
// only which button
export default function AnalyticsEvents() {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = (event.target as Element | null)?.closest<HTMLElement>(
        "[data-analytics-event]",
      );
      const method = target?.dataset.analyticsEvent;
      if (method) track("contact_click", { method });
    }
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}
