"use client";

import { track } from "@vercel/analytics";
import { useEffect } from "react";

// Which part of the site an event came from: a [data-track-page] around it
// (the teaser), or the path
function pageOf(element: Element) {
  const marked = element.closest<HTMLElement>("[data-track-page]");
  if (marked?.dataset.trackPage) return marked.dataset.trackPage;
  const section = window.location.pathname.split("/")[1];
  return section || "home";
}

// data-track-method="…" → { method: "…" }
function propertiesOf(element: HTMLElement) {
  const properties: Record<string, string> = {};
  for (const [key, value] of Object.entries(element.dataset)) {
    if (!key.startsWith("track") || key === "track" || key === "trackPage") {
      continue;
    }
    const name = key.slice("track".length);
    if (value) properties[name[0].toLowerCase() + name.slice(1)] = value;
  }
  return properties;
}

// One listener for the whole page: a click on anything marked with
// trackAttributes() sends its event, with page and path added. Capture phase,
// so it still fires when a link handles the click itself, like ScrollLink
// scrolling instead of navigating
export default function AnalyticsEvents() {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = (event.target as Element | null)?.closest<HTMLElement>(
        "[data-track]",
      );
      const name = target?.dataset.track;
      if (!target || !name) return;
      track(name, {
        ...propertiesOf(target),
        page: pageOf(target),
        path: window.location.pathname,
      });
    }
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}
