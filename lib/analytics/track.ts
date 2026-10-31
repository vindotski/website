// Marks an element for Vercel Analytics: a click on it sends `event` with the
// other fields as properties (AnalyticsEvents adds page and path). Plain data
// attributes, so server components can use it. Plus allows 8 properties per
// event; never put personal data in them
export type Track = { event: string } & Record<string, string>;

function attributes(name: string, track?: Track): Record<string, string> {
  if (!track) return {};
  const { event, ...properties } = track;
  return {
    [name]: event,
    ...Object.fromEntries(
      Object.entries(properties).map(([key, value]) => [
        `data-track-${key}`,
        value,
      ]),
    ),
  };
}

// Sent when the element is clicked
export function trackAttributes(track?: Track): Record<string, string> {
  return attributes("data-track", track);
}

// Sent once per page load, when the element is seen: half of it visible, or
// filling half the screen
export function trackViewAttributes(track?: Track): Record<string, string> {
  return attributes("data-track-view", track);
}

// The part of the site a path belongs to; the teaser marks itself instead
export function pageFromPath(pathname: string) {
  return pathname.split("/")[1] || "home";
}
