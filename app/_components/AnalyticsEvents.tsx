"use client";

import { track } from "@vercel/analytics";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { pageFromPath } from "@/lib/track";

// Which part of the site an event came from: a [data-track-page] around it
// (the teaser, which shares "/" with the home page), or the path
function pageOf(element: Element) {
  const marked = element.closest<HTMLElement>("[data-track-page]");
  return marked?.dataset.trackPage || pageFromPath(window.location.pathname);
}

const reserved = new Set(["track", "trackView", "trackPage"]);

// data-track-method="…" → { method: "…" }
function propertiesOf(element: HTMLElement) {
  const properties: Record<string, string> = {};
  for (const [key, value] of Object.entries(element.dataset)) {
    if (!key.startsWith("track") || reserved.has(key) || !value) continue;
    const name = key.slice("track".length);
    properties[name[0].toLowerCase() + name.slice(1)] = value;
  }
  return properties;
}

function send(name: string, element: HTMLElement) {
  track(name, {
    ...propertiesOf(element),
    page: pageOf(element),
    path: window.location.pathname,
  });
}

// Sends the events marked with lib/track.ts: clicks on [data-track], and
// views of [data-track-view], each once per page load
export default function AnalyticsEvents() {
  const pathname = usePathname();

  // Capture phase, so it still fires when a link handles the click itself,
  // like ScrollLink scrolling instead of navigating
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = (event.target as Element | null)?.closest<HTMLElement>(
        "[data-track]",
      );
      if (target?.dataset.track) send(target.dataset.track, target);
    }
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  // Seen: half of it visible, or filling half the screen, since a section can
  // be taller than the screen. Rescanned on every page
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const element = entry.target as HTMLElement;
          const fillsHalf =
            entry.intersectionRect.height >= window.innerHeight / 2;
          if (!entry.isIntersecting) continue;
          if (entry.intersectionRatio < 0.5 && !fillsHalf) continue;
          observer.unobserve(element);
          if (element.dataset.trackView) send(element.dataset.trackView, element);
        }
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    document
      .querySelectorAll("[data-track-view]")
      .forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
